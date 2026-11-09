# PauseLoop — Phase 1 Results

> **Historical report.** Current HEAD may not contain the full implementation.  
> This document records the Phase 1 work at the time it was completed. Some commands and paths changed during the repository cleanup.

**Date:** 2026-11-08  
**Scope:** Full Phase 1 Reminder MVP  
**Status:** Implemented and locally verified. Physical-device validation remains pending because no Android device was attached.

---

## 1. What shipped

### User flow

- **Welcome** onboarding with privacy model, three-step explanation, and no-account messaging.
- **Choose apps** onboarding with search, suggested social/video apps first, all other launchable apps below, at least one required, and PauseLoop excluded.
- **Permissions** onboarding for Usage Access, Display over other apps, and Notifications, with per-permission explanation, system-settings buttons, resume re-checking, and optional battery guidance.
- **Dashboard** with monitoring status, session progress, selected-app count, permission health, start/stop, and a debug entry, plus a local-only privacy summary.
- **Settings** with 1–120 minute interval, suggestions toggle, local-insights toggle, permission health, privacy controls, and snooze/cooldown explanations.
- **Privacy & data** screen with local-only statement, storage controls, history summary, and clear-history action.
- **App picker** screen for editing the selected loop list after onboarding.
- **Debug screen** with service/overlay/foreground diagnostics, test reminder, and a debug-only 10-second threshold override. All debug triggers are rejected by release builds.

### Native engine

- Pure Kotlin `SessionEngine` with injectable elapsed/wall clocks.
- Cumulative session across all selected apps; switching apps does not reset.
- Monotonic elapsed time for accumulation, away gap, and snooze expiry.
- Wall-clock expiry for cooldown so it survives process death.
- Five-minute away gap resets the session and snooze count.
- Screen-off and lock stop accumulation immediately.
- Overlay time never accumulates.
- Reminder at threshold; two five-minute snoozes; third reminder has no snooze.
- Close/leave during reminder sends the user Home and starts a shared five-minute cooldown.
- Reopening any selected app during cooldown shows the countdown overlay immediately, with no snooze.
- Closing during cooldown does not shorten or restart it.
- Cooldown expiry starts a fresh session with two snoozes.
- Overlay auto-dismisses when leaving the selected app or turning the screen off.
- Permission revocation disables monitoring rather than pretending to protect the user.

### Android platform work

- Foreground `MonitoringService` polls approximately every two seconds.
- `ForegroundAppDetector` uses `UsageStatsManager.queryEvents` only.
- Native `WindowManager` overlay (not a React Native view) with safe-area handling, large tap targets, accessible labels, consumed Back, and no attempt to block Home.
- Generic privacy-safe foreground-service notification.
- `MonitoringPreferences` persists settings, session state, and debug threshold.
- `LocalUsageStore` stores only selected-app daily aggregates; 90-day retention.
- `BootReceiver` clears stale session state and restarts where Android permits.
- No Accessibility, MediaProjection, notification-listener, Device Admin, or `QUERY_ALL_PACKAGES`.
- Release build blocks `INTERNET` and other unused permissions.

---

## 2. Architecture and files

| Area | Main files |
|---|---|
| State machine | `modules/pauseloop-native/android/.../SessionEngine.kt` |
| Service orchestration | `.../MonitoringService.kt` |
| Native overlay | `.../ReminderOverlayView.kt`, `.../OverlayController.kt` |
| Persistence | `.../MonitoringPreferences.kt`, `.../LocalUsageStore.kt` |
| Permissions / apps | `.../PermissionHelper.kt`, `.../InstalledAppsRepository.kt` |
| Module bridge | `.../PauseLoopNativeModule.kt`, `.../SessionSnapshotProvider.kt`, `.../DebugStateProvider.kt` |
| Android manifest | `modules/pauseloop-native/android/src/main/AndroidManifest.xml` |
| TypeScript API | `modules/pauseloop-native/src/*` |
| Settings helpers | `src/lib/settings.ts` + `tests/js/settings.test.mjs` |
| UI | `src/app/onboarding/`, `src/app/index.tsx`, `apps.tsx`, `settings.tsx`, `privacy.tsx`, `debug.tsx` |
| Shared UI | `src/components/` |
| Hooks/state | `src/hooks/` |
| Web preview mock | `modules/pauseloop-native/src/PauseLoopNativeModule.web.ts`, `.../mock.ts` |

