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

Requires JDK 21 and the Android SDK (set `ANDROID_HOME`). Neither ships with a plain
Windows dev box, so install both first; CI does this automatically.

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK lands in `android/app/build/outputs/apk/debug/`. This sequence was executed
on Windows with JDK 21 (Adoptium 21.0.13.9) and Android SDK 36 / build-tools 36.0.0,
and produced a 5,038,783-byte debug APK. `android/local.properties` holds the SDK
path and is gitignored.

**Release build.** A keystore exists for this project and lives *outside* the repo,
at `D:\TwoPlus\keys\twoplus-release.jks` (alias `twoplus`, RSA 4096, CN=TwoPlus).
Its password is not written down anywhere in the repository, by design. Losing it
means the Play Console can never accept an update under the same app id, so back it
up somewhere durable before the first upload.

`android/keystore.properties` points Gradle at it and is gitignored:

```properties
storeFile=D:/TwoPlus/keys/twoplus-release.jks
storePassword=…
keyAlias=twoplus
keyPassword=…
```

`android/app/build.gradle` reads that file only if it exists, so a clone without it
still assembles, just unsigned. With it present:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease   # -> app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease     # -> app/build/outputs/bundle/release/app-release.aab
```

Both were run on this host (JDK 21, Android SDK 36): APK 3,994,291 bytes, AAB
3,851,921 bytes, certificate `CN=TwoPlus`, package `fit.twoplus.app`, versionCode 1,
targetSdk 36, `INTERNET` as the only permission. Copies sit in `release/mobile/`.
`apksigner verify --print-certs` needs `JAVA_HOME` on `PATH` or it fails with
"JAVA_HOME is not set".

CI (`.github/workflows/android.yml`) still produces an unsigned debug APK on every
push, because the keystore is not in the repository and should not be. To have CI
sign, add the keystore and its passwords as repository secrets and switch the job to
`bundleRelease`; that is a publishing decision, not a build step.

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

## Windows desktop

Electron, not Tauri: Tauri needs a Rust toolchain, and this machine has none.

```bash
npm run desktop          # build, then run the shell
npm run desktop:smoke    # build, then check the shell mounts and routes
npm run desktop:package  # build, render the icon, emit release/TwoPlus-win32-x64/
```

`electron/main.js` serves `dist/` over a custom `app://bundle` origin. That is
deliberate: the renderer uses `BrowserRouter`, and a `file://` origin breaks
history routing and gives every route an opaque origin, which kills
`localStorage`. A registered standard, secure scheme keeps both working, so
`/app/overview/overview` loads and refreshes like it does on the web.

The shell is hardened the way the web build is: `contextIsolation` on,
`nodeIntegration` off, `sandbox` on, a single-instance lock, no preload script,
and the same CSP as `vercel.json` applied to the packaged HTML. Navigation away
from the app opens in the system browser instead. `--smoke-check` loads `/`,
then a deep link, and exits non-zero if either fails to mount, which is what CI
and a release check should run.

`npm run desktop:package` writes `release/` (git-ignored) containing
`TwoPlus.exe` plus its Electron runtime, with `build/icon.ico` generated from
`public/favicon.svg` by `scripts/make-icon.mjs`. Only `dist/`, `electron/`, and
`package.json` are packed, so the archive is about 2 MB rather than the 87 MB it
was when the whole repo (including `.env.local`) rode along.

**Not wired:** code signing and an installer. An unsigned `.exe` trips
SmartScreen for end users, and a real installer (Squirrel or NSIS) plus a
signing certificate are owner-held decisions. Distribution is currently a
folder you copy.

## What is deliberately not wired

- Code signing for Apple and Windows: no certificate exists, and none should be
  committed. The Android keystore does exist, outside the repo (see Android above).
- Store metadata, screenshots, and submission: owner authorization required.
- A Windows installer and auto-update: owner decision, needs a signing cert.
