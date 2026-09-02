# Voice AI — local implementation

Updated September 3, 2026.

## User flow

Scan → Multilingual voice AI (Pro) → Record meal → Stop → optional playback → Send voice to Gemini.
Review the English meal text, correct it if necessary, re-estimate corrected text, select a meal slot and add once.

- No microphone permission request or recording on page load.
- Recordings stop at 45 seconds. Leaving the recording screen/backgrounding stops capture.
- Recording and playback are local until the explicit Send action.
- The user approved sending recorded meal voice to Google Gemini. The UI also discloses the destination and free-tier product-improvement use.
- Raw voice is not included in Firestore logs or the backend quota database.
- Web converts captured audio to mono PCM WAV. Native uses an app-cache M4A recording, removed on discard/unmount on a best-effort basis.
- AI returns a faithful English translation and estimated nutrients; only English result fields are logged. Names may be transliterated.
- Non-Latin output is rejected. This script check does not itself prove a text is English; the model instruction and user review remain important.
- Never interpret a recognition result as exact nutrition or guaranteed transcription accuracy.

## Access/security

The voice endpoint checks Firebase identity and the Firestore Pro tier before accepting audio.
No local tier toggle, free-voice entitlement, billing change or purchase bypass was added.
Free/Plus accounts show the Pro gate. Use a legitimately provisioned test Pro entitlement when testing the full recorder UI.
Voice shares the local backend's per-user cooldown and global daily provider-safety cap, without decrementing photo/text trial counters.
The endpoint accepts only bounded WAV/M4A data (2 MiB maximum; parsed duration up to 46 seconds to allow encoder padding). User URLs and claimed durations are not trusted.
Existing production-deployment/attestation/quota-hardening work remains necessary.

## Verification

- 24 AI backend tests plus 11 cloud/session tests passed.
- TypeScript and web/Android bundle exports passed.
- Microphone permissions configured; background recording/playback disabled.
- A live synthetic English example (two boiled eggs and a banana) returned the English meal text and a calorie estimate, without touching user credits or diary.
- A Spanish phrase spoken by the installed English-only Windows voice was misrecognized. This is NOT a passed multilingual test; the smoke script now uses only supported English synthesis and explicitly reports other-language testing as pending.
- Real Urdu/other-language speakers, physical microphone capture, audio interruptions, and Android/iOS device flows still require end-to-end testing.
- Root Expo build-tool dependency advisories noted in CAMERA_AI.md remain; backend audit is clean.

Run `npm run typecheck`, `npm run test:ai`, `npm run test:backend`.
Optional live synthetic test from backend: `node --env-file=.env check-voice.mjs` (Windows System.Speech required; consumes provider quota only).

Current backend is local-only (127.0.0.1:3001). Production HTTPS deployment and a configured EXPO_PUBLIC_AI_API_URL are required for phones/public release.

References: [Expo SDK 57 audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/), [Gemini audio understanding](https://ai.google.dev/gemini-api/docs/audio).
