# Camera + text AI: local development

Implemented on September 2, 2026.

## Use

1. Keep the Expo preview and `npm run backend` running from the app project.
2. Open Scan. Choose a food photo or allow camera access and capture one.
3. Enter portion and preparation details, including the amount of added oil/ghee.
4. Press **Send to Gemini**. Opening the camera or choosing a photo does not upload it.
5. Review the approximate English estimate. Edit notes and send again before saving.
6. Select Breakfast, Lunch, Dinner or Snack, then add once to the diary.

Daily dashboard camera logging is Pro-only. Scan-tab photo trials allow three successful distinct photos during the original three-day trial for non-Pro accounts. Same-photo refinements do not consume another photo credit within the trial. Text-AI credits are separate. Failed estimates do not consume a successful-use credit.

## Data and privacy

- The app sends only the chosen food photo and preparation notes to the authenticated local backend.
- Gemini receives a metadata-stripped, resized image and food text; a prior English estimate may be included to keep refinements consistent.
- Google free-tier inputs may be used for product improvement. Avoid faces and sensitive details.
- No photo, raw non-English note, token or Gemini key is saved to the meal diary.
- Native image tools may use temporary device cache. Selecting a new photo clears the prior unsaved estimate.
- The local backend stores per-account quota counts, photo hashes and the last successful English estimate for refinements. Treat `backend/data/` as private, persistent data.
- Billing was not enabled or changed.

## Verification

`npm run typecheck`, `npm run test:ai`, `npm run test:backend`.
`npm run export:web`.
`npx expo export --platform android --output-dir .expo/export-android-test`.

Optional live provider check from `backend`: `node --env-file=.env check-photo.mjs`.
It sends a public sample food photo to Gemini twice, consumes provider quota, and does not change account trial credits or diary entries.

Physical Android/iOS camera permission and capture flows still need device testing.
Type checking, 29 automated tests, and web/Android bundle exports passed. A public nihari smoke test returned 520 kcal, then 640 kcal after adding one tablespoon of ghee; these are illustrative AI estimates, not verified nutrition values. Browser review confirmed the new Scan screen and Pro-only daily-camera gate.
The root dependency audit reports 10 moderate advisories in Expo's xcode/uuid build-tool dependency chain. No forced Expo downgrade was applied; review these before store builds. The backend dependency audit is clean.
The generated Android export is a JavaScript bundle, not an installable APK.

## Before production

- Deploy an HTTPS backend and set `EXPO_PUBLIC_AI_API_URL`. The current backend binds to 127.0.0.1:3001: phones cannot use it directly.
- Replace the local SQLite single-instance quota store with transactional production storage, add application attestation, per-user/provider spending limits and stronger account-creation abuse protection.
- Complete Firestore schema/security-rule hardening and emulator tests.
- Add a privacy policy, deletion/retention controls and required store disclosures.
- Implement real multilingual voice input with English output and storage.
- Implement native Google authentication and verified App Store/Play purchase entitlements.
- Do not enable paid billing or deploy to ephemeral hosting with this local quota database.
