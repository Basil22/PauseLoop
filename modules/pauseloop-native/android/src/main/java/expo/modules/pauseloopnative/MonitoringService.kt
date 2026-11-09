package expo.modules.pauseloopnative

import android.app.KeyguardManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import androidx.core.content.ContextCompat

class MonitoringService : Service() {
  companion object {
    const val ACTION_START = "expo.modules.pauseloopnative.action.START"
    const val ACTION_STOP = "expo.modules.pauseloopnative.action.STOP"
    const val ACTION_TEST_OVERLAY = "expo.modules.pauseloopnative.action.TEST_OVERLAY"
    const val ACTION_HIDE_OVERLAY = "expo.modules.pauseloopnative.action.HIDE_OVERLAY"
    const val EXTRA_DELAY_MS = "delayMs"

    private const val POLL_INTERVAL_MS = 2_000L
    private const val DEFAULT_TEST_DELAY_MS = 3_000
    private const val PERSIST_INTERVAL_MS = 10_000L

    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile
    var isRunning: Boolean = false
      private set

    @Volatile
    var lastForegroundPackage: String? = null
      private set

    @Volatile
    var lastForegroundClass: String? = null
      private set

    @Volatile
    var lastPollAt: Long = 0L
      private set

    @Volatile
    private var engine: SessionEngine? = null

    @Volatile
    private var activeOverlayPackage: String? = null

    /**
     * Returns the live engine state while the service runs, or the last
     * persisted snapshot when it is stopped. It never restores a window, since
     * overlay visibility cannot survive process death.
     */
    fun snapshotState(context: Context): SessionState {
      return engine?.state
        ?: MonitoringPreferences.sessionState(context)
        ?: SessionState()
    }

    fun start(context: Context) {
      MonitoringPreferences.setMonitoringEnabled(context, true)
      try {
        ContextCompat.startForegroundService(
          context,
          Intent(context, MonitoringService::class.java).setAction(ACTION_START)
        )
      } catch (exception: Exception) {
        MonitoringPreferences.setMonitoringEnabled(context, false)
        throw exception
      }
    }

    fun stop(context: Context) {
      MonitoringPreferences.setMonitoringEnabled(context, false)
      MonitoringPreferences.clearSessionState(context)
      OverlayController.hide()
      engine = null
      activeOverlayPackage = null
      lastForegroundPackage = null
      lastForegroundClass = null
      lastPollAt = 0L
      context.stopService(Intent(context, MonitoringService::class.java))
      if (!isRunning) {
        PauseLoopEventBus.emitMonitoringState(false)
      }
    }

    fun requestTestOverlay(context: Context, delayMs: Int) {
      if (!isRunning) {
        throw IllegalStateException("Start monitoring before showing a test reminder")
      }
      ContextCompat.startForegroundService(
        context,
        Intent(context, MonitoringService::class.java)
          .setAction(ACTION_TEST_OVERLAY)
          .putExtra(EXTRA_DELAY_MS, delayMs.coerceIn(0, 10_000))
      )
    }

    fun hideOverlay() {
      OverlayController.hide()
      activeOverlayPackage = null
      mainHandler.post {
        engine?.let { current ->
          current.onOverlayDismissed(SystemClock.elapsedRealtime())
        }
      }
    }
  }

  private var firstPoll = true
  private var overlayAnchorPackage: String? = null
  private var receiverRegistered = false
  private var pendingTestOverlay: Runnable? = null
  private var lastPersistedElapsed = -PERSIST_INTERVAL_MS

  private val pollRunnable = object : Runnable {
    override fun run() {
      pollOnce()
      mainHandler.postDelayed(this, POLL_INTERVAL_MS)
    }
  }

