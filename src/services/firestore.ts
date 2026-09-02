import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { AppSession, FoodLog, PlanId, Profile, Tier } from '../types';
import { AuthIdentity } from './auth';
import { firestoreDb } from './firebase';
import { buildSessionUpdate, cleanForFirestore, diffMealLogs } from './cloudSessionData';

export type CloudSession = Omit<AppSession, 'stage'>;

function requireDb() {
  if (!firestoreDb) throw new Error('Firestore is not configured yet.');
  return firestoreDb;
}

function safeTier(value: unknown): Tier {
  return value === 'plus' || value === 'pro' ? value : 'free';
}

function safePlan(value: unknown): PlanId {
  return value === 'medium' || value === 'high' || value === 'bulk' ? value : 'low';
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export async function ensureUserDocument(identity: AuthIdentity) {
  const db = requireDb();
  const reference = doc(db, 'users', identity.uid);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) {
      transaction.set(reference, {
        uid: identity.uid,
        email: identity.email,
        displayName: identity.name,
        tier: 'free',
        profile: null,
        preferences: { activePlan: 'low' },
        usage: { aiChecksUsed: 0, scansUsed: 0, waterMl: 0 },
        trialStartedAt: new Date().toISOString(),
        schemaVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    transaction.update(reference, {
      email: identity.email,
      displayName: identity.name,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function loadCloudSession(uid: string): Promise<CloudSession | null> {
  const db = requireDb();
  const userSnapshot = await getDoc(doc(db, 'users', uid));
  if (!userSnapshot.exists()) return null;

  const data = userSnapshot.data();
  const preferences = (data.preferences ?? {}) as Record<string, unknown>;
  const usage = (data.usage ?? {}) as Record<string, unknown>;
  const logsSnapshot = await getDocs(
    query(collection(db, 'users', uid, 'mealLogs'), orderBy('loggedAt', 'desc')),
  );
  const logs = logsSnapshot.docs.map((item) => {
    const { updatedAt: _updatedAt, ...log } = item.data();
    return log as FoodLog;
  });
  const customDailyTarget = safeNumber(preferences.customDailyTarget, 0) || undefined;

  return {
    profile: (data.profile as Profile | null | undefined) ?? null,
    tier: safeTier(data.tier),
    activePlan: safePlan(preferences.activePlan),
    customDailyTarget,
    planStartedAt: typeof preferences.planStartedAt === 'string' && Number.isFinite(Date.parse(preferences.planStartedAt))
      ? preferences.planStartedAt
      : typeof data.trialStartedAt === 'string' ? data.trialStartedAt : undefined,
    aiChecksUsed: safeNumber(usage.aiChecksUsed),
    scansUsed: safeNumber(usage.scansUsed),
    trialStartedAt:
      typeof data.trialStartedAt === 'string' ? data.trialStartedAt : new Date().toISOString(),
    waterMl: safeNumber(usage.waterMl),
    logs,
  };
}

export async function saveSessionState(uid: string, session: AppSession) {
  const db = requireDb();
  await updateDoc(doc(db, 'users', uid), {
    ...buildSessionUpdate(session),
    updatedAt: serverTimestamp(),
  });
}

export async function saveFoodLog(uid: string, log: FoodLog) {
  const db = requireDb();
  await setDoc(doc(db, 'users', uid, 'mealLogs', log.id), {
    ...cleanForFirestore(log),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFoodLog(uid: string, logId: string) {
  await deleteDoc(doc(requireDb(), 'users', uid, 'mealLogs', logId));
}

// Only changed logs are written. Retrying is safe because log IDs are stable.
export async function syncCloudSession(uid: string, session: AppSession, previousLogs: FoodLog[]) {
  const db = requireDb();
  const { changed, removed } = diffMealLogs(session.logs, previousLogs);
  const operations = [
    ...changed.map((log) => ({ kind: 'set' as const, log })),
    ...removed.map((log) => ({ kind: 'delete' as const, log })),
  ];

  // Keep metadata and meal edits atomic. Bulk imports need a separate migration flow.
  if (operations.length > 450) throw new Error('Too many pending meal edits for one sync.');
  const batch = writeBatch(db);
  for (const operation of operations) {
    const reference = doc(db, 'users', uid, 'mealLogs', operation.log.id);
    if (operation.kind === 'delete') {
      batch.delete(reference);
    } else {
      batch.set(reference, { ...cleanForFirestore(operation.log), updatedAt: serverTimestamp() });
    }
  }
  batch.update(doc(db, 'users', uid), {
    ...buildSessionUpdate(session),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}
