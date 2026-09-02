import { estimateWithGemini, ApiError } from './gemini.mjs';
try {
  const result = await estimateWithGemini('For lunch I ate one bowl (250 g) of beef nihari with one additional tablespoon of ghee.', { apiKey: process.env.GEMINI_API_KEY });
  console.log(JSON.stringify({ ok: true, estimate: result }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error instanceof ApiError ? error.code : 'CONNECTION_FAILED', message: error instanceof ApiError ? error.message : 'Unable to connect.' }));
  process.exitCode = 1;
}
