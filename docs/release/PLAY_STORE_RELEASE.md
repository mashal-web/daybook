# Daybook — Google Play release preparation

## Release workflow
The repository includes a manual **Daybook Play Store AAB (signed release)** workflow. It creates a signed Android App Bundle for Play Console; it does not publish automatically.

1. Create a dedicated Android **upload key** using Android Studio/keytool. Keep the keystore and passwords private and make a secure offline backup.
2. Generate the upload key (example): `keytool -genkeypair -v -keystore daybook-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias daybook-upload`. Back up this file and password securely. Base64-encode it on a trusted computer (Linux: `base64 -w 0 daybook-upload.jks`; macOS: `base64 daybook-upload.jks`). Never commit the keystore or passwords.
3. In GitHub → Settings → Secrets and variables → Actions, add:
   - `DAYBOOK_UPLOAD_KEYSTORE_BASE64`
   - `DAYBOOK_UPLOAD_KEYSTORE_PASSWORD`
   - `DAYBOOK_UPLOAD_KEY_ALIAS`
   - `DAYBOOK_UPLOAD_KEY_PASSWORD`
4. Run Actions → Daybook Play Store AAB (signed release) → Run workflow. Set versionCode to a unique, increasing integer and versionName to the public version (e.g. 1.0.0).
5. Download the workflow artifact, verify its SHA-256, and upload the `.aab` to Play Console.

Google Play's current submission policy requires new apps and updates to target Android 16 (API 36) from 31 August 2026; see [official target API policy](https://support.google.com/googleplay/android-developer/answer/11926878). The workflow uses app ID `com.mashalweb.daybook`, sets compile/target SDK 36, runs repository regression tests, and checks that the AAB is a valid ZIP. A successful build is not a guarantee of Play policy approval or complete device QA.

## Store listing and policy checklist
- Create/verify the Play Console developer account and app record; package name must match `com.mashalweb.daybook`.
- Publish and verify the privacy policy URL: `https://mashal-web.github.io/daybook/privacy-policy.html`. This page is linked in the app's Settings.
- Complete Data safety accurately. Current implementation stores planner records locally, has no account/analytics/ad SDK, and sends configured prayer-time date/coordinates/calculation settings to AlAdhan when fetching timings. Re-audit dependencies and network behavior before declaring.
- Complete app access, ads (no ads in current app), target audience/content rating, and any required declarations.
- Review the Local Notifications / exact-alarm permission declaration carefully. Request exact alarms only if Play policy permits the app's core use case; if not, switch to inexact reminders and remove the restricted permission before submission.
- Prepare store icon (512×512), feature graphic (1024×500), phone screenshots, short/full descriptions, support contact email, and release notes. Confirm image assets meet Play Console specs.
- Test on physical Android devices: first launch, offline behavior, persistence after update, import/export backup, prayer-time network failure, notification permission denied/granted, reboot/resume, Android 13+ notification permission, and Android 14+ alarm settings.
- For a new personal Play developer account created after 13 Nov 2023, complete closed testing with at least 12 testers opted in continuously for 14 days, then apply for production access.
- Submit for Play review manually; publication remains under your Play Console account.

## Key limitations
No signing secrets are stored in this repository. This preparation cannot create the private upload keystore or submit to Play Console on your behalf. Do not lose the upload key; if enrolled in Play App Signing, it is the upload key used to authenticate bundle uploads.
