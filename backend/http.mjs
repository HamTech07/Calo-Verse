import { createServer } from 'node:http';
import { ApiError } from './gemini.mjs';
import { preparePhoto } from './photo.mjs';
import { prepareVoice, requireEnglishVoiceEstimate } from './voice.mjs';
import { activeTier, publicSubscription } from './subscriptions.mjs';

export function createApiServer({ authenticate, estimate, ledger, subscriptions, origins, configured = true }) {
  const reply = (res, status, value) => {
    if (!res.destroyed) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)); }
  };
  const server = createServer(async (req, res) => {
    try {
      const origin = req.headers.origin;
      if (origin && !origins.includes(origin)) throw new ApiError(403, 'ORIGIN_DENIED', 'This app origin is not allowed.');
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' }); res.end(); return;
      }
      if (req.url === '/health' && req.method === 'GET') return reply(res, 200, { status: 'ok', aiConfigured: configured, mode: 'local-development' });
      if (['/v1/subscription', '/v1/subscription/redeem', '/v1/admin/subscriptions'].includes(req.url)) {
        const isRedeem = req.url === '/v1/subscription/redeem';
        if (req.method !== (isRedeem ? 'POST' : 'GET')) throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
        const bearer = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
        if (!bearer || bearer.length > 12000) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Please sign in.');
        const account = await authenticate(bearer);
        if (req.url === '/v1/admin/subscriptions') {
          if (!account.isAdmin) throw new ApiError(403, 'ADMIN_REQUIRED', 'This page is restricted to the app administrator.');
          if (!subscriptions) throw new ApiError(503, 'SUBSCRIPTIONS_NOT_CONFIGURED', 'Subscription setup is pending.');
          return reply(res, 200, await subscriptions.report());
        }
        if (!isRedeem) {
          return reply(res, 200, { tier: account.tier, isAdmin: !!account.isAdmin,
            available: !!subscriptions?.db, subscription: publicSubscription(account.subscription) });
        }
        if (!req.headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'INVALID_CONTENT_TYPE', 'Send JSON.');
        if (Number(req.headers['content-length'] || 0) > 1024) throw new ApiError(413, 'INPUT_TOO_LARGE', 'The request is too large.');
        const chunks = []; let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 1024) throw new ApiError(413, 'INPUT_TOO_LARGE', 'The request is too large.');
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ApiError(400, 'INVALID_JSON', 'Invalid request.'); }
        if (!body || !['plus', 'pro'].includes(body.tier) || typeof body.code !== 'string' || body.code.length > 64) throw new ApiError(400, 'INVALID_INPUT', 'Enter a promo code and choose Plus or Pro.');
        if (!subscriptions) throw new ApiError(503, 'SUBSCRIPTIONS_NOT_CONFIGURED', 'Subscription setup is pending.');
        const subscription = await subscriptions.redeem(account, body);
        return reply(res, 200, { tier: activeTier(subscription), subscription: publicSubscription(subscription), isAdmin: !!account.isAdmin, available: true });
      }
      const isPhoto = req.url === '/v1/nutrition/photo';
      const isVoice = req.url === '/v1/nutrition/voice';
      if ((!isPhoto && !isVoice && req.url !== '/v1/nutrition/estimate') || req.method !== 'POST') throw new ApiError(404, 'NOT_FOUND', 'Endpoint not found.');
      if (!req.headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'INVALID_CONTENT_TYPE', 'Send a JSON request.');
      const bearer = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
      if (!bearer || bearer.length > 12000) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Please sign in before using AI.');
      const account = await authenticate(bearer);
      const limit = isPhoto ? 5605000 : isVoice ? 2808000 : 12000;
      if (Number(req.headers['content-length'] ?? 0) > limit) throw new ApiError(413, 'INPUT_TOO_LARGE', 'The request is too large. Use a smaller photo or shorter description.');
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > limit) throw new ApiError(413, 'INPUT_TOO_LARGE', 'The request is too large. Use a smaller photo or shorter description.');
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ApiError(400, 'INVALID_JSON', 'Invalid request.'); }
      if (!body || typeof body.text !== 'string' || (!isPhoto && !isVoice && !body.text.trim()) || body.text.length > 2000) throw new ApiError(400, 'INVALID_INPUT', 'Enter a food description of up to 2,000 characters.');
      if (isPhoto && !['scan', 'daily'].includes(body.surface)) throw new ApiError(400, 'INVALID_INPUT', 'Choose a scan location.');
      const image = isPhoto ? await preparePhoto(body.image) : undefined;
      const audio = isVoice ? await prepareVoice(body.audio) : undefined;
      const reservation = ledger.begin(account.uid, account.tier, isPhoto ? account.scansUsed : isVoice ? account.voiceUsed : account.used, Date.now(),
        isPhoto ? { hash: image.hash, surface: body.surface, trialStartedAt: account.trialStartedAt } : null, isVoice);
      try {
        const previous = isPhoto ? ledger.previousPhotoEstimate(account.uid, image.hash) : undefined;
        const result = await estimate(isVoice ? 'Translate the spoken meal into English and estimate its nutrition. Do not invent words for silence or unclear speech.' : body.text.trim() || 'Estimate the food in this photo. State your portion assumptions.', image, previous, audio);
        if (isVoice) requireEnglishVoiceEstimate(result);
        const used = reservation.finish(true, isPhoto ? result : undefined);
        reply(res, 200, { estimate: result, ...(isPhoto ? { scansUsed: used } : isVoice ? { voiceChecksUsed: used } : { aiChecksUsed: used }) });
      } catch (error) { reservation.finish(false); throw error; }
    } catch (error) {
      const safe = error instanceof ApiError ? error : new ApiError(503, 'SERVICE_UNAVAILABLE', 'The AI service is unavailable. Please try again later.');
      reply(res, safe.status, { code: safe.code, error: safe.message });
    }
  });
  server.requestTimeout = 35000;
  server.headersTimeout = 10000;
  server.timeout = 40000;
  return server;
}
