package expo.modules.pauseloopnative

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager

object OverlayController {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var windowManager: WindowManager? = null
  private var rootView: View? = null

  @Volatile
  var isShowing: Boolean = false
    private set

  /**
   * Shows the native reminder. Safe to call from a background queue; the actual
   * WindowManager work is dispatched to the main thread.
   */
  fun show(
    context: Context,
    appName: String,
    packageName: String?,
    snoozesLeft: Int,
    onAction: (String) -> Unit,
  ): Boolean {
    if (Looper.myLooper() != Looper.getMainLooper()) {
      mainHandler.post {
        showInternal(context, appName, packageName, snoozesLeft, onAction)
      }
      return true
    }
    return showInternal(context, appName, packageName, snoozesLeft, onAction)
  }

  private fun showInternal(
    context: Context,
    appName: String,
    packageName: String?,
    snoozesLeft: Int,
    onAction: (String) -> Unit,
  ): Boolean {
    if (!Settings.canDrawOverlays(context)) {
      return false
    }
    val view = ReminderOverlayView(context, appName, packageName, snoozesLeft, onAction)
    return attachView(context, view, "PauseLoop reminder")
  }

  /**
   * Shows the shared-cooldown countdown. The same entry point is used every
   * time a selected app is reopened, so the window can be replaced without
   * changing the underlying wall-clock deadline.
   */
  fun showCooldown(
    context: Context,
    appName: String,
    packageName: String?,
    remainingMs: Long,
    onAction: (String) -> Unit,
  ): Boolean {
    if (Looper.myLooper() != Looper.getMainLooper()) {
      mainHandler.post {
        showCooldownInternal(context, appName, packageName, remainingMs, onAction)
      }
      return true
    }
    return showCooldownInternal(context, appName, packageName, remainingMs, onAction)
  }

  private fun showCooldownInternal(
    context: Context,
    appName: String,
    packageName: String?,
    remainingMs: Long,
    onAction: (String) -> Unit,
  ): Boolean {
    if (!Settings.canDrawOverlays(context)) {
      return false
    }
    val view = CooldownOverlayView(context, appName, packageName, remainingMs, onAction)
    return attachView(context, view, "PauseLoop cooldown")
  }

  /** Updates a visible cooldown. Returns false when no cooldown is attached. */
  fun updateCooldown(remainingMs: Long): Boolean {
    if (Looper.myLooper() != Looper.getMainLooper()) {
      mainHandler.post {
        (rootView as? CooldownOverlayView)?.setRemaining(remainingMs)
      }
      return true
    }
    val view = rootView as? CooldownOverlayView ?: return false
    view.setRemaining(remainingMs)
    return true
  }

  private fun attachView(context: Context, view: View, title: String): Boolean {
    hideInternal()

    val manager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val params = buildLayoutParams(title)

    return try {
      manager.addView(view, params)
      windowManager = manager
      rootView = view
      isShowing = true
      view.requestFocus()
      view.requestApplyInsets()
      view.alpha = 0f
      view.animate().alpha(1f).setDuration(180L).start()
      true
    } catch (_: Exception) {
      try {
        manager.removeViewImmediate(view)
      } catch (_: Exception) {
        // The view was never attached.
      }
      windowManager = null
      rootView = null
      isShowing = false
      false
    }
  }

  @SuppressLint("InlinedApi")
  private fun buildLayoutParams(title: String): WindowManager.LayoutParams {
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }

    return WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      type,
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
        WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      this.title = title
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        fitInsetsTypes = 0
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        layoutInDisplayCutoutMode =
          WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          layoutInDisplayCutoutMode =
            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
        }
      }
    }
  }

  fun hide() {
    if (Looper.myLooper() != Looper.getMainLooper()) {
      mainHandler.post { hideInternal() }
      return
    }
    hideInternal()
  }

  private fun hideInternal() {
    val view = rootView ?: run {
      isShowing = false
      return
    }
    try {
      windowManager?.removeViewImmediate(view)
    } catch (_: Exception) {
      // The window may already have been detached (screen off, service stop).
    }
    rootView = null
    windowManager = null
    isShowing = false
  }

  fun onConfigurationChanged() {
    mainHandler.post {
      rootView?.requestLayout()
      rootView?.requestApplyInsets()
    }
  }

  fun onScreenOff() {
    hide()
  }
}
