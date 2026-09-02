import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionUpdate, cleanForFirestore, diffMealLogs } from '../src/services/cloudSessionData.ts';
import { restartPlan } from '../src/utils/planSession.ts';
import { explicitCalories, detectMealType } from '../src/utils/manualCalories.ts';

test('manual calories never confuse grams, milliliters or counts with calories', () => {
  for (const text of ['250g chicken', '100 ml milk', '12 eggs', '-700 calories', '0 calories', '12000 calories']) assert.equal(explicitCalories(text), null, text);
  assert.equal(explicitCalories('Breakfast 700 calories'), 700);
  assert.equal(explicitCalories('lunch 500'), 500);
  assert.equal(explicitCalories('700'), 700);
  assert.equal(detectMealType('For dinner I ate eggs', 'lunch'), 'dinner');
});

const session = {
  stage: 'main', profile: null, tier: 'pro', activePlan: 'bulk',
  aiChecksUsed: 2, scansUsed: 1, waterMl: 500,
  trialStartedAt: '2026-09-02T00:00:00.000Z', logs: [],
};
const log = (id, calories = 500) => ({
  id, food: { id: 'meal', name: 'Nihari', calories },
  loggedAt: '2026-09-02T12:00:00.000Z', mealType: 'lunch',
});

for (const [goal, expectedPlan] of [['lose', 'low'], ['maintain', 'low'], ['gain', 'bulk']]) {
  test('restart plan: ' + goal + ' preserves account, history and trial usage', () => {
    const previous = { ...session, profile: { name: 'Test', goal: 'lose', customDailyTarget: 4000 }, customDailyTarget: 4000, logs: [log('saved')] };
    const before = structuredClone(previous);
    const next = restartPlan(previous, goal, '2026-09-10T12:00:00.000Z');
    assert.equal(next.profile.goal, goal);
    assert.equal(next.activePlan, expectedPlan);
    assert.equal(next.stage, 'summary');
    assert.equal(next.planStartedAt, '2026-09-10T12:00:00.000Z');
    assert.equal(next.trialStartedAt, previous.trialStartedAt);
    assert.equal(next.aiChecksUsed, previous.aiChecksUsed);
    assert.equal(next.scansUsed, previous.scansUsed);
    assert.equal(next.tier, previous.tier);
    assert.equal(next.waterMl, previous.waterMl);
    assert.deepEqual(next.logs, previous.logs);
    assert.equal('customDailyTarget' in next.profile, false);
    assert.equal('customDailyTarget' in next, false);
    assert.deepEqual(previous, before);
    const saved = buildSessionUpdate(next);
    assert.equal(saved.preferences.planStartedAt, next.planStartedAt);
    assert.equal(saved.trialStartedAt, previous.trialStartedAt);
    assert.equal('customDailyTarget' in saved.preferences, false);
  });
}

test('no profile: restarting cannot create an incomplete plan', () => {
  assert.equal(restartPlan(session, 'gain'), session);
});

test('client updates never contain subscription tier or UI state', () => {
  const result = buildSessionUpdate(session);
  assert.equal('tier' in result, false);
  assert.equal('stage' in result, false);
  assert.equal('logs' in result, false);
  assert.deepEqual(result.usage, { aiChecksUsed: 2, scansUsed: 1, waterMl: 500 });
});

test('optional undefined values are omitted', () => {
  assert.deepEqual(cleanForFirestore({ name: 'Meal', note: undefined }), { name: 'Meal' });
  assert.deepEqual(buildSessionUpdate(session).preferences, { activePlan: 'bulk' });
});

test('custom calorie target is retained from the profile', () => {
  const result = buildSessionUpdate({ ...session, profile: { customDailyTarget: 3000 } });
  assert.equal(result.preferences.customDailyTarget, 3000);
});

test('unchanged meals do not produce writes', () => {
  assert.deepEqual(diffMealLogs([log('a')], [log('a')]), { changed: [], removed: [] });
});

test('additions, refinements and deletions are identified separately', () => {
  const result = diffMealLogs([log('a', 700), log('c')], [log('a'), log('b')]);
  assert.deepEqual(result.changed.map((item) => item.id), ['a', 'c']);
  assert.deepEqual(result.removed.map((item) => item.id), ['b']);
});

test('diff does not mutate history and is empty after acknowledgement', () => {
  const before = [log('a')];
  const after = [log('a'), log('b')];
  const copy = structuredClone(before);
  diffMealLogs(after, before);
  assert.deepEqual(before, copy);
  assert.deepEqual(diffMealLogs(after, structuredClone(after)), { changed: [], removed: [] });
});
