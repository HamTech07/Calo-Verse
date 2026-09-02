import type { AppSession, Goal } from '../types';

// A new plan must never erase meal history or renew trial/billing entitlements.
export function restartPlan(session: AppSession, goal: Goal, now = new Date().toISOString()): AppSession {
  if (!session.profile) return session;
  const { customDailyTarget: _oldTarget, ...profile } = session.profile;
  const { customDailyTarget: _legacyTarget, ...previous } = session;
  return {
    ...previous,
    profile: { ...profile, goal },
    activePlan: goal === 'gain' ? 'bulk' : 'low',
    planStartedAt: now,
    stage: 'summary',
  };
}
