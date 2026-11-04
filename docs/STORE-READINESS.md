# Store readiness

What is ready for the Play Store and the App Store, what is not, and the exact
answers the listing forms need. Everything here was checked against the repo, not
remembered.

Status legend: **ready** (done and verified here), **prepared** (text or config
exists, the human action remains), **blocked** (needs credentials or an account
that does not exist).

## Shared identity

| Item | Value | Where |
| --- | --- | --- |
| App id | `fit.twoplus.app` | `capacitor.config.ts`, `android/app/build.gradle` (`applicationId`), `ios/App/App.xcodeproj` (`PRODUCT_BUNDLE_IDENTIFIER`) |
| Display name | TwoPlus | `android/app/src/main/res/values/strings.xml`, `CFBundleDisplayName` |
| Version | `1.0.0` in `package.json`; Android `versionCode 1` / `versionName "1.0.0"`; iOS `CURRENT_PROJECT_VERSION 1` / `MARKETING_VERSION "1.0.0"` | - |
| Icon 1024 px | present | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` (1024x1024), Android mipmaps present |
| Web assets | `dist/` synced into both native projects by `npx cap sync` | `.github/workflows/android.yml`, `ios.yml` |

**Version numbering at submission:** all three now say `1.0.0`. Stores compare
the native values, so bump them together when you cut a release, and raise
`versionCode` / `CURRENT_PROJECT_VERSION` by one on every upload.

## Permissions and declarations

Verified in this repo:

- **Android permissions:** exactly one, `android.permission.INTERNET`. No camera,
  location, microphone, contacts, storage, or notification permission is
  declared.
- **iOS:** no `NS*UsageDescription` key is present. The app does not request
  camera, location, microphone, or tracking access.
- **Tracking:** no analytics, crash-reporting, attribution, or advertising SDK is
  in `dependencies`. Nothing links an advertising identifier.
- **Progress photos:** chosen through the system file picker
  (`<input type="file" accept="image/*">` in `src/pages/member-extras.tsx`), then
  uploaded to Supabase Storage into a private bucket. They are not read from the
  photo library in place.

**Gap to check at review time:** if App Store review decides that selecting a
photo through the web file input counts as photo-library access, iOS needs
`NSPhotoLibraryUsageDescription` in `Info.plist`. It is absent today because the
picker is the system one and the app never enumerates the library. Add the key
with a plain explanation if a build is rejected for it, rather than guessing now.

## Data safety / privacy nutrition label

These are the real answers, derived from the schema (`supabase/migrations/`) and
`src/lib/member-api.ts`:

| Category | Collected | Purpose | Linked to identity | Optional |
| --- | --- | --- | --- | --- |
| Email address | yes (staff and member accounts) | account, sign-in | yes | no |
| Name | yes | member record, receipts | yes | no |
| Phone number | yes | member record, contact | yes | no |
| Date of birth | yes, nullable | member record | yes | yes |
| Gender | yes, nullable | member record | yes | yes |
| Address | yes, nullable | member record | yes | yes |
| Emergency contact name and phone | yes, nullable | safety | yes | yes |
| Photos | progress photos, optional | fitness tracking | yes | yes |
| Body measurements | optional | fitness tracking | yes | yes |
| Payment records | yes (amounts recorded by gym staff; no card data) | billing history | yes | no |
| Health and fitness data | workout logs, diet plans, measurements | the product itself | yes | yes |

Not collected: location, contacts, browsing history, advertising identifier,
device fingerprint. Nothing is used for tracking across apps or websites, so the
"used to track you" answer is **no**. Data is encrypted in transit (HTTPS only;
the Android shell blocks mixed content). There is no data broker or ad network.

Deletion: a member can request deletion in the app (Phase 18 flow); the gym owner
or the operator actions it. Account deletion removes the auth account and the
member record, subject to the retention notes in `docs/PRIVACY-AND-RETENTION.md`.

## Assets

| Asset | Status | Note |
| --- | --- | --- |
| App icon 1024 | ready | same mark as the desktop ICO, generated from `public/favicon.svg` |
| Feature graphic (1024x500) | blocked | not produced; needs a design decision |
| Phone screenshots | prepared | `screenshots/board-390-*.png` are real captures at 390x844 of the workspace. Play Store needs a phone set and a separate tablet set; App Store needs 1290x2796 and 1242x2688 |
| Member-app screenshots | prepared | `scripts/storeshots.mjs` captures the member app at the four sizes the stores demand (1080x1920, 1600x2560, 1290x2796, 1242x2688). It needs an account linked to a member record; run against one and it writes `screenshots/store/`. The signed-in test account is not linked, so it refuses to shoot the claim prompt instead of shipping that as a listing image |
| Store description | prepared | see below |
| Privacy policy URL | prepared | `/privacy` exists in the app; a public URL is required and the copy still needs counsel review |

Draft short description (80 characters, Play Store limit):

> Run your gym: members, plans, payments, attendance, and a member app.

Draft full description:

> TwoPlus is the workspace a gym runs on. Keep every member and their plan in one
> place, record payments and dues, check people in at the door, schedule classes
> and trainers, log workouts and measurements, and give members their own app for
> their plan, their training history and their progress.
>
> Built for one gym or many. Each gym's data is isolated in the database, not just
> in the interface.

## Submission checklist

Ready:

- [x] App id, name, icon, and version consistent across web, Android, and iOS
- [x] Minimum permissions (internet only)
- [x] No tracking SDKs, so the tracking declaration is a clean "no"
- [x] Data-safety answers derived from the actual schema
- [x] CI builds an APK and an iOS simulator build on every push, so a native
      regression is caught before submission
- [x] Host builds a signed Android APK and AAB from a keystore kept outside the
      repo (`android/keystore.properties`, gitignored). Both artifacts sit in
      `release/mobile/` with checksums; certificate `CN=TwoPlus`

Prepared, human action required:

- [ ] Add the existing keystore and its passwords to the repository secrets
      (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) and
      switch the Gradle job from `assembleDebug` to `bundleRelease`, so CI
      publishes the same signed build this host produces
- [ ] Apple Developer Program membership, distribution certificate, provisioning
      profile, and an archive uploaded through Xcode or Transporter
- [ ] Run `node scripts/storeshots.mjs` against a login linked to a member
      record, then capture the tablet set of the workspace
- [ ] Produce a 1024x500 feature graphic
- [ ] Publish the privacy policy at a stable public URL and put it in both
      listings
- [ ] Create the Play Console and App Store Connect records

Blocked, and why:

- **Store accounts** do not exist. Creating them costs money and binds the owner
  legally, so it is not something this repo can or should do.
- **The Android signing key** exists but lives outside the repo
  (`D:\TwoPlus\keys\twoplus-release.jks`) and must stay out of git. Its passwords
  are held by the owner, so only this host can produce a signed build until they
  are added to CI secrets.
- **Submission itself** needs the owner's explicit authorization. Publishing
  under someone else's developer account is an agreement, not a build step.

## What this phase did not do

A signed Android APK and AAB were produced here and no store has accepted either.
JDK 21 and Android SDK 36 built them from the project keystore:

| Artifact | Path | Size | SHA-256 |
| --- | --- | --- | --- |
| APK | `release/mobile/TwoPlus-1.0-android.apk` | 3,994,559 B | `F708EB2F…20B9981` |
| AAB | `release/mobile/TwoPlus-1.0-android.aab` | 3,852,217 B | `A48198B4…D749F17` |

`apksigner verify --print-certs` reports signer `CN=TwoPlus, O=TwoPlus, C=IN`
(fingerprint `4e:08:dc:00:…:d7`); `aapt2 dump badging` reports `fit.twoplus.app`,
versionCode 1, versionName `1.0.0`, minSdk 24, targetSdk 36, `INTERNET` as the only
permission. Nothing
was installed on a physical device: `adb devices` is empty, so the APK is verified
as a signed package, not as a working install.

Remaining gaps: an IPA needs macOS with Xcode, and both listings need the Play
Console and App Store Connect records plus the owner's authorization to submit.
`docs/BUILDING.md` records the exact commands.
