# PauseLoop — Phase 1 Results

**Date:** 2026-11-08  
**Scope:** Full Phase 1 Reminder MVP (not the narrower tracking-only note in `docs/phase-1-onboarding.md`)  
**Status:** Implemented and locally verified. Physical-device validation remains pending because no Android device was attached.

---

## 1. What shipped

### User flow

- **Welcome** onboarding with privacy model, three-step explanation, and no-account messaging.
- **Choose apps** onboarding with search, suggested social/video apps first, all other launchable apps below, at least one required, and PauseLoop excluded.
- **Permissions** onboarding for Usage Access, Display over other apps, and Notifications, with per-permission explanation, system-settings buttons, resume re-checking, and optional battery guidance.
- **Dashboard** with monitoring status, session progress, selected-app count, permission health, start/stop, app picker and settings links, plus local-only privacy entry.
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
| Web smoke | `tests/web/serve.mjs`, `tests/web/smoke.mjs`, `tests/web/text-scale.mjs` |

### Design decisions and deviations

1. **SQLiteOpenHelper instead of Room.** The plan names Room, but the schema is two small tables and the MVP benefits from zero annotation processing/KSP. `LocalUsageStore` implements the same `daily_usage` and `daily_summary` fields, a versioned schema, and 90-day pruning.
2. **No `expo-dev-client`.** Phase 1 ships a standalone release. Removing the dev client, Reanimated, Gesture Handler, and Worklets reduced native surface and APK size. Debug work now uses a normal debug build or the web preview.
3. **Release is network-free.** `app.config.ts` blocks `INTERNET` unless an explicit development profile is set; the generated manifest was also verified to omit it.
4. **arm64-only release APK.** The local deliverable targets current physical Android phones and avoids four-ABI bulk. This is a deliverable choice, not a Play Store AAB requirement.
5. **Local release keystore.** The checked-in build config expects `android/app/pauseloop-release.keystore` (generated locally, ignored by git). It is a development signing identity only and must be replaced before Play upload.

---

## 3. Verification

### 3.1 Kotlin state-machine tests

Command:

```bat
cd android
build-check.bat :pauseloop-native:testDebugUnitTest --no-daemon
```

Result: **14/14 tests passed, BUILD SUCCESSFUL**.

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

```bat
typecheck.bat
```

Result: **exit 0, zero TypeScript errors**.

### 3.4 Web export

Command:

```bat
export-web.bat
```

Result: export succeeded; `dist/` generated with all route bundles.

### 3.5 Browser smoke matrix

Prerequisite (not bundled with the app):

```bash
npm install --no-save playwright
npx playwright install chromium
```

Command:

```bash
node tests/web/smoke.mjs
```

Result: **PASS 6/6** contexts — dark/light × 320/375/430 px. Covers onboarding, app selection, permissions, dashboard, monitoring start, settings, privacy, app list, navigation, console errors, and horizontal overflow.

### 3.6 200% text scaling matrix

Command:

```bash
node tests/web/text-scale.mjs
```

Result: **PASS 42/42** screen checks — 6 contexts × 7 screens at simulated 200% font size, with no horizontal overflow. Screenshots are written to `/tmp/pauseloop-web`.

### 3.7 Release APK audit

> Fill this section from the release build results below.

---

## 4. Release artifact

> Path, size, checksum, signing certificate, and manifest findings go here after the build.

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

```bash
npm install
npm run test:js
npm run typecheck
npm run export:web
node tests/web/serve.mjs
# in another shell
node tests/web/smoke.mjs
node tests/web/text-scale.mjs
```

Native tests and release build (Windows JDK 21):

```bat
cd android
build-check.bat :pauseloop-native:testDebugUnitTest --no-daemon
build-check.bat :app:assembleRelease --no-daemon
```

Local keystore generation (already done for this build):

```bat
cd android
gen-keystore.bat
```

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

3. In `android/app/build.gradle`, add a `release` signing config pointing at `pauseloop-release.keystore` and use it in `buildTypes.release`. Keep `shrinkResources`, `minifyEnabled`, and `crunchPngs` enabled.

4. Create the local keystore (replace the password/alias for any real distribution):

   ```bat
   keytool -genkeypair -v -storetype PKCS12 ^
     -keystore android\app\pauseloop-release.keystore ^
     -alias pauseloop -keyalg RSA -keysize 2048 -validity 10000 ^
     -storepass pauseloop-release -keypass pauseloop-release ^
     -dname "CN=PauseLoop Release, OU=Mobile, O=PauseLoop, L=Local, ST=Local, C=IN"
   ```

5. Confirm `android/app/src/main/AndroidManifest.xml` contains a `tools:node="remove"` entry for `android.permission.INTERNET` (and the other blocked permissions), then build:

   ```bat
   cd android
   build-check.bat :app:assembleRelease --no-daemon
   ```

The NDK must be complete. This machine initially had a truncated NDK 27.1 with a 22 MB sysroot and no `usr/lib`; reinstall it with `sdkmanager --install "ndk;27.1.12297006"` if CMake reports missing `crtbegin_dynamic.o`, `libm`, or `libc`.

---

## 8. Known limitations

- Physical-device and OEM validation pending (see above).
- Local release keystore/password are development-only and must be rotated for Play.
- SQLiteOpenHelper deviation from the plan's Room choice is intentional and documented above.
- The web build uses an in-memory mock; it validates layout and flows, not native monitoring.
- `INTERNET` is intentionally absent; the release build cannot load remote JS or send analytics.