### Design decisions and deviations

1. **SQLiteOpenHelper instead of Room.** The plan names Room, but the schema is two small tables and the MVP benefits from zero annotation processing/KSP. `LocalUsageStore` implements the same `daily_usage` and `daily_summary` fields, a versioned schema, and 90-day pruning.
2. **No `expo-dev-client`.** Phase 1 ships a standalone release. The dev client was removed and the start scripts now use plain Expo commands. Reanimated, Gesture Handler, and Worklets remain only as optional Expo Router peers with no direct imports; they were restored because the cleanup verification gate failed on unrelated Expo SDK patch drift. Debug work uses a normal debug build or the web preview.
3. **Release is network-free.** `app.config.ts` blocks `INTERNET` when `EAS_BUILD_PROFILE=production`; preview and development builds keep it for Metro. The generated release manifest was also verified to omit it.
4. **arm64-only release APK.** The local deliverable targets current physical Android phones and avoids four-ABI bulk. This is a deliverable choice, not a Play Store AAB requirement.
5. **Local release keystore.** The generated native build config expects a local keystore (filename and password are chosen locally and are not committed). It is a development signing identity only and must be replaced before Play upload.

---

## 3. Verification

### 3.1 Kotlin state-machine tests

Command:

```bat
cd android
gradlew.bat :pauseloop-native:testDebugUnitTest --no-daemon --console=plain
```

Run this from the generated `android/` project in a Windows shell with JDK 21. Result: **14/14 tests passed, BUILD SUCCESSFUL**.

Coverage includes accumulation, app switching, away-gap reset, screen-off/lock, threshold reminder, exactly two snoozes, cooldown sharing, cooldown expiry, interval changes, overlay failure recovery, and reboot restore.

### 3.2 TypeScript helper tests

Command:

```bash
npm run test:js
```

Result: **11/11 tests passed**.

Coverage includes interval clamping, package normalization/deduplication/capping, onboarding completion, suggestions, search matching, duration/countdown formatting, progress bounds, and package-name humanization.

### 3.3 Typecheck

Command:

```bash
npm run typecheck
```

Result: **exit 0, zero TypeScript errors**.

### 3.4 Web export

Command:

```bash
npm run export:web
```

Result: export succeeded; `dist/` generated with all route bundles. This remains reproducible from the current tree.

### 3.5 Browser smoke matrix (historical)

**Not reproducible from current HEAD.** The Playwright web tests and helper scripts in `tests/web/` were deleted during repository cleanup, and Playwright is not a dependency.

Recorded result: **PASS 6/6** contexts — dark/light × 320/375/430 px. Covered onboarding, app selection, permissions, dashboard, monitoring start, settings, privacy, app list, navigation, console errors, and horizontal overflow.

### 3.6 200% text scaling matrix (historical)

**Not reproducible from current HEAD** for the same reason.

Recorded result: **PASS 42/42** screen checks — 6 contexts × 7 screens at simulated 200% font size, with no horizontal overflow. Screenshots were written to `/tmp/pauseloop-web`.

### 3.7 Release APK audit

Not recorded in this report. The release build was performed locally; its artifact details were not captured here and the artifact is not committed.

---

## 4. Release artifact

Not committed. The release APK, signing key, and ProGuard mapping were local-only build outputs. The generated `android/` project must be recreated with Expo prebuild before rebuilding.

---

## 5. Pending physical-device validation

No Android device was attached during this run (`adb devices` empty), so these Phase 1 acceptance criteria remain unverified on hardware:

