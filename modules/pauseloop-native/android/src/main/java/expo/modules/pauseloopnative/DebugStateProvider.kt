package expo.modules.pauseloopnative

import android.app.KeyguardManager
import android.content.Context
import android.os.PowerManager

object DebugStateProvider {
  fun snapshot(context: Context): Map<String, Any?> {
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    val running = MonitoringService.isRunning

    return mapOf(
      "serviceRunning" to running,
      "overlayVisible" to OverlayController.isShowing,
      "screenOn" to powerManager.isInteractive,
      "locked" to keyguardManager.isKeyguardLocked,
      "foregroundPackage" to if (running) MonitoringService.lastForegroundPackage else null,
      "foregroundClass" to if (running) MonitoringService.lastForegroundClass else null
    )
  }
}
