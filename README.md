# PauseLoop

**Break the loop. Take the pause.**

PauseLoop is an Android-only digital-wellbeing app. After a stretch of scrolling in a selected app, it covers the screen with a calm, native reminder. You can close the app and go Home, or snooze twice. It is friction, not parental control: no account, no cloud, no screen capture, no Accessibility service.

**Current status:** Phase 0 — scaffold and native feasibility. The app, native module, debug harness, and preview build are implemented. Static checks pass. The EAS development build and the OnePlus test matrix are the remaining gate items; see [docs/phase-0-results.md](./docs/phase-0-results.md).

---

## What works in Phase 0

- **Expo SDK 58 + TypeScript + Expo Router** with a typed native bridge.
- **Permission health** for Usage Access, Display over other apps, notifications, and battery optimization, with deep links to the exact Android settings screens.
- **Native full-screen reminder** drawn with Android `WindowManager` views. It consumes Back, stays out of the way of Home/notifications, handles insets/cutouts, and uses the Manrope brand fonts.
- **Foreground monitoring service** with a quiet ongoing notification, `specialUse` foreground-service type, polling, screen/keyguard handling, and boot restore where Android permits it.
- **Launcher app discovery** with a scoped `<queries>` intent, lazy icon loading, sorting, and no `QUERY_ALL_PACKAGES`.
- **Still-supported preview mode** on web/Expo Go. Permission and monitoring behavior is simulated and clearly labeled, so the UI can be reviewed without a native build.
- **Debug diagnostics** with permission state, service state, foreground package/activity, and the YouTube `UsageEvents` spike log.

Phase 1 onboarding does **not** start until the Phase 0 gate passes.

---

## Requirements

- Node.js 20+ and npm.
- For real Android testing: an EAS account and the OnePlus 10 Pro running Android 16.
- For local native compilation only: Android Studio / Android SDK and `adb`. Not required for the EAS workflow.

The project deliberately has no `android/` or `ios/` directory. Expo Continuous Native Generation builds them during the EAS build. Do not commit generated native folders.

---

## Local checks and preview

```bash
npm install
npm run typecheck
npm run lint
npm run export:web
npm run web
```

`npm run web` opens the preview at the Expo dev server URL. Native permissions, the overlay, and the foreground service are simulated there and labeled **Preview mode**. The full-screen React Native reminder preview is available from the home screen after starting simulated monitoring.

Useful scripts:

| Command | Purpose |
|---|---|
| `npm run start` | Start Metro for the installed development build |
| `npm run android` | Start Metro and try to open Android (needs `adb`) |
| `npm run web` | Web preview / UI review |
| `npm run typecheck` | Strict TypeScript check |
| `npm run lint` | Expo ESLint config |
| `npm run export:web` | Static web export in `dist/` |

---

## EAS development build

The native Kotlin module must be compiled into an APK. Expo Go cannot load it.

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # creates the EAS project; commit extra.eas.projectId
npx eas-cli@latest build -p android --profile development
```

Install the APK on the phone, then connect it to Metro from WSL:

```bash
npx expo start --dev-client --tunnel
```

- Use `--tunnel` for WSL2. It works regardless of LAN/firewall settings.
- Native Kotlin changes require another EAS build. Batch them.
- The development build keeps `INTERNET` for Metro. The `production` profile blocks `android.permission.INTERNET` via `app.config.ts`; all profiles also block unused storage and `VIBRATE` permissions.
- `autoIncrement` keeps version codes moving so reinstalls update rather than fail.

The full build/install runbook, OnePlus battery guidance, and troubleshooting table are in [docs/PAUSELOOP-HANDOFF.md](./docs/PAUSELOOP-HANDOFF.md), sections 13–14.

---

## Project layout

```text
PauseLoop/
  src/app/                 # Expo Router screens (index, debug)
  src/components/          # Theme-aware UI primitives and reminder preview
  src/hooks/               # Permissions, monitoring, diagnostics, app icons
  src/lib/                 # Native bridge wrapper and formatting helpers
  src/theme/               # Dark-first tokens, light theme, typography
  modules/pauseloop-native # Local Expo module (TypeScript + Kotlin)
    android/               # Manifest, foreground service, overlay, DI helpers
    src/                   # Typed bridge, web mock, shared types
  assets/images/           # Custom brand icon, adaptive icon, splash, favicon
  docs/                    # Handoff snapshot and Phase 0 results template
  app.config.ts            # Dynamic Expo config (production permission policy)
  eas.json                 # development / preview / production profiles
```

Theme tokens are in `src/theme/index.tsx`. Brand assets were generated for PauseLoop and replace the Expo template assets. Manrope is bundled for the React Native UI and the native overlay.

---

## Privacy boundaries

PauseLoop is designed to work entirely on-device:

- Reads **package and activity metadata only** through Usage Access.
- Never reads messages, titles, URLs, screen contents, or Accessibility input.
- Does **not** request `QUERY_ALL_PACKAGES`, Accessibility, or screen capture.
- Production builds ship without the Internet permission, and no profile requests storage or vibration permissions.
- No analytics, ads, crash-reporting SDKs, accounts, or backend in Phase 0.
- Usage history is not persisted in Phase 0; only `monitoringEnabled` is stored in `SharedPreferences`.

The Play Console will still require declarations for Usage Access, Display over other apps, and the `specialUse` foreground service before release. Those are documented in the handoff.

---

## Documentation

- [Phase 0 results and device test template](./docs/phase-0-results.md) — fill this in after the EAS build.
- [Implementation handoff](./docs/PAUSELOOP-HANDOFF.md) — authoritative Phase 0 scope, native details, test matrix, and gate.
- [Manrope OFL license](./docs/licenses/Manrope-OFL.txt)

---

## Phase 0 gate

Do not begin Phase 1 UI until all of the following are true on the real device:

- Development build installs and launches.
- Usage Access grants and is detected.
- The native test overlay appears over another app and behaves correctly.
- The foreground service survives backgrounding and has a visible, quiet notification.
- Launcher apps load without `QUERY_ALL_PACKAGES`.
- No Accessibility or screen-capture permission is present.
- The YouTube home/watch/Shorts activity spike is recorded with a fallback decision.
- `docs/phase-0-results.md` records pass/fail and any deviations.

The next action is to run the EAS development build, install it on the OnePlus, and complete the test matrix.
