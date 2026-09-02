# Calo Verse backend foundation

## Current implementation

- Firebase JS SDK 12: email/password authentication on web, Android and iOS.
- Web Google sign-in uses Firebase's Google popup flow.
- Native auth sessions use AsyncStorage persistence. Native Google OAuth still needs an implementation, platform client IDs and a development build; email works independently.
- Firestore stores account/profile/preferences/usage at users/{uid} and meals at users/{uid}/mealLogs/{logId}.
- Failed cloud reads do not fall back to another local profile or overwrite cloud data.
- Changed meal logs and session metadata are committed together. Sync errors have a retry action.
- With no Firebase configuration, an explicitly labeled local preview remains available. It does not create accounts.
- Client updates never write subscription tier. The configured app cannot unlock paid plans through the preview checkout.

## Connect a Firebase project

1. Create/select a Firebase project and register a Web App to get configuration for the universal Firebase JS SDK.
2. Copy .env.example to .env.local and fill in the Firebase Web App values. These public configuration values are not Admin credentials. Never put service-account keys, AI secrets or payment secrets into EXPO_PUBLIC variables.
3. In Authentication, enable Email/Password and Google. Set the Google provider support email.
4. Add localhost and the eventual deployment domain to Authentication's authorized domains.
5. Create a Firestore database and deploy this repository's rules before testing writes. Do not use open test-mode rules.
6. With Firebase CLI installed and signed in, run:

       firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID

7. Restart Expo with npx expo start --clear.
8. Test sign-up, sign-out, login, session restoration, profile saving, meal add/delete, and user A versus user B data isolation.

No project has been provisioned or deployed by this code change. Live authentication and database checks require your Firebase project configuration.

## Before production

- Run Firestore emulator security tests: unauthenticated access denied; cross-user reads/writes denied; client tier upgrades denied; valid profile and meal writes allowed.
- Usage counters and trial dates are still client-managed preview data. Real paid AI usage must be authorized and counted by a trusted backend.
- Add email verification/password recovery, account deletion, App Check, abuse controls and privacy/data-retention settings.
- Connect native Google sign-in and verified Apple/Google billing receipts. The existing checkout is a preview, not a payment gateway.
- Cloud mode requires connectivity. There is no durable offline outbox or multi-device conflict resolver yet. Keep the app open until pending saves finish; closing it before a failed/pending save can lose unsynced changes. More than 450 meal edits in one sync require a bulk-import flow.
- Deploy a trusted AI endpoint; never ship its private API key in the mobile app.

## AI language contract for the next phase

Voice input may be in any supported language. Transcribe, translate/normalize the meal description into English, and show English text for confirmation. Store English meal descriptions, preparation notes and AI explanations, while preserving recognizable dish names such as Nihari.

Do not persist original recordings or non-English transcripts by default. Photo and English preparation notes must be analyzed together. Nutrition outputs must contain numeric calories/macros, serving assumptions and uncertainty; estimates are not exact measurements.

Translation and the AI provider are not connected in this foundation. This is the required contract for the next implementation phase.

## Local checks

- npm run typecheck
- npm run test:backend (Node 22.18+ / 24)
- npm run export:web
