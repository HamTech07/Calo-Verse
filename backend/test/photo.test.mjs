import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preparePhoto } from '../photo.mjs';
import { QuotaLedger } from '../quota.mjs';
import { createApiServer } from '../http.mjs';
import { estimateWithGemini, validateEstimate, ApiError } from '../gemini.mjs';

const meal = { isFood: true, needsClarification: false, englishText: 'A bowl of nihari with extra ghee', name: 'Nihari', portion: '1 bowl', explanation: 'Estimated bowl with one tablespoon of additional ghee.', calories: 640, protein: 30, carbs: 15, fats: 51, fiber: 2, confidence: 'medium' };
const fixture = async () => ({ mimeType: 'image/png', data: (await sharp({ create: { width: 32, height: 32, channels: 3, background: '#aa6633' } }).png().toBuffer()).toString('base64') });
test('refinements use only this account’s last successful English estimate', () => {
  const ledger = new QuotaLedger(':memory:');
  try {
    const result = validateEstimate(meal);
    assert.equal(ledger.previousPhotoEstimate('user', 'photo1'), undefined);
    ledger.begin('user', 'free', 0, 10000, trial()).finish(true, result);
    assert.deepEqual(ledger.previousPhotoEstimate('user', 'photo1'), result);
    assert.equal(ledger.previousPhotoEstimate('other', 'photo1'), undefined);
    ledger.begin('user', 'free', 0, 20000, trial()).finish(false, { calories: 1 });
    assert.deepEqual(ledger.previousPhotoEstimate('user', 'photo1'), result);
  } finally { ledger.close(); }
});
const trial = (hash = 'photo1', surface = 'scan') => ({ hash, surface, trialStartedAt: new Date(0).toISOString() });

test('photos are decoded, resized, stripped of EXIF and converted to JPEG', async () => {
  const bytes = await sharp({ create: { width: 1800, height: 1000, channels: 3, background: '#aaaaaa' } }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const image = await preparePhoto({ mimeType: 'image/jpeg', data: bytes.toString('base64') });
  const meta = await sharp(Buffer.from(image.data, 'base64')).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.ok(meta.width <= 1280 && meta.height <= 1280);
  assert.equal(meta.exif, undefined);
  assert.match(image.hash, /^[a-f0-9]{64}$/);
  assert.equal((await preparePhoto({ mimeType: 'image/jpeg', data: bytes.toString('base64') })).hash, image.hash);
});

test('corrupt, oversized, remote and disguised images fail before provider calls', async () => {
  const valid = await fixture();
  for (const input of [null, { url: 'http://localhost:3001/health' }, { mimeType: 'image/svg+xml', data: 'PHN2Zz4=' },
    { mimeType: 'image/jpeg', data: valid.data }, { mimeType: 'image/png', data: '%%%' },
    { mimeType: 'image/png', data: 'AAAA'.repeat(1400000) }, { mimeType: 'image/png', data: 'YWJj' }]) {
    await assert.rejects(preparePhoto(input), error => error instanceof ApiError);
  }
});

test('Gemini receives the photo and notes together; no hash or user identity is sent', async () => {
  const image = await preparePhoto(await fixture());
  const result = await estimateWithGemini('Add 1 tablespoon of ghee', { apiKey: 'test', image, fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.contents[0].parts[0].text, 'Add 1 tablespoon of ghee');
    assert.deepEqual(body.contents[0].parts[1].inlineData, { mimeType: 'image/jpeg', data: image.data });
    assert.equal(options.body.includes(image.hash), false);
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(meal) }] } }] });
  } });
  assert.equal(result.calories, 640);
});

