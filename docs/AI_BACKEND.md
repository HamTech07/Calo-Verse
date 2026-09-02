# Local Gemini text AI

The web preview now uses real Gemini for Search > Ask Calo AI, the daily meal logger, and the 30-day plan logger. Manual calorie entries and database searches do not call Gemini. Camera and voice are still separate demo flows and are not connected to this endpoint yet.

## Run locally

Requires Node 24 or newer. From the app folder:

    npm run backend
    npm run web

The backend listens only on 127.0.0.1:3001. Web development uses that address automatically. For a deployed build, EXPO_PUBLIC_AI_API_URL must be configured to an HTTPS backend URL. Physical phones cannot reach the computer through their own localhost address; native-device networking and deployment are not configured yet.

## Secrets and accounts

- The Gemini key lives only in backend/.env, excluded from Git. Never use an EXPO_PUBLIC_ prefix for the key.
- Requests require a Firebase ID token verified by firebase-admin, and the user's saved profile must be readable through Firestore rules.
- Gemini receives only the submitted food description, not the Firebase token, email, body measurements, or meal history.
- The current model is gemini-3.5-flash-lite. It accepted this new AI Studio key; the older 2.5 Flash-Lite model rejected new-user requests. No billing account was linked or modified.
- Food names, summaries, portion assumptions and explanations are requested in English. Original non-English food descriptions are not saved as meal names or notes by the live logger.
- Exact manual calorie entries use an English meal label. Macros are not invented from calories alone (unmeasured macro fields currently contribute zero to totals).

## Limits and failures

The three free successful text estimates are shared across the three text entry points. The server stores a per-user counter in backend/data/usage.sqlite and starts from the maximum of that counter and the existing cloud usage. Keep that file when restarting. Failed or invalid provider results do not consume a successful-use count. There is one in-flight request per user, a short retry cooldown, and a 100-attempt-per-UTC-day local safety ceiling across users. Google may have lower model quotas. No automatic retry or paid model fallback is used.

This is a local single-instance ledger, not a distributed production billing system. Before deploying, migrate quota authority to a durable server-controlled shared datastore, harden client-writable Firestore usage fields, add request idempotency, revocation checks/App Check, and verify subscription receipts. Do not deploy this local server to an ephemeral or multi-instance host as-is.

Responses are validated and errors are sanitized. Unknown foods ask for clearer food/portion details instead of falling back to a made-up calorie number. All AI nutrition remains approximate and varies by portion and preparation.

## Privacy and costs

The UI warns that free-tier Gemini food inputs may be used to improve Google's products. Use generic food descriptions for development, not sensitive health information. Revisit consent, retention, provider terms and deployment costs before public launch. A free Firebase project does not guarantee free hosting or AI usage on a separately upgraded project.

Official references:
- https://ai.google.dev/gemini-api/docs/api-key
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/api/generate-content
- https://firebase.google.com/docs/auth/admin/verify-id-tokens

## Verification

    npm run typecheck
    npm run test:backend
    npm run test:ai
    npm run export:web

From backend, npm run check:gemini sends one generic nihari/ghee description to Gemini (consumes provider quota, not app trial credits). It never prints the key. Offline tests cover output validation, auth/origin boundaries, failed calls, concurrent requests, persistent free limits and food quantities versus explicit calories.
