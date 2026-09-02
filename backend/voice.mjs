import { parseBuffer } from 'music-metadata';
import { ApiError } from './gemini.mjs';

export async function prepareVoice(audio) {
  if (!audio || !['audio/wav', 'audio/m4a'].includes(audio.mimeType) || typeof audio.data !== 'string' ||
      audio.data.length > 2796204 || audio.data.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(audio.data)) {
    throw new ApiError(400, 'INVALID_AUDIO', 'Record a new voice note of up to 45 seconds.');
  }
  const bytes = Buffer.from(audio.data, 'base64');
  if (bytes.length < 44 || bytes.length > 2 * 1024 * 1024) throw new ApiError(413, 'AUDIO_TOO_LARGE', 'Record a shorter voice note.');
  const wav = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE';
  const mp4 = bytes.toString('ascii', 4, 8) === 'ftyp';
  if ((audio.mimeType === 'audio/wav' && !wav) || (audio.mimeType === 'audio/m4a' && !mp4)) throw new ApiError(400, 'INVALID_AUDIO', 'The recording format is invalid.');
  try {
    const { format } = await parseBuffer(bytes, { mimeType: wav ? 'audio/wav' : 'audio/mp4', size: bytes.length }, { duration: true, skipCovers: true });
    if (!Number.isFinite(format.duration) || format.duration < 0.5 || format.duration > 46 ||
        !format.codec || !format.sampleRate || format.sampleRate > 48000 || !format.numberOfChannels || format.numberOfChannels > 2) {
      throw new Error('Invalid recording');
    }
    return { mimeType: audio.mimeType, data: bytes.toString('base64') };
  } catch { throw new ApiError(400, 'INVALID_AUDIO', 'The recording could not be read or exceeded 45 seconds. Please record again.'); }
}

export function requireEnglishVoiceEstimate(estimate) {
  // English output may contain transliterated dish names, numbers, punctuation and Latin accents.
  for (const key of ['englishText', 'name', 'portion', 'explanation']) {
    if (typeof estimate?.[key] !== 'string' || [...estimate[key]].some(char => /\p{L}/u.test(char) && !/\p{Script=Latin}/u.test(char))) {
      throw new ApiError(502, 'TRANSLATION_FAILED', 'The English translation could not be completed. Please record again.');
    }
  }
  return estimate;
}
