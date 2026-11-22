package expo.modules.pauseloopnative

import android.content.Context
import android.content.SharedPreferences
import android.content.pm.ApplicationInfo
import org.json.JSONArray
import org.json.JSONObject

data class MonitoringSettings(
  val monitoringEnabled: Boolean,
  val targetPackages: List<String>,
  val reminderIntervalMinutes: Int,
  val suggestionsEnabled: Boolean,
  val insightsEnabled: Boolean,
  val onboardingComplete: Boolean,
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "monitoringEnabled" to monitoringEnabled,
    "targetPackages" to targetPackages,
    "reminderIntervalMinutes" to reminderIntervalMinutes,
    "suggestionsEnabled" to suggestionsEnabled,
    "insightsEnabled" to insightsEnabled,
    "onboardingComplete" to onboardingComplete,
  )
}

/**
 * Small, synchronous settings store. Everything is app-private and local:
 * target packages, the reminder interval, UI toggles, and the persisted session
 * snapshot used to survive a service process restart.
 */
object MonitoringPreferences {
  private const val PREFS_NAME = "pauseloop_prefs"

  private const val KEY_MONITORING_ENABLED = "monitoringEnabled"
  private const val KEY_TARGET_PACKAGES = "targetPackages"
  private const val KEY_REMINDER_INTERVAL_MINUTES = "reminderIntervalMinutes"
  private const val KEY_SUGGESTIONS_ENABLED = "suggestionsEnabled"
  private const val KEY_INSIGHTS_ENABLED = "insightsEnabled"
  private const val KEY_ONBOARDING_COMPLETE = "onboardingComplete"
  private const val KEY_DEBUG_THRESHOLD_SECONDS = "debugThresholdSeconds"
  private const val KEY_SESSION_STATE = "sessionState"

  const val DEFAULT_REMINDER_INTERVAL_MINUTES = 5
  const val MIN_REMINDER_INTERVAL_MINUTES = 1
  const val MAX_REMINDER_INTERVAL_MINUTES = 120
  const val MAX_TARGET_PACKAGES = 250

  private const val MAX_PACKAGE_LENGTH = 255
  private const val MAX_DEBUG_THRESHOLD_SECONDS = 600

