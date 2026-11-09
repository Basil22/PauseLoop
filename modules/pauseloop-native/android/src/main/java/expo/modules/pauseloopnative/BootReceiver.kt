package expo.modules.pauseloopnative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    if (!MonitoringPreferences.isMonitoringEnabled(context)) return

    try {
      ContextCompat.startForegroundService(
        context,
        Intent(context, MonitoringService::class.java).setAction(MonitoringService.ACTION_START)
      )
    } catch (_: Exception) {
      // Android 12+ can block background FGS starts. Ask the user to reopen
      // PauseLoop instead of silently pretending monitoring survived.
      NotificationHelper.postBootBlocked(context)
    }
  }
}