  private val screenReceiver = object : BroadcastReceiver() {
    override fun onReceive(receiverContext: Context?, intent: Intent?) {
      when (intent?.action) {
        Intent.ACTION_SCREEN_OFF -> {
          dismissAnyOverlay(emitDismiss = true)
        }
        Intent.ACTION_SCREEN_ON, Intent.ACTION_USER_PRESENT -> {
          mainHandler.post { pollOnce() }
        }
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    NotificationHelper.createChannels(this)
    if (!ensureForeground()) {
      return
    }
    registerScreenReceiver()
    isRunning = true
    ensureEngine()
    PauseLoopEventBus.emitMonitoringState(true)
    mainHandler.post(pollRunnable)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        MonitoringPreferences.setMonitoringEnabled(this, false)
        MonitoringPreferences.clearSessionState(this)
        OverlayController.hide()
        engine = null
        activeOverlayPackage = null
        stopSelf()
        return START_NOT_STICKY
      }
      ACTION_HIDE_OVERLAY -> {
        hideOverlay()
      }
      ACTION_TEST_OVERLAY -> {
        val delay = intent.getIntExtra(EXTRA_DELAY_MS, DEFAULT_TEST_DELAY_MS)
        scheduleTestOverlay(delay.coerceIn(0, 10_000))
      }
      else -> {
        if (!MonitoringPreferences.isMonitoringEnabled(this)) {
          stopSelf()
          return START_NOT_STICKY
        }
      }
    }

    if (!ensureForeground()) {
      return START_NOT_STICKY
    }
    return START_STICKY
  }

  override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
    super.onConfigurationChanged(newConfig)
    OverlayController.onConfigurationChanged()
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    // stopWithTask="false" is the first defense. Do not schedule exact-alarm
    // restarts; Android 12+ restricts background foreground-service starts.
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    isRunning = false
    lastPollAt = 0L
    mainHandler.removeCallbacksAndMessages(null)
    pendingTestOverlay = null
    unregisterScreenReceiver()

