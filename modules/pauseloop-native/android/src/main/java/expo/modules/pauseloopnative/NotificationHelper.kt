package expo.modules.pauseloopnative

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object NotificationHelper {
  const val CHANNEL_MONITORING = "pauseloop_monitoring"
  const val CHANNEL_ALERTS = "pauseloop_alerts"
  const val NOTIFICATION_MONITORING = 4817
  const val NOTIFICATION_ALERT = 4818

  fun createChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    val monitoring = NotificationChannel(
      CHANNEL_MONITORING,
      "Monitoring",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Keeps PauseLoop running while you use selected apps"
      setShowBadge(false)
      setSound(null, null)
      enableVibration(false)
      enableLights(false)
      lockscreenVisibility = Notification.VISIBILITY_PRIVATE
    }

    val alerts = NotificationChannel(
      CHANNEL_ALERTS,
      "PauseLoop alerts",
      NotificationManager.IMPORTANCE_DEFAULT
    ).apply {
      description = "Important notices about monitoring"
      setShowBadge(false)
    }

    manager.createNotificationChannel(monitoring)
    manager.createNotificationChannel(alerts)
  }

  fun monitoringNotification(context: Context): Notification {
    val contentIntent = launchIntent(context)
    val stopIntent = Intent(context, MonitoringService::class.java).apply {
      action = MonitoringService.ACTION_STOP
    }
    val stopPendingIntent = PendingIntent.getService(
      context,
      2,
      stopIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    return NotificationCompat.Builder(context, CHANNEL_MONITORING)
      .setSmallIcon(R.drawable.ic_stat_pauseloop)
      .setColor(0xFFC8F169.toInt())
      .setContentTitle("PauseLoop is active")
      .setContentText("Watching for doomscrolling in your selected apps")
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setSilent(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .addAction(0, "Stop", stopPendingIntent)
      .build()
  }

  fun postBootBlocked(context: Context) {
    createChannels(context)
    if (!PermissionHelper.notificationsEnabled(context)) return

    val notification = NotificationCompat.Builder(context, CHANNEL_ALERTS)
      .setSmallIcon(R.drawable.ic_stat_pauseloop)
      .setColor(0xFFC8F169.toInt())
      .setContentTitle("PauseLoop needs a tap")
      .setContentText("Android blocked the background restart. Open PauseLoop to resume monitoring.")
      .setContentIntent(launchIntent(context))
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .build()

    try {
      NotificationManagerCompat.from(context).notify(NOTIFICATION_ALERT, notification)
    } catch (_: SecurityException) {
      // Notification permission was revoked. The UI will show the disabled state.
    }
  }

  private fun launchIntent(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: Intent(Intent.ACTION_MAIN).apply {
        setPackage(context.packageName)
        addCategory(Intent.CATEGORY_LAUNCHER)
      }
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

    return try {
      PendingIntent.getActivity(
        context,
        1,
        launch,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
    } catch (_: Exception) {
      val details = Intent(
        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.parse("package:${context.packageName}")
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      PendingIntent.getActivity(
        context,
        3,
        details,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
    }
  }
}
