package expo.modules.pauseloopnative

import android.content.Context
import android.os.SystemClock

object SessionSnapshotProvider {
  fun snapshot(context: Context): Map<String, Any?> {
    val settings = MonitoringPreferences.settings(context)
    val nowElapsed = SystemClock.elapsedRealtime()
    val nowWall = System.currentTimeMillis()
    val state = MonitoringService.snapshotState(context)
    val debugThresholdSeconds = MonitoringPreferences.debugThresholdSeconds(context)
    val thresholdMs = if (debugThresholdSeconds > 0) {
      debugThresholdSeconds * 1_000L
    } else {
      settings.reminderIntervalMinutes * 60_000L
    }
    val cooldownRemaining = state.cooldownRemaining(nowWall)
    val snoozeRemaining = state.snoozeUntilElapsed
      ?.let { (it - nowElapsed).coerceAtLeast(0L) }
      ?: 0L

    return mapOf(
      "monitoringEnabled" to MonitoringPreferences.isMonitoringEnabled(context),
      "serviceRunning" to MonitoringService.isRunning,
      "activeSessionMs" to state.liveAccumulatedMs(nowElapsed),
      "thresholdMs" to thresholdMs,
      "reminderIntervalMinutes" to settings.reminderIntervalMinutes,
      "debugThresholdSeconds" to debugThresholdSeconds,
      "selectedAppCount" to settings.targetPackages.size,
      "snoozesRemaining" to state.snoozesRemaining(2),
      "snoozeRemainingMs" to snoozeRemaining,
      "cooldownRemainingMs" to cooldownRemaining,
      "overlayMode" to state.overlayMode?.name?.lowercase(),
      "foregroundPackage" to if (MonitoringService.isRunning) {
        MonitoringService.lastForegroundPackage
      } else {
        null
      },
      "lastPackage" to state.lastPackage,
    )
  }
}
