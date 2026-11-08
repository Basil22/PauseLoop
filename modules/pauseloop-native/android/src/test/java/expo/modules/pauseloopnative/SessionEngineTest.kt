package expo.modules.pauseloopnative

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionEngineTest {
  private val selected = setOf("com.example.a", "com.example.b")
  private val other = "com.example.other"

  private fun engine(thresholdMs: Long = 60_000L) =
    SessionEngine(SessionRules(thresholdMs = thresholdMs))

  private fun poll(
    engine: SessionEngine,
    elapsed: Long,
    wall: Long = elapsed,
    packageName: String? = "com.example.a",
    screenInteractive: Boolean = true,
    locked: Boolean = false,
  ): List<SessionEffect> {
    return engine.poll(
      nowElapsed = elapsed,
      nowWall = wall,
      foregroundPackage = packageName,
      selectedPackages = selected,
      screenInteractive = screenInteractive,
      locked = locked,
    ).effects
  }

  private fun reachReminder(engine: SessionEngine): List<SessionEffect> {
    poll(engine, 0)
    poll(engine, 2_000)
    poll(engine, 4_000)
    poll(engine, 6_000)
    poll(engine, 8_000)
    return poll(engine, 10_000)
  }

  @Test
  fun accumulatesOnlyWhileSelectedAppIsInteractive() {
    val engine = engine()
    poll(engine, 0)
    poll(engine, 2_000)
    val usage = poll(engine, 4_000)

    assertEquals(4_000L, engine.state.accumulatedMs)
    assertEquals("com.example.a", usage.filterIsInstance<SessionEffect.RecordUsage>().single().packageName)

    poll(engine, 6_000, packageName = other)
    poll(engine, 8_000, screenInteractive = false)
    poll(engine, 10_000, screenInteractive = false)

    assertEquals(4_000L, engine.state.accumulatedMs)
    assertFalse(engine.state.wasAccumulating)
  }

  @Test
  fun switchingBetweenSelectedAppsContinuesTheSameSession() {
    val engine = engine()
    poll(engine, 0)
    poll(engine, 2_000)
    val switch = poll(engine, 4_000, packageName = "com.example.b")

    assertEquals(4_000L, engine.state.accumulatedMs)
    assertEquals("com.example.b", switch.filterIsInstance<SessionEffect.RecordUsage>().single().packageName)
    assertEquals(1, switch.filterIsInstance<SessionEffect.RecordUsage>().size)

    poll(engine, 6_000, packageName = "com.example.a")
    assertEquals(6_000L, engine.state.accumulatedMs)
  }

  @Test
  fun fiveContinuousMinutesAwayResetsTheSessionAndSnoozes() {
    val engine = engine()
    poll(engine, 0)
    poll(engine, 2_000)
    poll(engine, 4_000)
    assertEquals(4_000L, engine.state.accumulatedMs)

    poll(engine, 6_000, packageName = other)
    poll(engine, 6_000 + 299_000, packageName = other)
    assertEquals(4_000L, engine.state.accumulatedMs)

    poll(engine, 6_000 + 300_000, packageName = other)
    assertEquals(0L, engine.state.accumulatedMs)
    assertEquals(0, engine.state.snoozesUsed)
    assertFalse(engine.state.sessionActive)
  }

  @Test
  fun aLongDelayedPollIsClampedInsteadOfCountingServiceDowntime() {
    val engine = engine()
    poll(engine, 0)
    poll(engine, 2_000)
    poll(engine, 62_000)

    assertEquals(12_000L, engine.state.accumulatedMs)
  }

  @Test
  fun thresholdShowsOneReminderAndOverlayPausesAccumulation() {
    val engine = engine(thresholdMs = 10_000)
    val effects = reachReminder(engine)

    val reminder = effects.filterIsInstance<SessionEffect.ShowReminder>().single()
    assertEquals("com.example.a", reminder.packageName)
    assertEquals(2, reminder.snoozesLeft)
    assertEquals(10_000L, reminder.elapsedMs)
    assertEquals(OverlayMode.REMINDER, engine.state.overlayMode)

    val after = poll(engine, 14_000)
    assertTrue(after.none { it is SessionEffect.RecordUsage })
    assertEquals(10_000L, engine.state.accumulatedMs)
  }

  @Test
  fun snoozeHidesForFiveMinutesThenRearmsWithOneLeft() {
    val engine = engine(thresholdMs = 10_000)
    reachReminder(engine)

    engine.onSnooze(12_000)
    assertEquals(1, engine.state.snoozesUsed)
    assertEquals(312_000L, engine.state.snoozeUntilElapsed)

    val duringSnooze = poll(engine, 14_000)
    assertTrue(duringSnooze.none { it is SessionEffect.ShowReminder })
    assertNull(engine.state.overlayMode)

    val second = poll(engine, 312_000)
    val reminder = second.filterIsInstance<SessionEffect.ShowReminder>().single()
    assertEquals(1, reminder.snoozesLeft)

    engine.onSnooze(312_000)
    assertEquals(2, engine.state.snoozesUsed)
    assertEquals(612_000L, engine.state.snoozeUntilElapsed)

    val third = poll(engine, 612_000)
    assertEquals(0, third.filterIsInstance<SessionEffect.ShowReminder>().single().snoozesLeft)

    val noMoreSnooze = engine.onSnooze(612_000)
    assertTrue(noMoreSnooze.effects.isEmpty())
    assertEquals(2, engine.state.snoozesUsed)
    assertEquals(OverlayMode.REMINDER, engine.state.overlayMode)
  }

  @Test
  fun closeStartsSharedCooldownAndReopeningAnySelectedAppShowsCountdown() {
    val engine = engine(thresholdMs = 10_000)
    reachReminder(engine)

    val close = engine.onClose(nowWall = 100_000, foregroundPackage = "com.example.a")
    assertTrue(close.effects.any { it is SessionEffect.HideOverlay })
    assertTrue(close.effects.any { it is SessionEffect.RecordCooldown })
    assertEquals(400_000L, engine.state.cooldownUntilWall)
    assertEquals(0L, engine.state.accumulatedMs)
    assertEquals(0, engine.state.snoozesUsed)
    assertNull(engine.state.overlayMode)

    val reopened = poll(
      engine,
      elapsed = 614_000,
      wall = 101_000,
      packageName = "com.example.b",
    )
    val cooldown = reopened.filterIsInstance<SessionEffect.ShowCooldown>().single()
    assertEquals("com.example.b", cooldown.packageName)
    assertEquals(299_000L, cooldown.remainingMs)
    assertEquals(OverlayMode.COOLDOWN, engine.state.overlayMode)

    val stillOpen = poll(
      engine,
      elapsed = 616_000,
      wall = 103_000,
      packageName = "com.example.b",
    )
    assertEquals(
      297_000L,
      stillOpen.filterIsInstance<SessionEffect.UpdateCooldown>().single().remainingMs,
    )
  }

  @Test
  fun closingCooldownDoesNotShortenTheSharedWait() {
    val engine = engine(thresholdMs = 10_000)
    reachReminder(engine)
    engine.onClose(nowWall = 100_000, foregroundPackage = "com.example.a")
    poll(engine, 614_000, wall = 101_000)

    val dismiss = engine.onClose(nowWall = 102_000, foregroundPackage = "com.example.a")
    assertTrue(dismiss.effects.any { it is SessionEffect.HideOverlay })
    assertEquals(400_000L, engine.state.cooldownUntilWall)

    poll(engine, 620_000, wall = 105_000, packageName = other)
    assertNull(engine.state.overlayMode)
    assertEquals(400_000L, engine.state.cooldownUntilWall)

    val reopen = poll(engine, 622_000, wall = 108_000)
    assertTrue(reopen.any { it is SessionEffect.ShowCooldown })
  }

  @Test
  fun cooldownExpiryStartsARealFreshSession() {
    val engine = engine(thresholdMs = 10_000)
    reachReminder(engine)
    engine.onClose(nowWall = 100_000, foregroundPackage = "com.example.a")

    val after = poll(engine, 900_000, wall = 400_000, packageName = "com.example.a")
    assertTrue(after.none { it is SessionEffect.ShowCooldown })
    assertNull(engine.state.cooldownUntilWall)
    assertEquals(0L, engine.state.accumulatedMs)
    assertEquals(0, engine.state.snoozesUsed)
    assertFalse(engine.state.sessionActive)

    poll(engine, 902_000, wall = 402_000)
    assertEquals(2_000L, engine.state.accumulatedMs)
  }

  @Test
  fun leavingTheAppDuringAReminderStartsCooldownButLockingOnlyHidesIt() {
    val leaving = engine(thresholdMs = 10_000)
    reachReminder(leaving)
    val leaveEffects = poll(leaving, 14_000, packageName = other)
    assertTrue(leaveEffects.any { it is SessionEffect.HideOverlay })
    assertTrue(leaveEffects.any { it is SessionEffect.RecordCooldown })
    assertEquals(300_000L, leaving.state.cooldownUntilWall!! - 14_000L)

    val locking = engine(thresholdMs = 10_000)
    reachReminder(locking)
    val lockEffects = poll(locking, 14_000, screenInteractive = false)
    assertTrue(lockEffects.any { it is SessionEffect.HideOverlay })
    assertNull(locking.state.cooldownUntilWall)
    assertNull(locking.state.overlayMode)
  }

  @Test
  fun snoozeExpiringWhileAwayArmsAReminderForReturn() {
    val engine = engine(thresholdMs = 10_000)
    reachReminder(engine)
    engine.onSnooze(12_000)

    poll(engine, 30_000, packageName = other)
    val expired = poll(engine, 312_000, packageName = other)

    assertTrue(expired.isEmpty())
    assertTrue(engine.state.pendingReminder)
    assertNull(engine.state.snoozeUntilElapsed)

    val returned = poll(engine, 314_000)
    assertEquals(1, returned.filterIsInstance<SessionEffect.ShowReminder>().single().snoozesLeft)
    assertFalse(engine.state.pendingReminder)
  }

  @Test
  fun restoreDropsSessionsAfterRebootAndExpiredCooldowns() {
    val rebooted = engine()
    rebooted.restore(
      SessionState(
        accumulatedMs = 8_000,
        lastObservedElapsed = 50_000,
        cooldownUntilWall = 999_999,
      ),
      nowElapsed = 10_000,
      nowWall = 20_000,
    )
    assertEquals(0L, rebooted.state.accumulatedMs)
    assertNull(rebooted.state.cooldownUntilWall)

    val restored = engine()
    restored.restore(
      SessionState(
        accumulatedMs = 8_000,
        lastObservedElapsed = 10_000,
        cooldownUntilWall = 100_000,
      ),
      nowElapsed = 20_000,
      nowWall = 30_000,
    )
    assertEquals(8_000L, restored.state.accumulatedMs)
    assertEquals(100_000L, restored.state.cooldownUntilWall)
    assertNull(restored.state.overlayMode)
    assertFalse(restored.state.wasAccumulating)

    val expired = engine()
    expired.restore(
      SessionState(
        accumulatedMs = 8_000,
        lastObservedElapsed = 10_000,
        cooldownUntilWall = 25_000,
      ),
      nowElapsed = 20_000,
      nowWall = 30_000,
    )
    assertEquals(0L, expired.state.accumulatedMs)
    assertNull(expired.state.cooldownUntilWall)
  }

  @Test
  fun changingTheIntervalStartsAFreshSession() {
    val engine = engine()
    poll(engine, 0)
    poll(engine, 2_000)
    poll(engine, 4_000)
    assertEquals(4_000L, engine.state.accumulatedMs)

    engine.updateRules(SessionRules(thresholdMs = 15 * 60_000L), nowElapsed = 6_000)
    assertEquals(0L, engine.state.accumulatedMs)
    assertEquals(0, engine.state.snoozesUsed)
    assertEquals(900_000L, engine.rules.thresholdMs)
  }

  @Test
  fun overlayFailureClearsTheBeliefThatTheOverlayIsVisible() {
    val engine = engine(thresholdMs = 10_000)
    reachReminder(engine)
    assertEquals(OverlayMode.REMINDER, engine.state.overlayMode)

    engine.onOverlayFailed(13_000)
    assertNull(engine.state.overlayMode)
    assertFalse(engine.state.wasAccumulating)
  }
}
