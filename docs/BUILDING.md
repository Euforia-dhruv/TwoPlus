# Building TwoPlus

Three surfaces ship from one codebase: the browser app, an Android shell, and an
iOS shell. The last two are Capacitor wrappers around the same `dist/` bundle, so
there is no second implementation to keep in sync.

## Web

```bash
npm ci
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build -> dist/
npm run preview  # serves dist/ locally
```

`npm run build` is the gate that matters: it type-checks the whole project before
Vite touches it, so a broken type never reaches `dist/`.

## Android

Requires JDK 21 and the Android SDK (set `ANDROID_HOME`). Neither is present on a
plain Windows dev box, which is why CI does this build.

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK lands in `android/app/build/outputs/apk/debug/`.

**Release build:** needs a keystore you generate and keep. Never commit it.

```bash
keytool -genkey -v -keystore twoplus-release.keystore \
  -alias twoplus -keyalg RSA -keysize 2048 -validity 10000
```

CI (`.github/workflows/android.yml`) produces an unsigned debug APK on every push
to master. A signed `.aab` for Play Console additionally needs the keystore and
its passwords as repository secrets, plus the owner's decision to publish.

## iOS

Requires macOS with Xcode. Xcode does not run on Windows or Linux, so this build
is CI-only (`.github/workflows/ios.yml`, `macos-latest`).

```bash
npm run build
npx cap sync ios
cd ios/App && xcodebuild -project App.xcodeproj -scheme App \
  -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

**Release:** an `.ipa` for TestFlight or the App Store needs an Apple Developer
Program membership, a distribution certificate, and a provisioning profile. All
three are owner-held credentials.

## Native configuration

`capacitor.config.ts` holds the app id (`fit.twoplus.app`), display name, and
`webDir: "dist"`. It deliberately has no `server.url`: a committed dev-server URL
would make a release build load code from a laptop.

Mixed content is off. The app only ever talks to Supabase over HTTPS.

## What is deliberately not wired

- Code signing (Android keystore, Apple certificate): no keys exist, and none
  should be committed.
- Store metadata, screenshots, and submission: owner authorization required.
- A desktop `.exe`: see Phase 9 in `MISSION.md`.
