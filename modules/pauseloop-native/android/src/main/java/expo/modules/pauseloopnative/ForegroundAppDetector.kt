package expo.modules.pauseloopnative

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context

data class ForegroundApp(
  val packageName: String?,
  val className: String?,
)

object ForegroundAppDetector {
  fun current(
    context: Context,
    windowMs: Long = 10_000L,
    fallback: ForegroundApp? = null,
  ): ForegroundApp {
    return try {
      val usageManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val end = System.currentTimeMillis()
      val events = usageManager.queryEvents(end - windowMs, end)
      val event = UsageEvents.Event()
      var packageName: String? = null
      var className: String? = null

      while (events.hasNextEvent()) {
        events.getNextEvent(event)
        if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
          packageName = event.packageName
          className = event.className
        }
      }

      if (packageName != null) {
        ForegroundApp(packageName, className)
      } else {
        fallback ?: ForegroundApp(null, null)
      }
    } catch (_: Exception) {
      fallback ?: ForegroundApp(null, null)
    }
  }
}
