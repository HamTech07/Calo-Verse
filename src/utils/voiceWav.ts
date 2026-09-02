// Mono PCM WAV, 16-bit little endian. Shared by web recording and deterministic tests.
export function encodeVoiceWav(samples: Float32Array, sampleRate = 16000): Uint8Array {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 48000 || samples.length < sampleRate / 2 || samples.length > sampleRate * 46) throw new Error('Record between 0.5 and 45 seconds.');
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const word = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  word(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); word(8, 'WAVE'); word(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  word(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((value, i) => { const x = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0; view.setInt16(44 + i * 2, x < 0 ? Math.round(x * 32768) : Math.round(x * 32767), true); });
  return bytes;
}
