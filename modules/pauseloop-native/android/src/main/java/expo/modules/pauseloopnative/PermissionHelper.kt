package expo.modules.pauseloopnative

import android.Manifest
import android.app.AppOpsManager
import android.app.NotificationManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.AppContext

object PermissionHelper {
  private const val NOTIFICATION_REQUEST_CODE = 4817
  private val USAGE_ACCESS_OP = AppOpsManager.OPSTR_GET_USAGE_STATS

  fun status(context: Context): Map<String, Any> {
    return mapOf(
      "usageAccess" to hasUsageAccess(context),
      "overlay" to canDrawOverlays(context),
      "notifications" to notificationsGranted(context),
      "batteryOptimizationIgnored" to batteryOptimizationIgnored(context)
    )
  }

  fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(
        USAGE_ACCESS_OP,
        Process.myUid(),
        context.packageName
      )
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(
        USAGE_ACCESS_OP,
        Process.myUid(),
        context.packageName
      )
    }
    if (mode == AppOpsManager.MODE_ALLOWED) {
      return true
    }

    // Some OEMs report MODE_DEFAULT even after the user grants access.
    return try {
      val usage = context.getSystemService(Context.USAGE_STATS_SERVICE)
        as android.app.usage.UsageStatsManager
      val now = System.currentTimeMillis()
      val stats = usage.queryUsageStats(
        android.app.usage.UsageStatsManager.INTERVAL_DAILY,
        now - 24 * 60 * 60 * 1000L,
        now
      )
      !stats.isNullOrEmpty()
    } catch (_: Exception) {
      false
    }
  }

  fun canDrawOverlays(context: Context): Boolean {
    return Settings.canDrawOverlays(context)
  }

  fun notificationsGranted(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return true
    }
    return ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.POST_NOTIFICATIONS
    ) == PackageManager.PERMISSION_GRANTED
  }

  fun batteryOptimizationIgnored(context: Context): Boolean {
    return try {
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      power.isIgnoringBatteryOptimizations(context.packageName)
    } catch (_: Exception) {
      false
    }
  }

  fun openUsageAccess(context: Context) {
    val packageIntent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      data = Uri.parse("package:${context.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    val fallback = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    startSettings(context, packageIntent, fallback)
  }

  fun openOverlaySettings(context: Context) {
    val packageIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
      data = Uri.parse("package:${context.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    val fallback = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    startSettings(context, packageIntent, fallback)
  }

  fun openBatteryOptimizationSettings(context: Context) {
    val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    try {
      context.startActivity(intent)
    } catch (_: ActivityNotFoundException) {
      throw IllegalStateException("Battery optimization settings are unavailable on this device")
    }
  }

  fun requestNotifications(appContext: AppContext) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return
    }
    val activity = appContext.currentActivity
      ?: throw IllegalStateException("Notification permission needs an active activity")
    ActivityCompat.requestPermissions(
      activity,
      arrayOf(Manifest.permission.POST_NOTIFICATIONS),
      NOTIFICATION_REQUEST_CODE
    )
  }

  fun notificationsEnabled(context: Context): Boolean {
    return try {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.areNotificationsEnabled()
    } catch (_: Exception) {
      true
    }
  }

  private fun startSettings(context: Context, primary: Intent, fallback: Intent) {
    try {
      context.startActivity(primary)
    } catch (_: Exception) {
      try {
        context.startActivity(fallback)
      } catch (_: Exception) {
        throw IllegalStateException("The requested system settings screen is unavailable")
      }
    }
  }
}