  private fun prefs(context: Context): SharedPreferences {
    return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  fun isMonitoringEnabled(context: Context): Boolean {
    return prefs(context).getBoolean(KEY_MONITORING_ENABLED, false)
  }

  fun setMonitoringEnabled(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(KEY_MONITORING_ENABLED, enabled).apply()
  }

  fun settings(context: Context): MonitoringSettings {
    val prefs = prefs(context)
    return MonitoringSettings(
      monitoringEnabled = prefs.getBoolean(KEY_MONITORING_ENABLED, false),
      targetPackages = readTargetPackages(prefs),
      reminderIntervalMinutes = prefs.getInt(
        KEY_REMINDER_INTERVAL_MINUTES,
        DEFAULT_REMINDER_INTERVAL_MINUTES,
      ).coerceIn(MIN_REMINDER_INTERVAL_MINUTES, MAX_REMINDER_INTERVAL_MINUTES),
      suggestionsEnabled = prefs.getBoolean(KEY_SUGGESTIONS_ENABLED, true),
      insightsEnabled = prefs.getBoolean(KEY_INSIGHTS_ENABLED, true),
      onboardingComplete = prefs.getBoolean(KEY_ONBOARDING_COMPLETE, false),
    )
  }

  fun settingsMap(context: Context): Map<String, Any?> = settings(context).toMap()

  fun setTargetPackages(context: Context, packages: List<String>): MonitoringSettings {
    val normalized = normalizePackages(packages)
    prefs(context).edit()
      .putString(KEY_TARGET_PACKAGES, JSONArray(normalized).toString())
      .apply()
    return settings(context)
  }

  fun setReminderIntervalMinutes(context: Context, minutes: Int): MonitoringSettings {
    val clamped = minutes.coerceIn(
      MIN_REMINDER_INTERVAL_MINUTES,
      MAX_REMINDER_INTERVAL_MINUTES,
    )
    prefs(context).edit().putInt(KEY_REMINDER_INTERVAL_MINUTES, clamped).apply()
    return settings(context)
  }

  fun setSuggestionsEnabled(context: Context, enabled: Boolean): MonitoringSettings {
    prefs(context).edit().putBoolean(KEY_SUGGESTIONS_ENABLED, enabled).apply()
    return settings(context)
  }

  fun setInsightsEnabled(context: Context, enabled: Boolean): MonitoringSettings {
    prefs(context).edit().putBoolean(KEY_INSIGHTS_ENABLED, enabled).apply()
    return settings(context)
  }

  fun setOnboardingComplete(context: Context, complete: Boolean): MonitoringSettings {
    prefs(context).edit().putBoolean(KEY_ONBOARDING_COMPLETE, complete).apply()
    return settings(context)
  }

  /**
   * Debug-only override used by local verification. It is ignored by release
   * builds so a shipped app can never accidentally use a ten-second threshold.
   */
  fun debugThresholdSeconds(context: Context): Int {
    val debuggable =
      context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
    if (!debuggable) return 0
    return prefs(context)
      .getInt(KEY_DEBUG_THRESHOLD_SECONDS, 0)
      .coerceIn(0, MAX_DEBUG_THRESHOLD_SECONDS)
  }

  fun setDebugThresholdSeconds(context: Context, seconds: Int) {
    prefs(context).edit()
      .putInt(
        KEY_DEBUG_THRESHOLD_SECONDS,
        seconds.coerceIn(0, MAX_DEBUG_THRESHOLD_SECONDS),
      )
      .apply()
  }

  fun sessionState(context: Context): SessionState? {
    val raw = prefs(context).getString(KEY_SESSION_STATE, null) ?: return null
    return try {
      val json = JSONObject(raw)
      SessionState(
        accumulatedMs = json.optLong("accumulatedMs", 0L).coerceAtLeast(0L),
        snoozesUsed = json.optInt("snoozesUsed", 0).coerceAtLeast(0),
        snoozeUntilElapsed = json.optionalLong("snoozeUntilElapsed"),
        cooldownUntilWall = json.optionalLong("cooldownUntilWall"),
        awaySinceElapsed = json.optionalLong("awaySinceElapsed"),
        lastObservedElapsed = json.optionalLong("lastObservedElapsed"),
        // A window never survives process death, so visibility is not restored.
        overlayMode = null,
        pendingReminder = json.optBoolean("pendingReminder", false),
        wasAccumulating = false,
        sessionActive = json.optBoolean("sessionActive", false),
        lastPackage = json.optionalString("lastPackage"),
      )
    } catch (_: Exception) {
      null
    }
  }

  fun saveSessionState(context: Context, state: SessionState) {
    val json = JSONObject().apply {
      put("accumulatedMs", state.accumulatedMs)
      put("snoozesUsed", state.snoozesUsed)
      putNullable("snoozeUntilElapsed", state.snoozeUntilElapsed)
      putNullable("cooldownUntilWall", state.cooldownUntilWall)
      putNullable("awaySinceElapsed", state.awaySinceElapsed)
      putNullable("lastObservedElapsed", state.lastObservedElapsed)
      put("pendingReminder", state.pendingReminder)
      put("sessionActive", state.sessionActive)
      putNullable("lastPackage", state.lastPackage)
    }
    prefs(context).edit().putString(KEY_SESSION_STATE, json.toString()).apply()
  }

  fun clearSessionState(context: Context) {
    prefs(context).edit().remove(KEY_SESSION_STATE).apply()
  }

  fun normalizePackages(packages: List<String>): List<String> {
    return packages
      .asSequence()
      .map { it.trim() }
      .filter { value ->
        value.isNotEmpty() &&
          value.length <= MAX_PACKAGE_LENGTH &&
          !value.contains('\n') &&
          !value.contains('\r')
      }
      .distinct()
      .sorted()
      .take(MAX_TARGET_PACKAGES)
      .toList()
  }

  private fun readTargetPackages(prefs: SharedPreferences): List<String> {
    val raw = prefs.getString(KEY_TARGET_PACKAGES, null) ?: return emptyList()
    return try {
      val array = JSONArray(raw)
      val result = ArrayList<String>(array.length())
      for (index in 0 until array.length()) {
        val value = array.optString(index, "").trim()
        if (value.isNotEmpty()) {
          result.add(value)
        }
      }
      result
    } catch (_: Exception) {
      emptyList()
    }
  }

  private fun JSONObject.optionalLong(name: String): Long? {
    return if (!has(name) || isNull(name)) null else optLong(name)
  }

  private fun JSONObject.optionalString(name: String): String? {
    return if (!has(name) || isNull(name)) null else optString(name)
  }

  private fun JSONObject.putNullable(name: String, value: Long?) {
    if (value == null) put(name, JSONObject.NULL) else put(name, value)
  }

  private fun JSONObject.putNullable(name: String, value: String?) {
    if (value == null) put(name, JSONObject.NULL) else put(name, value)
  }
}
