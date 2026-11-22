package expo.modules.pauseloopnative

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * App-private daily aggregates. This intentionally uses SQLiteOpenHelper rather
 * than Room: the schema is tiny, the app stays dependency-free, and the build
 * remains fast. Only selected-app totals are stored; no raw event timeline,
 * screen content, URLs, messages, or titles ever reach this database.
 */
object LocalUsageStore {
  private const val DB_NAME = "pauseloop_local.db"
  private const val DB_VERSION = 1
  private const val RETENTION_DAYS = 90

  private val lock = Any()
  private var helper: DatabaseHelper? = null
  private var lastPruneDate: String? = null

  private class DatabaseHelper(context: Context) : SQLiteOpenHelper(
    context.applicationContext,
    DB_NAME,
    null,
    DB_VERSION,
  ) {
    override fun onCreate(db: SQLiteDatabase) {
      db.execSQL(
        """
        CREATE TABLE daily_usage (
          package_name TEXT NOT NULL,
          local_date TEXT NOT NULL,
          foreground_ms INTEGER NOT NULL DEFAULT 0,
          session_count INTEGER NOT NULL DEFAULT 0,
          reminder_count INTEGER NOT NULL DEFAULT 0,
          snooze_count INTEGER NOT NULL DEFAULT 0,
          close_count INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (package_name, local_date)
        )
        """.trimIndent()
      )
      db.execSQL(
        """
        CREATE TABLE daily_summary (
          local_date TEXT PRIMARY KEY,
          timezone_id TEXT NOT NULL,
          total_monitored_ms INTEGER NOT NULL DEFAULT 0,
          reminder_count INTEGER NOT NULL DEFAULT 0,
          snooze_count INTEGER NOT NULL DEFAULT 0,
          cooldown_count INTEGER NOT NULL DEFAULT 0
        )
        """.trimIndent()
      )
      db.execSQL("CREATE INDEX idx_daily_usage_date ON daily_usage(local_date)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
      // Version 1 is the Phase 1 foundation. Future versions add migrations
      // here rather than dropping user history.
    }
  }

  private fun database(context: Context): SQLiteDatabase {
    val current = helper ?: synchronized(lock) {
      helper ?: DatabaseHelper(context).also { helper = it }
    }
    return current.writableDatabase
  }

  fun recordUsage(
    context: Context,
    packageName: String,
    deltaMs: Long,
    sessionStart: Boolean,
  ) {
    if (deltaMs <= 0L && !sessionStart) return
    synchronized(lock) {
      val db = database(context)
      val date = today()
      pruneIfNeeded(db, date)
      val timezone = TimeZone.getDefault().id

      db.beginTransaction()
      try {
        ensureSummary(db, date, timezone)
        db.execSQL(
          "INSERT OR IGNORE INTO daily_usage(package_name, local_date) VALUES(?, ?)",
          arrayOf(packageName, date)
        )
        db.execSQL(
          """
          UPDATE daily_usage
          SET foreground_ms = foreground_ms + ?,
              session_count = session_count + ?
          WHERE package_name = ? AND local_date = ?
          """.trimIndent(),
          arrayOf<Any>(deltaMs.coerceAtLeast(0L), if (sessionStart) 1 else 0, packageName, date)
        )
        db.execSQL(
          "UPDATE daily_summary SET total_monitored_ms = total_monitored_ms + ? WHERE local_date = ?",
          arrayOf<Any>(deltaMs.coerceAtLeast(0L), date)
        )
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
    }
  }

  fun recordReminder(context: Context, packageName: String) {
    recordCounter(context, packageName, "reminder_count", "reminder_count")
  }

  fun recordSnooze(context: Context, packageName: String) {
    recordCounter(context, packageName, "snooze_count", "snooze_count")
  }

  fun recordClose(context: Context, packageName: String) {
    recordCounter(context, packageName, "close_count", null)
  }

  fun recordCooldown(context: Context, packageName: String?) {
    synchronized(lock) {
      val db = database(context)
      val date = today()
      pruneIfNeeded(db, date)
      db.beginTransaction()
      try {
        ensureSummary(db, date, TimeZone.getDefault().id)
        db.execSQL(
          "UPDATE daily_summary SET cooldown_count = cooldown_count + 1 WHERE local_date = ?",
          arrayOf(date)
        )
        if (packageName != null) {
          db.execSQL(
            "INSERT OR IGNORE INTO daily_usage(package_name, local_date) VALUES(?, ?)",
            arrayOf(packageName, date)
          )
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
    }
  }

  private fun recordCounter(
    context: Context,
    packageName: String,
    usageColumn: String,
    summaryColumn: String?,
  ) {
    synchronized(lock) {
      val db = database(context)
      val date = today()
      pruneIfNeeded(db, date)
      db.beginTransaction()
      try {
        ensureSummary(db, date, TimeZone.getDefault().id)
        db.execSQL(
          "INSERT OR IGNORE INTO daily_usage(package_name, local_date) VALUES(?, ?)",
          arrayOf(packageName, date)
        )
        db.execSQL(
          "UPDATE daily_usage SET $usageColumn = $usageColumn + 1 WHERE package_name = ? AND local_date = ?",
          arrayOf(packageName, date)
        )
        if (summaryColumn != null) {
          db.execSQL(
            "UPDATE daily_summary SET $summaryColumn = $summaryColumn + 1 WHERE local_date = ?",
            arrayOf(date)
          )
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
    }
  }

  private fun ensureSummary(db: SQLiteDatabase, date: String, timezone: String) {
    val values = ContentValues().apply {
      put("local_date", date)
      put("timezone_id", timezone)
      put("total_monitored_ms", 0L)
      put("reminder_count", 0)
      put("snooze_count", 0)
      put("cooldown_count", 0)
    }
    db.insertWithOnConflict("daily_summary", null, values, SQLiteDatabase.CONFLICT_IGNORE)
  }

  fun historyStatus(context: Context): Map<String, Any?> {
    synchronized(lock) {
      val db = database(context)
      pruneIfNeeded(db, today())
      db.rawQuery(
        """
        SELECT COUNT(DISTINCT local_date), MIN(local_date), MAX(local_date),
               COALESCE(SUM(total_monitored_ms), 0)
        FROM daily_summary
        """.trimIndent(),
        null
      ).use { cursor ->
        if (cursor.moveToFirst()) {
          return mapOf(
            "daysStored" to cursor.getInt(0),
            "oldestDate" to if (cursor.isNull(1)) null else cursor.getString(1),
            "newestDate" to if (cursor.isNull(2)) null else cursor.getString(2),
            "totalMonitoredMs" to cursor.getLong(3),
            "retentionDays" to RETENTION_DAYS,
          )
        }
      }
    }
    return mapOf(
      "daysStored" to 0,
      "oldestDate" to null,
      "newestDate" to null,
      "totalMonitoredMs" to 0L,
      "retentionDays" to RETENTION_DAYS,
    )
  }

  fun dailySummaries(context: Context, limit: Int): List<Map<String, Any?>> {
    synchronized(lock) {
      val db = database(context)
      pruneIfNeeded(db, today())
      db.rawQuery(
        """
        SELECT local_date, timezone_id, total_monitored_ms, reminder_count,
               snooze_count, cooldown_count
        FROM daily_summary
        ORDER BY local_date DESC
        LIMIT ?
        """.trimIndent(),
        arrayOf(limit.coerceIn(1, RETENTION_DAYS).toString())
      ).use { cursor ->
        val result = ArrayList<Map<String, Any?>>()
        while (cursor.moveToNext()) {
          result.add(
            mapOf(
              "localDate" to cursor.getString(0),
              "timezoneId" to cursor.getString(1),
              "totalMonitoredMs" to cursor.getLong(2),
              "reminderCount" to cursor.getInt(3),
              "snoozeCount" to cursor.getInt(4),
              "cooldownCount" to cursor.getInt(5),
            )
          )
        }
        return result
      }
    }
  }

  fun clear(context: Context) {
    synchronized(lock) {
      val db = database(context)
      db.beginTransaction()
      try {
        db.delete("daily_usage", null, null)
        db.delete("daily_summary", null, null)
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      lastPruneDate = today()
    }
  }

  private fun pruneIfNeeded(db: SQLiteDatabase, today: String) {
    if (lastPruneDate == today) return
    lastPruneDate = today
    val cutoff = cutoffDate()
    db.beginTransaction()
    try {
      db.delete("daily_usage", "local_date < ?", arrayOf(cutoff))
      db.delete("daily_summary", "local_date < ?", arrayOf(cutoff))
      db.setTransactionSuccessful()
    } finally {
      db.endTransaction()
    }
  }

  private fun today(): String {
    return dateFormat().format(Date())
  }

  private fun cutoffDate(): String {
    val calendar = Calendar.getInstance()
    calendar.add(Calendar.DAY_OF_YEAR, -RETENTION_DAYS)
    return dateFormat().format(calendar.time)
  }

  private fun dateFormat(): SimpleDateFormat {
    return SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
      timeZone = TimeZone.getDefault()
    }
  }
}
