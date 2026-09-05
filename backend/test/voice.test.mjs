import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeVoiceWav } from '../../src/utils/voiceWav.ts';
import { prepareVoice, requireEnglishVoiceEstimate } from '../voice.mjs';
import { estimateWithGemini, validateEstimate, ApiError } from '../gemini.mjs';
import { createApiServer } from '../http.mjs';
import { QuotaLedger } from '../quota.mjs';

const fixture = (seconds = 1) => ({ mimeType: 'audio/wav', data: Buffer.from(encodeVoiceWav(new Float32Array(Math.round(seconds * 16000)).fill(0.1))).toString('base64') });
const meal = { isFood: true, needsClarification: false, englishText: 'I ate two boiled eggs and a banana.', name: 'Boiled eggs and banana', portion: '2 eggs and 1 medium banana', explanation: 'Typical portions; no added oil.', calories: 260, protein: 13, carbs: 28, fats: 11, fiber: 3, confidence: 'medium' };

test('web encoding produces bounded mono PCM with clipped non-finite samples', async () => {
  const samples = new Float32Array(16000);
  samples.set([2, -2, NaN, Infinity]);
  const bytes = encodeVoiceWav(samples);
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getInt16(44, true), 32767);
  assert.equal(view.getInt16(46, true), -32768);
  assert.equal(view.getInt16(48, true), 0);
  assert.equal(view.getInt16(50, true), 0);
  assert.equal((await prepareVoice({ mimeType: 'audio/wav', data: Buffer.from(bytes).toString('base64') })).mimeType, 'audio/wav');
  assert.throws(() => encodeVoiceWav(new Float32Array(100)), /Record/);
  assert.throws(() => encodeVoiceWav(new Float32Array(16000 * 47)), /Record/);
});

test('voice rejects missing, oversized, malformed, mislabeled and overlong recordings', async () => {
  const long = Buffer.from(encodeVoiceWav(new Float32Array(16000)));
  long.writeUInt32LE(100, 24); long.writeUInt32LE(200, 28);
  for (const input of [null, { url: 'https://example.com/voice.wav' }, { ...fixture(), mimeType: 'audio/m4a' },
    { mimeType: 'audio/wav', data: 'bad!' }, { mimeType: 'audio/wav', data: 'AAAA'.repeat(700000) },
    { mimeType: 'audio/wav', data: long.toString('base64') }]) {
    await assert.rejects(prepareVoice(input), ApiError);
  }
});

test('non-Latin translations fail closed and Latin dish names remain supported', () => {
  assert.equal(requireEnglishVoiceEstimate(validateEstimate(meal)).name, meal.name);
  assert.throws(() => requireEnglishVoiceEstimate({ ...validateEstimate(meal), englishText: 'میں نے دو انڈے کھائے' }), e => e.code === 'TRANSLATION_FAILED');
  assert.throws(() => requireEnglishVoiceEstimate({ ...validateEstimate(meal), name: 'अंडे' }), e => e.code === 'TRANSLATION_FAILED');
  assert.equal(requireEnglishVoiceEstimate({ ...validateEstimate(meal), name: 'Crème brûlée' }).name, 'Crème brûlée');
});

test('audio and English-translation instruction reach Gemini without local URI or identity', async () => {
  const audio = await prepareVoice({ ...fixture(), uri: 'private-device-path', uid: 'private-user' });
  const result = await estimateWithGemini('Translate the meal.', { apiKey: 'test-secret', audio, fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.deepEqual(body.contents[0].parts[1].inlineData, audio);
    assert.ok(body.contents[0].parts.some(part => part.text?.includes('faithful English translation')));
    assert.equal(options.body.includes('private-device-path'), false);
    assert.equal(options.body.includes('test-secret'), false);
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(meal) }] } }] });
  } });
  assert.equal(result.englishText, meal.englishText);
});

test('silence/unclear speech cannot become an invented diary result', async () => {
  await assert.rejects(estimateWithGemini('Translate', { apiKey: 'test', audio: fixture(), fetchImpl: async () =>
    Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ ...meal, isFood: false, needsClarification: true }) }] } }] }) }), e => e.code === 'MORE_DETAIL_NEEDED');
});

test('voice HTTP gate gives free and Plus three independent uses and keeps Pro unlimited', async () => {
  const ledger = new QuotaLedger(':memory:');
  let calls = 0;
  const server = createApiServer({ ledger, origins: ['http://localhost:8081'],
    authenticate: async token => {
      if (!['free', 'free-limit', 'plus', 'pro'].includes(token)) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in.');
      return { uid: token, tier: token === 'free-limit' ? 'free' : token, used: 2, voiceUsed: token === 'free-limit' ? 3 : 2 };
    },
    estimate: async (_text, image, previous, audio) => { calls++; assert.equal(image, undefined); assert.equal(previous, undefined); assert.equal(audio.mimeType, 'audio/wav'); return validateEstimate(meal); },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/v1/nutrition/voice';
  const send = (token, data = fixture()) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ text: '', audio: data, tier: 'pro' }) });
  try {
    assert.equal((await send('forged')).status, 401);
    const free = await send('free');
    assert.equal(free.status, 200);
    assert.equal((await free.json()).voiceChecksUsed, 3);
    const plus = await send('plus');
    assert.equal(plus.status, 200);
    assert.equal((await plus.json()).voiceChecksUsed, 3);
    assert.equal((await send('free-limit')).status, 402);
    assert.equal((await send('pro', { mimeType: 'audio/wav', data: 'bad' })).status, 400);
    const response = await send('pro');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.estimate.englishText, meal.englishText);
    assert.equal(body.voiceChecksUsed, 2);
    assert.equal(body.aiChecksUsed, undefined);
    assert.equal(body.audio, undefined);
    assert.equal(calls, 3);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); ledger.close(); }
});
