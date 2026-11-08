package expo.modules.pauseloopnative

/**
 * Pure session state machine for PauseLoop.
 *
 * The engine deliberately has no Android dependencies. MonitoringService feeds
 * it a poll every ~2 seconds, and the engine decides whether to accumulate
 * usage, show a reminder, hide an overlay, or start the shared cooldown.
 *
 * Time rules:
 *  - Accumulation, away gaps, and snoozes use monotonic elapsed time.
 *  - Cooldown expiry uses wall-clock time so it survives process death.
 *  - Overlay time never accumulates.
 */
data class SessionRules(
  val thresholdMs: Long,
  val gapMs: Long = 5 * 60_000L,
  val snoozeMs: Long = 5 * 60_000L,
  val cooldownMs: Long = 5 * 60_000L,
  val maxSnoozes: Int = 2,
) {
  init {
    require(thresholdMs > 0) { "thresholdMs must be positive" }
    require(gapMs > 0) { "gapMs must be positive" }
    require(snoozeMs > 0) { "snoozeMs must be positive" }
    require(cooldownMs > 0) { "cooldownMs must be positive" }
    require(maxSnoozes >= 0) { "maxSnoozes cannot be negative" }
  }
}

enum class OverlayMode {
  REMINDER,
  COOLDOWN,
}

data class SessionState(
  val accumulatedMs: Long = 0L,
  val snoozesUsed: Int = 0,
  val snoozeUntilElapsed: Long? = null,
  val cooldownUntilWall: Long? = null,
  val awaySinceElapsed: Long? = null,
  val lastObservedElapsed: Long? = null,
  val overlayMode: OverlayMode? = null,
  val pendingReminder: Boolean = false,
  val wasAccumulating: Boolean = false,
  val sessionActive: Boolean = false,
  val lastPackage: String? = null,
) {
  fun snoozesRemaining(maxSnoozes: Int = 2): Int {
    return (maxSnoozes - snoozesUsed).coerceAtLeast(0)
  }

  fun cooldownRemaining(nowWall: Long): Long {
    return (cooldownUntilWall ?: 0L).let { until ->
      if (until <= nowWall) 0L else until - nowWall
    }
  }

  fun liveAccumulatedMs(nowElapsed: Long): Long {
    val last = lastObservedElapsed ?: return accumulatedMs
    if (!wasAccumulating || overlayMode != null || nowElapsed <= last) {
      return accumulatedMs
    }
    // A poll is normally two seconds. Clamp a delayed poll so a long service
    // pause never appears as a sudden block of scrolling time.
    return accumulatedMs + (nowElapsed - last).coerceIn(0L, 10_000L)
  }
}

sealed interface SessionEffect {
  data class ShowReminder(
    val packageName: String,
    val snoozesLeft: Int,
    val elapsedMs: Long,
  ) : SessionEffect

  data class ShowCooldown(
    val packageName: String?,
    val remainingMs: Long,
  ) : SessionEffect

  data class UpdateCooldown(val remainingMs: Long) : SessionEffect

  data object HideOverlay : SessionEffect

  data class RecordUsage(
    val packageName: String,
    val deltaMs: Long,
    val sessionStart: Boolean,
  ) : SessionEffect

  data class RecordCooldown(val packageName: String?) : SessionEffect
}

data class SessionUpdate(
  val state: SessionState,
  val effects: List<SessionEffect>,
)

