import { preparePhoto } from './photo.mjs';
import { estimateWithGemini } from './gemini.mjs';

// Public sample already referenced by the app, not a user's personal photo.
// This smoke test does not touch account quotas or the meal diary.
const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Nalli_Nihari_India.jpg/960px-Nalli_Nihari_India.jpg';
try {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'CaloVerseDevelopmentCheck/1.0' } });
  if (!response.ok) throw new Error('Sample photo download failed (' + response.status + ').');
  const image = await preparePhoto({ mimeType: 'image/jpeg', data: Buffer.from(await response.arrayBuffer()).toString('base64') });
  const options = { image, apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite' };
  const base = await estimateWithGemini('One bowl of this nihari, approximately 250 g. No additional ghee topping.', options);
  const refined = await estimateWithGemini('The same meal and portions as before, plus 1 tablespoon of additional ghee topping. Include only that extra ghee in the revised full total.', { ...options, previousEstimate: base });
  console.log(JSON.stringify({ source: base.source, dish: base.name, baseCalories: base.calories, refinedCalories: refined.calories, explanation: refined.explanation, diaryChanged: false }));
} catch (error) {
  console.error(error.code || 'PHOTO_CHECK_FAILED', error.code ? error.message : 'Could not complete the public sample photo check.');
  process.exitCode = 1;
}
