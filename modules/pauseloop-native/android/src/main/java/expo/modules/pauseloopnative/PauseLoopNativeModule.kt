package expo.modules.pauseloopnative

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PauseLoopNativeModule : Module() {
  private val context
    get() = appContext.reactContext
      ?: appContext.currentActivity?.applicationContext
      ?: throw IllegalStateException("PauseLoop native context is unavailable")

  override fun definition() = ModuleDefinition {
    Name("PauseLoopNative")
    Events("onOverlayAction", "onMonitoringStateChanged")

    OnCreate {
      PauseLoopEventBus.overlayActionListener = { action, packageName ->
        sendEvent(
          "onOverlayAction",
          mapOf(
            "action" to action,
            "packageName" to packageName
          )
        )
      }
      PauseLoopEventBus.monitoringStateListener = { running ->
        sendEvent("onMonitoringStateChanged", mapOf("running" to running))
      }
    }

    OnDestroy {
      PauseLoopEventBus.overlayActionListener = null
      PauseLoopEventBus.monitoringStateListener = null
    }

    AsyncFunction("getPermissionStatus") {
      PermissionHelper.status(context)
    }

    AsyncFunction("openUsageAccessSettings") {
      PermissionHelper.openUsageAccess(context)
    }

    AsyncFunction("openOverlaySettings") {
      PermissionHelper.openOverlaySettings(context)
    }

    AsyncFunction("requestNotificationPermission") {
      PermissionHelper.requestNotifications(appContext)
    }

    AsyncFunction("openBatteryOptimizationSettings") {
      PermissionHelper.openBatteryOptimizationSettings(context)
    }

    AsyncFunction("getInstalledApps") {
      InstalledAppsRepository.list(context)
    }

    AsyncFunction("getAppIcon") { packageName: String ->
      require(packageName.isNotBlank() && packageName.length <= 255) {
        "A valid package name is required"
      }
      InstalledAppsRepository.iconDataUri(context, packageName)
    }

    AsyncFunction("startMonitoring") {
      if (!PermissionHelper.hasUsageAccess(context)) {
        throw IllegalStateException("Usage Access is required before monitoring can start")
      }
      if (!PermissionHelper.canDrawOverlays(context)) {
        throw IllegalStateException("Display over other apps is required before monitoring can start")
      }
      MonitoringService.start(context)
    }

    AsyncFunction("stopMonitoring") {
      MonitoringService.stop(context)
    }

    AsyncFunction("isMonitoring") {
      MonitoringService.isRunning
    }

    AsyncFunction("getSettings") {
      MonitoringPreferences.settingsMap(context)
    }

    AsyncFunction("setTargetPackages") { packages: List<String> ->
      MonitoringPreferences.setTargetPackages(context, packages).toMap()
    }

    AsyncFunction("setReminderIntervalMinutes") { minutes: Int ->
      MonitoringPreferences.setReminderIntervalMinutes(context, minutes).toMap()
    }

    AsyncFunction("setSuggestionsEnabled") { enabled: Boolean ->
      MonitoringPreferences.setSuggestionsEnabled(context, enabled).toMap()
    }

    AsyncFunction("setInsightsEnabled") { enabled: Boolean ->
      MonitoringPreferences.setInsightsEnabled(context, enabled).toMap()
    }

    AsyncFunction("setOnboardingComplete") { complete: Boolean ->
      MonitoringPreferences.setOnboardingComplete(context, complete).toMap()
    }

    AsyncFunction("getHistoryStatus") {
      LocalUsageStore.historyStatus(context)
    }

    AsyncFunction("clearHistory") {
      LocalUsageStore.clear(context)
    }

    AsyncFunction("getSessionState") {
      SessionSnapshotProvider.snapshot(context)
    }

    AsyncFunction("showTestOverlay") { delayMs: Int? ->
      MonitoringService.requestTestOverlay(
        context,
        (delayMs ?: 3_000).coerceIn(0, 10_000)
      )
    }

    AsyncFunction("hideOverlay") {
      MonitoringService.hideOverlay()
    }

    AsyncFunction("getDebugState") {
      DebugStateProvider.snapshot(context)
    }

    AsyncFunction("getRecentUsageEvents") { packageName: String, limit: Int ->
      require(packageName.isNotBlank() && packageName.length <= 255) {
        "A valid package name is required"
      }
      UsageEventReader.recent(
        context,
        packageName,
        limit.coerceIn(1, 100)
      )
    }
  }
}
