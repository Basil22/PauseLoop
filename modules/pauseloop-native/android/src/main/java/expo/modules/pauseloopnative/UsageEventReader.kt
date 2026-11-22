package expo.modules.pauseloopnative

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context

object UsageEventReader {
  private const val DEFAULT_WINDOW_MS = 30 * 60 * 1000L

  fun recent(
    context: Context,
    packageName: String,
    limit: Int,
    windowMs: Long = DEFAULT_WINDOW_MS,
  ): List<Map<String, Any?>> {
    val usageManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val end = System.currentTimeMillis()
    val events = usageManager.queryEvents(end - windowMs, end) ?: return emptyList()
    val event = UsageEvents.Event()
    val result = ArrayDeque<Map<String, Any?>>()

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.packageName != packageName) continue

      result.addLast(
        mapOf(
          "type" to typeName(event.eventType),
          "packageName" to event.packageName,
          "className" to event.className,
          "timestamp" to event.timeStamp
        )
      )
      while (result.size > limit) {
        result.removeFirst()
      }
    }

    return result.toList()
  }

  private fun typeName(type: Int): String {
    return when (type) {
      UsageEvents.Event.ACTIVITY_RESUMED -> "ACTIVITY_RESUMED"
      UsageEvents.Event.ACTIVITY_PAUSED -> "ACTIVITY_PAUSED"
      UsageEvents.Event.ACTIVITY_STOPPED -> "ACTIVITY_STOPPED"
      UsageEvents.Event.SCREEN_INTERACTIVE -> "SCREEN_INTERACTIVE"
      UsageEvents.Event.SCREEN_NON_INTERACTIVE -> "SCREEN_NON_INTERACTIVE"
      UsageEvents.Event.KEYGUARD_SHOWN -> "KEYGUARD_SHOWN"
      UsageEvents.Event.KEYGUARD_HIDDEN -> "KEYGUARD_HIDDEN"
      UsageEvents.Event.DEVICE_SHUTDOWN -> "DEVICE_SHUTDOWN"
      UsageEvents.Event.DEVICE_STARTUP -> "DEVICE_STARTUP"
      else -> "EVENT_$type"
    }
  }
}
