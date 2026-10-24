package expo.modules.pauseloopnative

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.os.Build
import android.text.TextUtils
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowInsets
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.content.res.ResourcesCompat
import java.util.Locale
import kotlin.math.roundToInt

/**
 * The native full-screen reminder. It is deliberately built in Android views:
 * a React Native view cannot reliably be displayed over another app from a
 * background service.
 */
class ReminderOverlayView(
  context: Context,
  private val appName: String,
  private val packageName: String?,
  private val snoozesLeft: Int,
  private val onAction: (String) -> Unit,
) : FrameLayout(context) {

  companion object {
    private const val COLOR_TEXT = 0xFFF2F6EE.toInt()
    private const val COLOR_MUTED = 0xFFA7B5AA.toInt()
    private const val COLOR_FAINT = 0xFF708074.toInt()
    private const val COLOR_ACCENT = 0xFFC8F169.toInt()
    private const val COLOR_MINT = 0xFF7DE3C3.toInt()
    private const val COLOR_CARD = 0xFF111C16.toInt()
    private const val COLOR_CARD_ALT = 0xFF0E1913.toInt()
    private const val COLOR_BORDER = 0xFF2B4033.toInt()
    private const val COLOR_INK = 0xFF101A10.toInt()
  }

  private val density = resources.displayMetrics.density
  private val regularTypeface: Typeface by lazy {
    loadTypeface(R.font.manrope_regular, Typeface.NORMAL)
  }
  private val semiboldTypeface: Typeface by lazy {
    loadTypeface(R.font.manrope_semibold, Typeface.BOLD)
  }
  private val boldTypeface: Typeface by lazy {
    loadTypeface(R.font.manrope_bold, Typeface.BOLD)
  }
  private val extraboldTypeface: Typeface by lazy {
    loadTypeface(R.font.manrope_extrabold, Typeface.BOLD)
  }

  init {
    isFocusable = true
    isFocusableInTouchMode = true
    isClickable = true
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
    background = GradientDrawable(
      GradientDrawable.Orientation.TOP_BOTTOM,
      intArrayOf(0xF20A120E.toInt(), 0xFF060B09.toInt())
    )
    setOnClickListener { /* Consume taps on the scrim. */ }
    setOnApplyWindowInsetsListener { view, insets ->
      val left: Int
      val top: Int
      val right: Int
      val bottom: Int
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val bars = insets.getInsets(
          WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout()
        )
        left = bars.left
        top = bars.top
        right = bars.right
        bottom = bars.bottom
      } else {
        @Suppress("DEPRECATION")
        left = insets.systemWindowInsets.left
        @Suppress("DEPRECATION")
        top = insets.systemWindowInsets.top
        @Suppress("DEPRECATION")
        right = insets.systemWindowInsets.right
        @Suppress("DEPRECATION")
        bottom = insets.systemWindowInsets.bottom
      }
      view.setPadding(left + dp(20), top + dp(20), right + dp(20), bottom + dp(20))
      insets
    }

    val scroll = ScrollView(context).apply {
      isFillViewport = true
      overScrollMode = OVER_SCROLL_NEVER
      isVerticalScrollBarEnabled = false
      clipToPadding = false
    }

    val content = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL or Gravity.CENTER_VERTICAL
      setPadding(dp(4), dp(16), dp(4), dp(16))
    }

    content.addView(brandRow())
    content.addView(reminderCard(), LinearLayout.LayoutParams(
      minOf(resources.displayMetrics.widthPixels - dp(48), dp(500)),
      LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply {
      topMargin = dp(18)
    })

    scroll.addView(content, FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.WRAP_CONTENT
    ))
    addView(scroll, FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT
    ))
  }

  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (event.keyCode == KeyEvent.KEYCODE_BACK) {
      return true
    }
    return super.dispatchKeyEvent(event)
  }

  private fun brandRow(): View {
    return LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
      )
      addView(View(context).apply {
        layoutParams = LinearLayout.LayoutParams(dp(7), dp(7)).apply { rightMargin = dp(8) }
        background = rounded(COLOR_ACCENT, dp(99))
      })
      addView(text("PAUSELOOP", 11f, COLOR_MUTED, Typeface.BOLD, extraboldTypeface).apply {
        letterSpacing = 0.22f
      })
    }
  }

  private fun reminderCard(): View {
    val card = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(24), dp(26), dp(24), dp(24))
      background = rounded(COLOR_CARD, dp(28), COLOR_BORDER, dp(1))
      elevation = dp(10).toFloat()
    }

    card.addView(appIcon())
    card.addView(text("A MINDFUL PAUSE", 11f, COLOR_ACCENT, Typeface.BOLD).apply {
      letterSpacing = 0.18f
      gravity = Gravity.CENTER
      setPadding(0, dp(18), 0, 0)
    })
    card.addView(text("Break the loop.\nTake the pause.", 30f, COLOR_TEXT, Typeface.BOLD, extraboldTypeface).apply {
      gravity = Gravity.CENTER
      setLineSpacing(0f, 1.04f)
      setPadding(0, dp(7), 0, 0)
    })
    card.addView(text(
      "You have been scrolling in $appName for a while. Take a breath, then choose what comes next.",
      15f,
      COLOR_MUTED,
      Typeface.NORMAL
    ).apply {
      gravity = Gravity.CENTER
      setLineSpacing(0f, 1.18f)
      setPadding(0, dp(10), 0, 0)
    })

    card.addView(suggestion(), LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { topMargin = dp(18) })

    card.addView(button("Close app", true) {
      onAction("close")
    }, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { topMargin = dp(22) })

    if (snoozesLeft > 0) {
      card.addView(button("Snooze 5 min · $snoozesLeft left", false) {
        onAction("snooze")
      }, LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
      ).apply { topMargin = dp(10) })
    }

    card.addView(text(
      "Home and notifications stay available. Back is disabled here.",
      11f,
      COLOR_FAINT,
      Typeface.NORMAL
    ).apply {
      gravity = Gravity.CENTER
      setLineSpacing(0f, 1.2f)
      setPadding(dp(4), dp(16), dp(4), 0)
    })

    return card
  }

  private fun appIcon(): View {
    val tile = FrameLayout(context).apply {
      layoutParams = LinearLayout.LayoutParams(dp(58), dp(58))
      background = rounded(COLOR_CARD_ALT, dp(17), COLOR_BORDER, dp(1))
      clipToOutline = true
      outlineProvider = object : ViewOutlineProvider() {
        override fun getOutline(view: View, outline: android.graphics.Outline) {
          outline.setRoundRect(0, 0, view.width, view.height, dp(17).toFloat())
        }
      }
    }

    val drawable = loadAppIcon()
    if (drawable != null) {
      tile.addView(ImageView(context).apply {
        setImageDrawable(drawable)
        scaleType = ImageView.ScaleType.CENTER_INSIDE
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT).apply {
          setMargins(dp(11), dp(11), dp(11), dp(11))
        }
      })
    } else {
      tile.addView(text(
        appName.trim().take(1).uppercase(Locale.getDefault()),
        23f,
        COLOR_ACCENT,
        Typeface.BOLD
      ).apply {
        gravity = Gravity.CENTER
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
      })
    }
    return tile
  }

  private fun loadAppIcon(): Drawable? {
    val pkg = packageName ?: return null
    return try {
      context.packageManager.getApplicationIcon(pkg)
    } catch (_: Exception) {
      null
    }
  }

  private fun suggestion(): View {
    return LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(14), dp(13), dp(14), dp(13))
      background = rounded(COLOR_CARD_ALT, dp(16), COLOR_BORDER, dp(1))
      addView(text("✦", 16f, COLOR_MINT, Typeface.BOLD).apply {
        setPadding(0, 0, dp(10), 0)
      })
      addView(text(
        "Try this: stand up, look away from the screen, and take five slow breaths.",
        13f,
        COLOR_MUTED,
        Typeface.NORMAL
      ).apply {
        setLineSpacing(0f, 1.18f)
        layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
      })
    }
  }

  private fun button(label: String, primary: Boolean, onClick: () -> Unit): TextView {
    val bg = rounded(
      if (primary) COLOR_ACCENT else Color.TRANSPARENT,
      dp(16),
      if (primary) null else COLOR_BORDER,
      if (primary) 0 else dp(1)
    )
    val ripple = RippleDrawable(
      android.content.res.ColorStateList.valueOf(
        if (primary) 0x33101A10 else 0x33FFFFFF
      ),
      bg,
      null
    )
    return TextView(context).apply {
      text = label
      gravity = Gravity.CENTER
      setTextColor(if (primary) COLOR_INK else COLOR_TEXT)
      textSize = 15f
      typeface = semiboldTypeface
      isClickable = true
      isFocusable = true
      minHeight = dp(54)
      setPadding(dp(16), dp(14), dp(16), dp(14))
      background = ripple
      contentDescription = label
      setOnClickListener { onClick() }
    }
  }

  private fun text(
    value: String,
    size: Float,
    color: Int,
    style: Int,
    typeface: Typeface? = null,
  ): TextView {
    return TextView(context).apply {
      text = value
      textSize = size
      setTextColor(color)
      this.typeface = typeface ?: if (style == Typeface.BOLD) boldTypeface else regularTypeface
      includeFontPadding = false
      maxLines = Int.MAX_VALUE
      ellipsize = null
      if (TextUtils.isEmpty(value)) {
        visibility = View.GONE
      }
    }
  }

  private fun loadTypeface(resourceId: Int, fallbackStyle: Int): Typeface {
    return try {
      ResourcesCompat.getFont(context, resourceId)
        ?: Typeface.create("sans-serif", fallbackStyle)
    } catch (_: Exception) {
      Typeface.create("sans-serif", fallbackStyle)
    }
  }

  private fun rounded(
    color: Int,
    radius: Int,
    strokeColor: Int? = null,
    strokeWidth: Int = 0,
  ): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = radius.toFloat()
      setColor(color)
      if (strokeColor != null && strokeWidth > 0) {
        setStroke(strokeWidth, strokeColor)
      }
    }
  }

  private fun dp(value: Int): Int = (value * density).roundToInt()
}
