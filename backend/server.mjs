import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ApiError, estimateWithGemini } from './gemini.mjs';
import { QuotaLedger } from './quota.mjs';
import { createApiServer } from './http.mjs';

const projectId = process.env.FIREBASE_PROJECT_ID || 'caloverse';
if (!process.env.GEMINI_API_KEY) { console.error('Missing GEMINI_API_KEY in backend/.env.'); process.exit(1); }
if (process.env.FIREBASE_AUTH_EMULATOR_HOST) { console.error('Remove the auth emulator override before using real AI.'); process.exit(1); }
const auth = getAuth(initializeApp({ projectId }));
const dataDir = fileURLToPath(new URL('./data/', import.meta.url));
mkdirSync(dataDir, { recursive: true });
const ledger = new QuotaLedger(dataDir + '/usage.sqlite');

async function authenticate(token) {
  let identity;
  try { identity = await auth.verifyIdToken(token); }
  catch { throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Your session could not be verified. Sign in again.'); }
  // Read using the user's token, respecting existing Firestore owner-only rules.
  const result = await fetch('https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(projectId) + '/databases/(default)/documents/users/' + encodeURIComponent(identity.uid), {
    headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(8000),
  });
  if (!result.ok) throw new ApiError(403, 'PROFILE_UNAVAILABLE', 'Your saved profile could not be verified. Please try again.');
  const { fields = {} } = await result.json();
  const rawTier = fields.tier?.stringValue;
  const rawUsed = Number(fields.usage?.mapValue?.fields?.aiChecksUsed?.integerValue ?? 0);
  const rawScans = Number(fields.usage?.mapValue?.fields?.scansUsed?.integerValue ?? 0);
  const email = identity.email || '';
  const isAdmin = email.toLowerCase() === 'hamdanamir2005@gmail.com' || (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).includes(email.toLowerCase());
  // Account creation is immutable in existing rules; resetting a plan cannot restart the photo trial.
  return {
    scansUsed: Number.isFinite(rawScans) ? rawScans : 0,
    trialStartedAt: fields.createdAt?.timestampValue || fields.trialStartedAt?.stringValue,
    uid: identity.uid,
    email,
    isAdmin,
    tier: ['plus', 'pro'].includes(rawTier) ? rawTier : 'free',
    used: Number.isFinite(rawUsed) ? rawUsed : 0
  };
}

const server = createApiServer({
  authenticate, ledger,
  estimate: (text, image, previousEstimate, audio) => estimateWithGemini(text, { image, previousEstimate, audio, apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite' }),
  origins: ['http://localhost:8081', 'http://127.0.0.1:8081'],
});
// Local only: deployment, HTTPS, distributed quotas and native-device access are separate work.
server.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log('Calo Verse AI backend ready at http://127.0.0.1:' + (process.env.PORT || 3001)));
server.on('error', () => { console.error('Backend could not start. Check whether its port is already occupied.'); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { ledger.close(); process.exit(0); }));
