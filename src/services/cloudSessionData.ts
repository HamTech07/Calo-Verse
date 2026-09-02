import type { AppSession, FoodLog } from '../types';

export function cleanForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function buildSessionUpdate(session: AppSession) {
  // Do not include tier: verified billing on the server owns entitlements.
  return cleanForFirestore({
    profile: session.profile,
    preferences: {
      activePlan: session.activePlan,
      planStartedAt: session.planStartedAt,
      customDailyTarget: session.profile?.customDailyTarget ?? session.customDailyTarget,
    },
    usage: {
      aiChecksUsed: session.aiChecksUsed,
      scansUsed: session.scansUsed,
      waterMl: session.waterMl,
    },
    trialStartedAt: session.trialStartedAt,
    schemaVersion: 1,
  });
}

export function diffMealLogs(current: FoodLog[], previous: FoodLog[]) {
  const before = new Map(previous.map((log) => [log.id, JSON.stringify(cleanForFirestore(log))]));
  const currentIds = new Set(current.map((log) => log.id));
  return {
    changed: current.filter((log) => before.get(log.id) !== JSON.stringify(cleanForFirestore(log))),
    removed: previous.filter((log) => !currentIds.has(log.id)),
  };
}