- Real usage-event detection and overlay appearing within ~2 seconds.
- Notification permission and foreground-service notification appearance.
- Overlay over real apps and never over unselected apps/PauseLoop.
- Home transition, cooldown countdown, and reopening behavior.
- Screen-off/lock accumulation stop.
- Behavior after swiping PauseLoop from recents and after reboot.
- Permission revocation behavior.
- OnePlus 10 Pro cutout/gesture insets and battery consumption.
- Notification/overlay behavior under OEM battery optimization.

Suggested device runbook:

1. Install the APK with `adb install -r <apk>`.
2. Complete onboarding and grant all three permissions.
3. Enable the debug 10-second threshold, select a test app, start monitoring, and confirm the reminder within ~12 seconds.
4. Snooze twice and confirm the third reminder has no snooze.
5. Press Close app, confirm Home, reopen the app, and confirm the countdown overlay.
6. Lock the screen during a session and confirm time does not accumulate.
7. Revoke Usage Access and confirm monitoring disables with a clear message.
8. Swipe PauseLoop from recents while monitoring and confirm the service continues.
9. Reboot and confirm monitoring restores or reports the Android 12+ restriction.
10. Leave monitoring screen-on for one hour and record battery use.

---

## 6. Reproduce

Current checks:

```bash
npm install
npm run typecheck
npm run test:js
npm run export:web
```

The Playwright smoke and text-scale suites are no longer available; see §3.5–3.6.

Native tests and release build (Windows JDK 21, from the generated `android/` project):

```bat
cd android
gradlew.bat :pauseloop-native:testDebugUnitTest --no-daemon --console=plain
gradlew.bat :app:assembleRelease --no-daemon --console=plain
```

Local keystore generation is described in §7; the keystore and its password are not committed.

---

## 7. Local native project setup (generated folder)

The `android/` folder is intentionally gitignored and was generated with Expo prebuild. A fresh checkout must recreate and patch it before a local APK build:

1. Generate the native project:

   ```bash
   npx expo prebuild --platform android
   ```

2. In `android/gradle.properties`, set:

   ```properties
   reactNativeArchitectures=arm64-v8a
   android.enableMinifyInReleaseBuilds=true
   android.enableShrinkResourcesInReleaseBuilds=true
   expo.gif.enabled=false
   expo.webp.enabled=false
   ```

3. In `android/app/build.gradle`, add a `release` signing config pointing at your local keystore (for example, `release.keystore`) and use it in `buildTypes.release`. Keep `shrinkResources`, `minifyEnabled`, and `crunchPngs` enabled.

4. Create the local keystore (replace the placeholders for any real distribution):

   ```bat
   keytool -genkeypair -v -storetype PKCS12 ^
     -keystore android\app\release.keystore ^
     -alias pauseloop -keyalg RSA -keysize 2048 -validity 10000 ^
     -storepass <local-password> -keypass <local-password> ^
     -dname "CN=PauseLoop Release, OU=Mobile, O=PauseLoop, L=Local, ST=Local, C=IN"
   ```

5. Confirm `android/app/src/main/AndroidManifest.xml` contains a `tools:node="remove"` entry for `android.permission.INTERNET` (and the other blocked permissions), then build:

   ```bat
   cd android
   gradlew.bat :app:assembleRelease --no-daemon --console=plain
   ```

The NDK must be complete. This machine initially had a truncated NDK 27.1 with a 22 MB sysroot and no `usr/lib`; reinstall it with `sdkmanager --install "ndk;27.1.12297006"` if CMake reports missing `crtbegin_dynamic.o`, `libm`, or `libc`.

---

## 8. Known limitations

- Physical-device and OEM validation pending (see above).
- Local release keystore/password are development-only and must be rotated for Play.
- SQLiteOpenHelper deviation from the plan's Room choice is intentional and documented above.
- The web build uses an in-memory mock; it validates layout and flows, not native monitoring.
- `INTERNET` is intentionally absent; the release build cannot load remote JS or send analytics.
- The Playwright web tests were removed during cleanup; only the TypeScript helper tests remain.
- The dashboard still carries some Phase 0 labels, and the app picker/settings routes are not linked from it.
- `npx expo-doctor` reports SDK patch-version drift; the installed packages are older than the latest SDK 58 patches.
