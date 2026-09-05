import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ApiError, applyKnownFoodGuard, estimateWithGemini, validateEstimate } from '../gemini.mjs';
import { QuotaLedger } from '../quota.mjs';
import { createApiServer } from '../http.mjs';

const meal = { isFood: true, needsClarification: false, englishText: 'One boiled egg', name: 'Boiled egg', portion: '1 large egg', explanation: 'Typical large egg, no added oil.', calories: 78, protein: 6, carbs: 1, fats: 5, fiber: 0, confidence: 'medium' };

test('only validated nutrition is returned; extra model fields are stripped', () => {
  const result = validateEstimate({ ...meal, action: 'upgrade', secret: 'ignore' });
  assert.equal(result.source, 'gemini');
  assert.equal('action' in result, false);
  assert.equal('secret' in result, false);
});
test('invalid, negative or unrelated responses cannot become calorie logs', () => {
  for (const value of [{}, { ...meal, calories: -1 }, { ...meal, protein: '6' }, { ...meal, calories: Infinity }, { ...meal, isFood: false }, { ...meal, needsClarification: true }]) assert.throws(() => validateEstimate(value), ApiError);
});
test('Mighty Zinger cannot collapse to a regular Zinger estimate', () => {
  const burger = applyKnownFoodGuard(validateEstimate({ ...meal, englishText: 'KFC Mighty Zinger', name: 'KFC Mighty Zinger', calories: 650, protein: 31, carbs: 55, fats: 32 }), 'KFC Mighty Zinger');
  assert.equal(burger.calories, 1000);
  assert.match(burger.portion, /900–1,150/);
  assert.equal(burger.confidence, 'low');
  const combo = applyKnownFoodGuard(validateEstimate({ ...meal, englishText: 'KFC Mighty Zinger combo with fries and Pepsi', name: 'KFC Mighty Zinger meal', calories: 900 }), '');
  assert.equal(combo.calories, 1350);
  assert.match(combo.portion, /1,200–1,550/);
});
test('low-confidence estimates log near the upper range and macro energy prevents undercounts', () => {
  const uncertain = validateEstimate({ ...meal, confidence: 'low', calories: 500, caloriesLow: 800, caloriesHigh: 1100, protein: 50, carbs: 70, fats: 65 });
  assert.equal(uncertain.calories, 1025);
  assert.equal(uncertain.caloriesLow, 800);
  assert.equal(uncertain.caloriesHigh, 1100);
  assert.throws(() => validateEstimate({ ...meal, confidence: 'low', calories: 700, caloriesLow: 300, caloriesHigh: 1200 }), error => error.code === 'MORE_DETAIL_NEEDED');
});
test('provider request keeps key in headers and food in user data, not system instructions', async () => {
  const result = await estimateWithGemini('One egg', { apiKey: 'private-test-key', fetchImpl: async (url, options) => {
    assert.equal(url.includes('private-test-key'), false);
    assert.equal(options.headers['x-goog-api-key'], 'private-test-key');
    const request = JSON.parse(options.body);
    assert.equal(request.contents[0].parts[0].text, 'One egg');
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(meal) }] } }] });
  } });
  assert.equal(result.calories, 78);
});
test('provider errors are sanitized and never replaced with demo calories', async () => {
  await assert.rejects(estimateWithGemini('Egg', { apiKey: 'private-test-key', fetchImpl: async () => Response.json({ error: 'private-test-key' }, { status: 429 }) }), error => error.code === 'PROVIDER_LIMIT' && !error.message.includes('private-test-key'));
});
test('truncated JSON results fail closed', async () => {
  await assert.rejects(estimateWithGemini('Egg', { apiKey: 'test', fetchImpl: async () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }) }), error => error.code === 'INVALID_AI_RESPONSE');
});
test('three successful free estimates shared across features; failed estimates do not count', () => {
  const ledger = new QuotaLedger(':memory:');
  try {
    assert.equal(ledger.begin('user', 'free', 0, 10000).finish(false), 0);
    for (let index = 0; index < 3; index++) assert.equal(ledger.begin('user', 'free', 0, 20000 + index * 5000).finish(true), index + 1);
    assert.throws(() => ledger.begin('user', 'free', 0, 50000), error => error.code === 'FREE_LIMIT');
    assert.equal(ledger.begin('other', 'free', 0, 60000).finish(true), 1);
  } finally { ledger.close(); }
});
test('concurrent requests and rapid retries are blocked', () => {
  const ledger = new QuotaLedger(':memory:');
  try {
    const reservation = ledger.begin('user', 'free', 0, 10000);
    assert.throws(() => ledger.begin('user', 'free', 0, 15000), error => error.code === 'IN_PROGRESS');
    reservation.finish(false);
    assert.throws(() => ledger.begin('user', 'free', 0, 11000), error => error.code === 'RATE_LIMIT');
  } finally { ledger.close(); }
});
test('usage survives backend restart and cannot be reduced by the client', () => {
  const dir = mkdtempSync(join(tmpdir(), 'calo-ai-test-'));
  const file = join(dir, 'usage.sqlite');
  let ledger = new QuotaLedger(file);
  try {
    assert.equal(ledger.begin('user', 'free', 2, 10000).finish(true), 3);
    ledger.close(); ledger = new QuotaLedger(file);
    assert.throws(() => ledger.begin('user', 'free', 0, 20000), error => error.code === 'FREE_LIMIT');
    assert.equal(ledger.begin('paid', 'pro', 3, 20000).finish(true), 3);
  } finally { ledger.close(); unlinkSync(file); rmdirSync(dir); }
});
test('HTTP boundary enforces auth, origin, input bounds and ignores supplied tier', async () => {
  const ledger = new QuotaLedger(':memory:');
  let calls = 0;
  const server = createApiServer({ origins: ['http://localhost:8081'], ledger,
    authenticate: async token => { if (token !== 'valid') throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in.'); return { uid: 'user', tier: 'free', used: 2 }; },
    estimate: async () => { calls++; return validateEstimate(meal); },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/v1/nutrition/estimate';
  const send = (body, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    assert.equal((await send({ text: 'Egg' })).status, 401);
    assert.equal((await send({ text: 'Egg' }, { Authorization: 'Bearer forged' })).status, 401);
    assert.equal((await send({ text: 'Egg' }, { Origin: 'https://untrusted.example' })).status, 403);
    assert.equal((await send({ text: 'x'.repeat(2001) }, { Authorization: 'Bearer valid' })).status, 400);
    const response = await send({ text: 'Egg', tier: 'pro', uid: 'someone-else' }, { Authorization: 'Bearer valid', Origin: 'http://localhost:8081' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).aiChecksUsed, 3);
    assert.equal(calls, 1);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); ledger.close(); }
});