test('three unique photos count separately from text; same-photo refinements remain available', () => {
  const ledger = new QuotaLedger(':memory:');
  try {
    for (let n = 0; n < 3; n++) assert.equal(ledger.begin('user', 'free', 0, 10000 + n * 5000, trial('p' + n)).finish(true), n + 1);
    assert.equal(ledger.begin('user', 'free', 0, 30000, trial('p2')).finish(true), 3);
    assert.throws(() => ledger.begin('user', 'free', 0, 40000, trial('p3')), e => e.code === 'SCAN_LIMIT');
    assert.equal(ledger.begin('user', 'free', 0, 45000).finish(true), 1);
  } finally { ledger.close(); }
});

test('failed scans do not consume credits; finish is idempotent', () => {
  const ledger = new QuotaLedger(':memory:');
  try {
    assert.equal(ledger.begin('user', 'free', 0, 10000, trial()).finish(false), 0);
    const reservation = ledger.begin('user', 'free', 0, 15000, trial());
    assert.equal(reservation.finish(true), 1);
    assert.equal(reservation.finish(true), 1);
  } finally { ledger.close(); }
});

test('free and Plus camera access is governed by three uses, not date or screen', () => {
  const ledger = new QuotaLedger(':memory:');
  try {
    for (const tier of ['free', 'plus']) {
      assert.equal(ledger.begin(tier, tier, 0, 10000, trial('x', 'daily')).finish(true), 1);
      assert.equal(ledger.begin(tier, tier, 0, 15000, { ...trial('y'), trialStartedAt: 'bad' }).finish(true), 2);
      assert.equal(ledger.begin(tier, tier, 0, 20000, { ...trial('z'), trialStartedAt: new Date(30000).toISOString() }).finish(true), 3);
      assert.throws(() => ledger.begin(tier, tier, 0, 25000, trial('fourth')), e => e.code === 'SCAN_LIMIT');
    }
    assert.equal(ledger.begin('pro', 'pro', 3, 3 * 86400000, trial('x', 'daily')).finish(true), 3);
  } finally { ledger.close(); }
});

test('scan credits and refinement hashes survive restarts and cannot be reduced by client counts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'calo-photo-test-'));
  const file = join(dir, 'usage.sqlite');
  let ledger = new QuotaLedger(file);
  try {
    assert.equal(ledger.begin('user', 'free', 2, 10000, trial()).finish(true), 3);
    ledger.close(); ledger = new QuotaLedger(file);
    assert.equal(ledger.begin('user', 'free', 0, 20000, trial()).finish(true), 3);
    assert.throws(() => ledger.begin('user', 'free', 0, 30000, trial('new')), e => e.code === 'SCAN_LIMIT');
  } finally { ledger.close(); unlinkSync(file); rmdirSync(dir); }
});

test('HTTP photo endpoint allows three free scans on both screens and enforces server usage', async () => {
  const ledger = new QuotaLedger(':memory:');
  let calls = 0;
  const server = createApiServer({ ledger, origins: ['http://localhost:8081'],
    authenticate: async token => {
      if (token !== 'valid') throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in.');
      return { uid: 'user', tier: 'free', used: 3, scansUsed: 2, trialStartedAt: new Date().toISOString() };
    },
    estimate: async (text, image) => { calls++; assert.equal(text, 'Extra ghee'); assert.equal(image.mimeType, 'image/jpeg'); return validateEstimate(meal); },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/v1/nutrition/photo';
  const image = await fixture();
  const send = (body, auth = 'valid') => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + auth }, body: JSON.stringify(body) });
  try {
    assert.equal((await send({ text: '', surface: 'scan', image }, 'forged')).status, 401);
    assert.equal((await send({ text: '', surface: 'scan', image: { data: 'invalid', mimeType: 'image/jpeg' } })).status, 400);
    const result = await send({ text: 'Extra ghee', surface: 'daily', image, tier: 'pro', scansUsed: 0 });
    assert.equal(result.status, 200);
    const body = await result.json();
    assert.equal(body.scansUsed, 3);
    assert.equal(body.estimate.calories, 640);
    assert.equal(body.aiChecksUsed, undefined);
    assert.equal(calls, 1);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); ledger.close(); }
});