class SessionEngine(
  rules: SessionRules,
) {
  private var currentRules = rules

  var state: SessionState = SessionState()
    private set

  val rules: SessionRules
    get() = currentRules

  /**
   * Advance the state machine one poll.
   *
   * [foregroundPackage] must be the last known foreground package. When the
   * detector cannot answer, callers should pass their last known value rather
   * than null so an overlay is not dismissed spuriously.
   */
  fun poll(
    nowElapsed: Long,
    nowWall: Long,
    foregroundPackage: String?,
    selectedPackages: Set<String>,
    screenInteractive: Boolean,
    locked: Boolean,
  ): SessionUpdate {
    val effects = mutableListOf<SessionEffect>()
    var next = state

    if (next.lastObservedElapsed == null) {
      next = next.copy(lastObservedElapsed = nowElapsed)
    }

    val interactive = screenInteractive && !locked
    val selectedForeground =
      interactive && foregroundPackage != null && foregroundPackage in selectedPackages

    // Cooldown expiry is wall-clock based. Clear every session field so the
    // next selected-app poll starts a genuinely fresh session.
    if (next.cooldownUntilWall != null && nowWall >= next.cooldownUntilWall!!) {
      if (next.overlayMode == OverlayMode.COOLDOWN) {
        effects += SessionEffect.HideOverlay
      }
      next = next.copy(
        accumulatedMs = 0L,
        snoozesUsed = 0,
        snoozeUntilElapsed = null,
        cooldownUntilWall = null,
        awaySinceElapsed = null,
        overlayMode = null,
        pendingReminder = false,
        wasAccumulating = false,
        sessionActive = false,
        lastPackage = null,
        lastObservedElapsed = nowElapsed,
      )
    }

    // Active cooldown: no accumulation, and every selected app shares the
    // countdown. Reopening any selected app immediately shows it.
    val cooldownUntil = next.cooldownUntilWall
    if (cooldownUntil != null && nowWall < cooldownUntil) {
      val remaining = cooldownUntil - nowWall
      if (selectedForeground) {
        val packageName = foregroundPackage!!
        if (next.overlayMode == OverlayMode.COOLDOWN) {
          effects += SessionEffect.UpdateCooldown(remaining)
          next = next.copy(
            lastObservedElapsed = nowElapsed,
            wasAccumulating = false,
            awaySinceElapsed = null,
            lastPackage = packageName,
          )
        } else {
          if (next.overlayMode != null) {
            effects += SessionEffect.HideOverlay
          }
          effects += SessionEffect.ShowCooldown(packageName, remaining)
          next = next.copy(
            overlayMode = OverlayMode.COOLDOWN,
            pendingReminder = false,
            lastObservedElapsed = nowElapsed,
            wasAccumulating = false,
            awaySinceElapsed = null,
            lastPackage = packageName,
          )
        }
      } else {
        if (next.overlayMode != null) {
          effects += SessionEffect.HideOverlay
        }
        next = next.copy(
          overlayMode = null,
          lastObservedElapsed = nowElapsed,
          wasAccumulating = false,
          awaySinceElapsed = null,
        )
      }
      state = next
      return SessionUpdate(next, effects)
    }

    // A visible overlay pauses accumulation. Screen-off hides it without
    // starting a cooldown; leaving a reminder for another app starts the
    // shared cooldown. Leaving a cooldown overlay never extends it.
    if (next.overlayMode != null) {
      when {
        !interactive -> {
          effects += SessionEffect.HideOverlay
          next = next.copy(
            overlayMode = null,
            lastObservedElapsed = nowElapsed,
            wasAccumulating = false,
          )
        }

        !selectedForeground -> {
          val wasReminder = next.overlayMode == OverlayMode.REMINDER
          effects += SessionEffect.HideOverlay
          next = next.copy(
            overlayMode = null,
            lastObservedElapsed = nowElapsed,
            wasAccumulating = false,
          )
          if (wasReminder && foregroundPackage != null) {
            next = startCooldown(next, nowWall, foregroundPackage, effects)
            state = next
            return SessionUpdate(next, effects)
          }
        }

        else -> {
          next = next.copy(
            lastObservedElapsed = nowElapsed,
            wasAccumulating = false,
            awaySinceElapsed = null,
            lastPackage = foregroundPackage,
          )
          state = next
          return SessionUpdate(next, effects)
        }
      }
    }

    // Away from selected apps, screen off, or locked. Snooze expiry is
    // absolute; if it expires while away, arm a pending reminder for return.
    if (!selectedForeground) {
      val awaySince = next.awaySinceElapsed ?: nowElapsed

      if (next.snoozeUntilElapsed != null && nowElapsed >= next.snoozeUntilElapsed!!) {
        next = next.copy(
          snoozeUntilElapsed = null,
          pendingReminder = true,
        )
      }

      if (nowElapsed - awaySince >= currentRules.gapMs) {
        next = next.copy(
          accumulatedMs = 0L,
          snoozesUsed = 0,
          snoozeUntilElapsed = null,
          awaySinceElapsed = nowElapsed,
          pendingReminder = false,
          overlayMode = null,
          wasAccumulating = false,
          sessionActive = false,
          lastPackage = null,
        )
      } else {
        next = next.copy(awaySinceElapsed = awaySince)
      }

      next = next.copy(
        lastObservedElapsed = nowElapsed,
        wasAccumulating = false,
      )
      state = next
      return SessionUpdate(next, effects)
    }

    // Selected app, interactive, no overlay, no cooldown.
    val packageName = foregroundPackage!!
    val delta = if (next.wasAccumulating) {
      val last = next.lastObservedElapsed ?: nowElapsed
      (nowElapsed - last).coerceIn(0L, 10_000L)
    } else {
      0L
    }

    next = next.copy(
      awaySinceElapsed = null,
      lastPackage = packageName,
    )

    // Snooze expiry is absolute. It re-arms even if the interval threshold is
    // not reached again, because the user explicitly asked for five minutes.
    if (next.snoozeUntilElapsed != null && nowElapsed >= next.snoozeUntilElapsed!!) {
      next = next.copy(snoozeUntilElapsed = null)
      next = showReminder(next, packageName, effects)
      next = next.copy(lastObservedElapsed = nowElapsed, wasAccumulating = false)
      state = next
      return SessionUpdate(next, effects)
    }

    if (next.pendingReminder) {
      next = next.copy(pendingReminder = false)
      next = showReminder(next, packageName, effects)
      next = next.copy(lastObservedElapsed = nowElapsed, wasAccumulating = false)
      state = next
      return SessionUpdate(next, effects)
    }

    if (delta > 0L) {
      val sessionStart = !next.sessionActive
      next = next.copy(
        accumulatedMs = next.accumulatedMs + delta,
        sessionActive = true,
      )
      effects += SessionEffect.RecordUsage(packageName, delta, sessionStart)
    }

    // A snooze is an explicit "not yet". Do not immediately re-show the
    // reminder just because the accumulated session is still over threshold.
    val snoozeActive = next.snoozeUntilElapsed?.let { nowElapsed < it } == true
    if (!snoozeActive && next.accumulatedMs >= currentRules.thresholdMs) {
      next = showReminder(next, packageName, effects)
      next = next.copy(lastObservedElapsed = nowElapsed, wasAccumulating = false)
      state = next
      return SessionUpdate(next, effects)
    }

    next = next.copy(
      lastObservedElapsed = nowElapsed,
      wasAccumulating = true,
    )
    state = next
    return SessionUpdate(next, effects)
  }

  /** Called after the native overlay successfully appears. */
  fun onReminderShown(nowElapsed: Long): SessionUpdate {
    val next = state.copy(
      overlayMode = OverlayMode.REMINDER,
      lastObservedElapsed = nowElapsed,
      wasAccumulating = false,
    )
    state = next
    return SessionUpdate(next, emptyList())
  }

  /** Called after the native cooldown overlay successfully appears. */
  fun onCooldownShown(nowElapsed: Long): SessionUpdate {
    val next = state.copy(
      overlayMode = OverlayMode.COOLDOWN,
      lastObservedElapsed = nowElapsed,
      wasAccumulating = false,
    )
    state = next
    return SessionUpdate(next, emptyList())
  }

  fun onSnooze(nowElapsed: Long): SessionUpdate {
    if (state.overlayMode != OverlayMode.REMINDER) {
      return SessionUpdate(state, emptyList())
    }
    if (state.snoozesRemaining(currentRules.maxSnoozes) <= 0) {
      return SessionUpdate(state, emptyList())
    }

    val next = state.copy(
      overlayMode = null,
      snoozesUsed = (state.snoozesUsed + 1).coerceAtMost(currentRules.maxSnoozes),
      snoozeUntilElapsed = nowElapsed + currentRules.snoozeMs,
      pendingReminder = false,
      lastObservedElapsed = nowElapsed,
      wasAccumulating = false,
    )
    state = next
    return SessionUpdate(next, listOf(SessionEffect.HideOverlay))
  }

  /**
   * The user pressed Close app / Go home.
   *
   * During a reminder this starts the shared cooldown. During an existing
   * cooldown it only closes the overlay; the countdown never restarts.
   */
  fun onClose(nowWall: Long, foregroundPackage: String?): SessionUpdate {
    return when (state.overlayMode) {
      OverlayMode.REMINDER -> {
        val effects = mutableListOf<SessionEffect>(SessionEffect.HideOverlay)
        val next = startCooldown(state, nowWall, foregroundPackage, effects)
        state = next
        SessionUpdate(next, effects)
      }

      OverlayMode.COOLDOWN -> {
        val next = state.copy(overlayMode = null)
        state = next
        SessionUpdate(next, listOf(SessionEffect.HideOverlay))
      }

      null -> SessionUpdate(state, emptyList())
    }
  }

  /** The native window was removed outside the state machine (screen off). */
  fun onOverlayDismissed(nowElapsed: Long): SessionUpdate {
    if (state.overlayMode == null) {
      return SessionUpdate(state, emptyList())
    }
    val next = state.copy(
      overlayMode = null,
      lastObservedElapsed = nowElapsed,
      wasAccumulating = false,
    )
    state = next
    return SessionUpdate(next, emptyList())
  }

  /** A WindowManager failure must not leave the engine believing it is shown. */
  fun onOverlayFailed(nowElapsed: Long): SessionUpdate {
    val next = state.copy(
      overlayMode = null,
      lastObservedElapsed = nowElapsed,
      wasAccumulating = false,
    )
    state = next
    return SessionUpdate(next, emptyList())
  }

  fun updateRules(newRules: SessionRules, nowElapsed: Long): SessionUpdate {
    currentRules = newRules
    state = SessionState(lastObservedElapsed = nowElapsed)
    return SessionUpdate(state, emptyList())
  }

  fun reset(nowElapsed: Long): SessionUpdate {
    state = SessionState(lastObservedElapsed = nowElapsed)
    return SessionUpdate(state, emptyList())
  }

  /**
   * Restore a persisted state. A monotonic timestamp in the future means the
   * device rebooted; in that case the session and cooldown are discarded.
   * Overlay visibility is never restored because the window no longer exists.
   */
  fun restore(
    saved: SessionState,
    nowElapsed: Long,
    nowWall: Long,
  ): SessionUpdate {
    val rebooted = (saved.lastObservedElapsed ?: 0L) > nowElapsed
    if (rebooted) {
      state = SessionState(lastObservedElapsed = nowElapsed)
      return SessionUpdate(state, emptyList())
    }

    var next = saved.copy(
      overlayMode = null,
      wasAccumulating = false,
      lastObservedElapsed = nowElapsed,
    )

    if (next.cooldownUntilWall != null && nowWall >= next.cooldownUntilWall!!) {
      next = SessionState(lastObservedElapsed = nowElapsed)
    } else if (next.snoozeUntilElapsed != null && nowElapsed >= next.snoozeUntilElapsed!!) {
      next = next.copy(
        snoozeUntilElapsed = null,
        pendingReminder = next.cooldownUntilWall == null,
      )
    }

    state = next
    return SessionUpdate(next, emptyList())
  }

  private fun showReminder(
    current: SessionState,
    packageName: String,
    effects: MutableList<SessionEffect>,
  ): SessionState {
    effects += SessionEffect.ShowReminder(
      packageName = packageName,
      snoozesLeft = current.snoozesRemaining(currentRules.maxSnoozes),
      elapsedMs = current.accumulatedMs,
    )
    return current.copy(
      overlayMode = OverlayMode.REMINDER,
      pendingReminder = false,
      wasAccumulating = false,
    )
  }

  private fun startCooldown(
    current: SessionState,
    nowWall: Long,
    packageName: String?,
    effects: MutableList<SessionEffect>,
  ): SessionState {
    effects += SessionEffect.RecordCooldown(packageName)
    return current.copy(
      accumulatedMs = 0L,
      snoozesUsed = 0,
      snoozeUntilElapsed = null,
      cooldownUntilWall = nowWall + currentRules.cooldownMs,
      awaySinceElapsed = null,
      overlayMode = null,
      pendingReminder = false,
      wasAccumulating = false,
      sessionActive = false,
      lastPackage = packageName,
    )
  }
}
