package expo.modules.pauseloopnative

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Build
import android.util.Base64
import android.util.LruCache
import java.io.ByteArrayOutputStream
import java.util.Locale

object InstalledAppsRepository {
  private val iconCache = LruCache<String, String>(24)

  fun list(context: Context): List<Map<String, Any>> {
    val packageManager = context.packageManager
    val intent = android.content.Intent(android.content.Intent.ACTION_MAIN).apply {
      addCategory(android.content.Intent.CATEGORY_LAUNCHER)
    }

    val resolved = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.queryIntentActivities(
        intent,
        PackageManager.ResolveInfoFlags.of(0L)
      )
    } else {
      @Suppress("DEPRECATION")
      packageManager.queryIntentActivities(intent, 0)
    }

    val seen = HashSet<String>()
    val apps = ArrayList<Map<String, Any>>()
    for (info in resolved) {
      val activityInfo = info.activityInfo ?: continue
      val packageName = activityInfo.packageName ?: continue
      val appInfo = activityInfo.applicationInfo ?: continue
      if (packageName == context.packageName) continue
      if (!seen.add(packageName)) continue

      apps.add(
        mapOf(
          "packageName" to packageName,
          "label" to info.loadLabel(packageManager).toString(),
          "isSystem" to ((appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0)
        )
      )
    }

    apps.sortBy { (it["label"] as? String)?.lowercase(Locale.getDefault()) ?: "" }
    return apps
  }

  fun iconDataUri(context: Context, packageName: String): String? {
    iconCache.get(packageName)?.let { return it }

    return try {
      val drawable = context.packageManager.getApplicationIcon(packageName)
      val size = 96
      val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bitmap)
      drawable.setBounds(0, 0, size, size)
      drawable.draw(canvas)

      val stream = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
      bitmap.recycle()

      val uri = "data:image/png;base64," +
        Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
      iconCache.put(packageName, uri)
      uri
    } catch (_: Exception) {
      null
    }
  }
}