    val current = engine
    if (current != null) {
      if (MonitoringPreferences.isMonitoringEnabled(this)) {
        MonitoringPreferences.saveSessionState(this, current.state)
      } else {
        MonitoringPreferences.clearSessionState(this)
      }
    }
    engine = null
    activeOverlayPackage = null
    OverlayController.hide()
    PauseLoopEventBus.emitMonitoringState(false)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun ensureForeground(): Boolean {
    val notification = NotificationHelper.monitoringNotification(this)
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(
          NotificationHelper.NOTIFICATION_MONITORING,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        )
      } else {
        startForeground(NotificationHelper.NOTIFICATION_MONITORING, notification)
      }
      true
    } catch (_: Exception) {
      stopSelf()
      false
    }
  }

  private fun registerScreenReceiver() {
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_OFF)
      addAction(Intent.ACTION_SCREEN_ON)
      addAction(Intent.ACTION_USER_PRESENT)
    }
    ContextCompat.registerReceiver(
      this,
      screenReceiver,
      filter,
      ContextCompat.RECEIVER_NOT_EXPORTED
    )
    receiverRegistered = true
  }

  private fun unregisterScreenReceiver() {
    if (!receiverRegistered) return
    try {
      unregisterReceiver(screenReceiver)
    } catch (_: Exception) {
      // Receiver was already unregistered by the system.
    }
    receiverRegistered = false
  }

  private fun ensureEngine(): SessionEngine {
    engine?.let { return it }
    val nowElapsed = SystemClock.elapsedRealtime()
    val created = SessionEngine(rulesFor(MonitoringPreferences.settings(this)))
    MonitoringPreferences.sessionState(this)?.let { saved ->
      created.restore(saved, nowElapsed, System.currentTimeMillis())
    }
    engine = created
    return created
  }

  private fun rulesFor(settings: MonitoringSettings): SessionRules {
    val debugThresholdSeconds = MonitoringPreferences.debugThresholdSeconds(this)
    val thresholdMs = if (debugThresholdSeconds > 0) {
      debugThresholdSeconds * 1_000L
    } else {
      settings.reminderIntervalMinutes * 60_000L
    }
    return SessionRules(thresholdMs = thresholdMs)
  }

  private fun pollOnce() {
    if (!isRunning) return

    if (!MonitoringPreferences.isMonitoringEnabled(this)) {
      stopSelf()
      return
    }

    if (!PermissionHelper.hasUsageAccess(this) || !PermissionHelper.canDrawOverlays(this)) {
      stopForLostPermissions()
      return
    }

    val current = ensureEngine()
    val settings = MonitoringPreferences.settings(this)
    syncRules(current, settings)

    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    val interactive = powerManager.isInteractive
    val locked = keyguardManager.isKeyguardLocked

    val window = if (firstPoll) 60_000L else 10_000L
    val detected = if (interactive && !locked) {
      ForegroundAppDetector.current(
        this,
        window,
        ForegroundApp(lastForegroundPackage, lastForegroundClass)
      )
    } else {
      ForegroundApp(lastForegroundPackage, lastForegroundClass)
    }
    firstPoll = false

    if (detected.packageName != null) {
      lastForegroundPackage = detected.packageName
      lastForegroundClass = detected.className
      lastPollAt = System.currentTimeMillis()
    }

    val nowElapsed = SystemClock.elapsedRealtime()
    val nowWall = System.currentTimeMillis()
    val update = current.poll(
      nowElapsed = nowElapsed,
      nowWall = nowWall,
      foregroundPackage = detected.packageName ?: lastForegroundPackage,
      selectedPackages = settings.targetPackages.toSet(),
      screenInteractive = interactive,
      locked = locked,
    )

    applyEffects(
      current,
      update.effects,
      nowElapsed,
      nowWall,
      emitDismissEffects = true,
    )
    val importantEffect = update.effects.any { effect ->
      effect is SessionEffect.ShowReminder ||
        effect is SessionEffect.ShowCooldown ||
        effect is SessionEffect.HideOverlay ||
        effect is SessionEffect.RecordCooldown
    }
    persist(current, force = importantEffect)
  }

  /**
   * Applies an interval or debug-threshold change immediately. The engine's
   * updateRules starts a genuinely fresh session, which is what the settings
   * screen promises when the interval changes while monitoring is on.
   */
  private fun syncRules(current: SessionEngine, settings: MonitoringSettings) {
    val desired = rulesFor(settings)
    if (desired == current.rules) return

    val hadOverlay = current.state.overlayMode != null
    current.updateRules(desired, SystemClock.elapsedRealtime())
    if (hadOverlay) {
      hideEngineOverlay(emitDismiss = true)
    }
    persist(current, force = true)
  }

  private fun applyEffects(
    current: SessionEngine,
    effects: List<SessionEffect>,
    nowElapsed: Long,
    nowWall: Long,
    emitDismissEffects: Boolean,
  ) {
    for (effect in effects) {
      when (effect) {
        is SessionEffect.ShowReminder -> {
          showReminder(current, effect, nowElapsed)
        }
        is SessionEffect.ShowCooldown -> {
          showCooldown(current, effect, nowElapsed)
        }
        is SessionEffect.UpdateCooldown -> {
          if (!OverlayController.updateCooldown(effect.remainingMs)) {
            showCooldown(
              current,
              SessionEffect.ShowCooldown(current.state.lastPackage, effect.remainingMs),
              nowElapsed,
            )
          }
        }
        SessionEffect.HideOverlay -> {
          hideEngineOverlay(emitDismissEffects)
        }
        is SessionEffect.RecordUsage -> {
          LocalUsageStore.recordUsage(
            this,
            effect.packageName,
            effect.deltaMs,
            effect.sessionStart,
          )
        }
        is SessionEffect.RecordCooldown -> {
          LocalUsageStore.recordCooldown(this, effect.packageName)
        }
      }
    }
  }

  private fun showReminder(
    current: SessionEngine,
    effect: SessionEffect.ShowReminder,
    nowElapsed: Long,
  ) {
    val shown = OverlayController.show(
      this,
      appLabel(effect.packageName),
      effect.packageName,
      effect.snoozesLeft,
    ) { action ->
      handleReminderAction(current, effect.packageName, action)
    }

    if (shown) {
      activeOverlayPackage = effect.packageName
      current.onReminderShown(nowElapsed)
      LocalUsageStore.recordReminder(this, effect.packageName)
    } else {
      current.onOverlayFailed(nowElapsed)
      PauseLoopEventBus.emitOverlayAction("failed", effect.packageName)
    }
  }

  private fun showCooldown(
    current: SessionEngine,
    effect: SessionEffect.ShowCooldown,
    nowElapsed: Long,
  ) {
    val packageName = effect.packageName ?: current.state.lastPackage
    val shown = OverlayController.showCooldown(
      this,
      if (packageName != null) appLabel(packageName) else "this app",
      packageName,
      effect.remainingMs,
    ) { action ->
      handleCooldownAction(current, packageName, action)
    }

    if (shown) {
      activeOverlayPackage = packageName
      current.onCooldownShown(nowElapsed)
    } else {
      current.onOverlayFailed(nowElapsed)
      PauseLoopEventBus.emitOverlayAction("failed", packageName)
    }
  }

  private fun hideEngineOverlay(emitDismiss: Boolean) {
    val packageName = activeOverlayPackage ?: lastForegroundPackage
    val wasShowing = OverlayController.isShowing
    OverlayController.hide()
    activeOverlayPackage = null
    if (emitDismiss && wasShowing) {
      PauseLoopEventBus.emitOverlayAction("dismissed", packageName)
    }
  }

  private fun handleReminderAction(
    current: SessionEngine,
    packageName: String,
    action: String,
  ) {
    val nowElapsed = SystemClock.elapsedRealtime()
    val nowWall = System.currentTimeMillis()
    val snoozesBefore = current.state.snoozesUsed

    OverlayController.hide()
    activeOverlayPackage = null

    when (action) {
      "close" -> {
        val update = current.onClose(nowWall, packageName)
        applyEffects(
          current,
          update.effects,
          nowElapsed,
          nowWall,
          emitDismissEffects = false,
        )
        LocalUsageStore.recordClose(this, packageName)
        val wentHome = goHome()
        PauseLoopEventBus.emitOverlayAction(
          if (wentHome) "close" else "failed",
          packageName,
        )
      }
      "snooze" -> {
        val update = current.onSnooze(nowElapsed)
        applyEffects(
          current,
          update.effects,
          nowElapsed,
          nowWall,
          emitDismissEffects = false,
        )
        val used = current.state.snoozesUsed > snoozesBefore
        if (used) {
          LocalUsageStore.recordSnooze(this, packageName)
          PauseLoopEventBus.emitOverlayAction("snooze", packageName)
        } else {
          PauseLoopEventBus.emitOverlayAction("dismissed", packageName)
        }
      }
      else -> {
        val update = current.onOverlayDismissed(nowElapsed)
        applyEffects(
          current,
          update.effects,
          nowElapsed,
          nowWall,
          emitDismissEffects = false,
        )
        PauseLoopEventBus.emitOverlayAction("dismissed", packageName)
      }
    }
    persist(current, force = true)
  }

  private fun handleCooldownAction(
    current: SessionEngine,
    packageName: String?,
    action: String,
  ) {
    val nowElapsed = SystemClock.elapsedRealtime()
    val nowWall = System.currentTimeMillis()

    OverlayController.hide()
    activeOverlayPackage = null

    when (action) {
      "close" -> {
        val update = current.onClose(nowWall, packageName)
        applyEffects(
          current,
          update.effects,
          nowElapsed,
          nowWall,
          emitDismissEffects = false,
        )
        if (packageName != null) {
          LocalUsageStore.recordClose(this, packageName)
        }
        val wentHome = goHome()
        PauseLoopEventBus.emitOverlayAction(
          if (wentHome) "close" else "failed",
          packageName,
        )
      }
      else -> {
        val update = current.onOverlayDismissed(nowElapsed)
        applyEffects(
          current,
          update.effects,
          nowElapsed,
          nowWall,
          emitDismissEffects = false,
        )
        PauseLoopEventBus.emitOverlayAction("dismissed", packageName)
      }
    }
    persist(current, force = true)
  }

  private fun dismissAnyOverlay(emitDismiss: Boolean) {
    val current = engine
    val hadEngineOverlay = current?.state?.overlayMode != null
    val wasShowing = OverlayController.isShowing
    if (!wasShowing && !hadEngineOverlay) return

    val packageName = activeOverlayPackage ?: overlayAnchorPackage ?: lastForegroundPackage
    OverlayController.hide()
    activeOverlayPackage = null
    overlayAnchorPackage = null

    if (hadEngineOverlay) {
      current?.onOverlayDismissed(SystemClock.elapsedRealtime())
      current?.let { persist(it, force = true) }
    }
    if (emitDismiss && wasShowing) {
      PauseLoopEventBus.emitOverlayAction("dismissed", packageName)
    }
  }

  private fun persist(current: SessionEngine, force: Boolean = false) {
    val now = SystemClock.elapsedRealtime()
    if (!force && now - lastPersistedElapsed < PERSIST_INTERVAL_MS) return
    MonitoringPreferences.saveSessionState(this, current.state)
    lastPersistedElapsed = now
  }

  private fun stopForLostPermissions() {
    MonitoringPreferences.setMonitoringEnabled(this, false)
    MonitoringPreferences.clearSessionState(this)
    engine = null
    activeOverlayPackage = null
    OverlayController.hide()
    PauseLoopEventBus.emitMonitoringState(false)
    stopSelf()
  }

  private fun scheduleTestOverlay(delayMs: Int) {
    pendingTestOverlay?.let { mainHandler.removeCallbacks(it) }
    dismissAnyOverlay(emitDismiss = false)
    val runnable = Runnable {
      pendingTestOverlay = null
      if (!isRunning) return@Runnable

      val current = ForegroundAppDetector.current(
        this,
        20_000L,
        ForegroundApp(lastForegroundPackage, lastForegroundClass)
      )
      val packageName = current.packageName
      if (packageName == null || packageName == this.packageName || isLauncherPackage(packageName)) {
        // Never draw over PauseLoop or the launcher. The user must switch apps first.
        PauseLoopEventBus.emitOverlayAction("blocked", packageName)
        return@Runnable
      }

      overlayAnchorPackage = packageName
      val snoozesLeft = engine?.state?.snoozesRemaining(2) ?: 2
      val shown = OverlayController.show(
        this,
        appLabel(packageName),
        packageName,
        snoozesLeft
      ) { action ->
        handleTestOverlayAction(action)
      }
      if (!shown) {
        overlayAnchorPackage = null
        PauseLoopEventBus.emitOverlayAction("failed", packageName)
      }
    }
    pendingTestOverlay = runnable
    mainHandler.postDelayed(runnable, delayMs.toLong())
  }

  private fun handleTestOverlayAction(action: String) {
    val packageName = overlayAnchorPackage
    OverlayController.hide()
    overlayAnchorPackage = null

    when (action) {
      "close" -> {
        val wentHome = goHome()
        PauseLoopEventBus.emitOverlayAction(
          if (wentHome) "close" else "failed",
          packageName,
        )
      }
      "snooze" -> {
        PauseLoopEventBus.emitOverlayAction("snooze", packageName)
      }
      else -> {
        PauseLoopEventBus.emitOverlayAction("dismissed", packageName)
      }
    }
  }

  private fun goHome(): Boolean {
    return try {
      val home = Intent(Intent.ACTION_MAIN).apply {
        addCategory(Intent.CATEGORY_HOME)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      startActivity(home)
      true
    } catch (_: Exception) {
      false
    }
  }

  private fun appLabel(packageName: String): String {
    return try {
      val info = packageManager.getApplicationInfo(packageName, 0)
      packageManager.getApplicationLabel(info).toString()
    } catch (_: Exception) {
      "this app"
    }
  }

  private fun isLauncherPackage(packageName: String): Boolean {
    return try {
      val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
      val activities = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        packageManager.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
      } else {
        @Suppress("DEPRECATION")
        packageManager.queryIntentActivities(intent, 0)
      }
      activities.any { it.activityInfo?.packageName == packageName }
    } catch (_: Exception) {
      false
    }
  }
}
