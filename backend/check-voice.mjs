import { execFileSync } from 'node:child_process';
import { prepareVoice, requireEnglishVoiceEstimate } from './voice.mjs';
import { estimateWithGemini } from './gemini.mjs';
import { encodeVoiceWav } from '../src/utils/voiceWav.ts';

// Synthetic speech only: never opens a microphone or modifies an account.
const phrases = ['I ate two boiled eggs and one banana for breakfast.'];
try {
  for (const phrase of phrases) {
    const escaped = phrase.replaceAll("'", "''");
    const script = "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $stream = New-Object System.IO.MemoryStream; $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono); $synth.SetOutputToAudioStream($stream, $format); $synth.Speak('" + escaped + "'); $synth.SetOutputToNull(); [Convert]::ToBase64String($stream.ToArray()); $synth.Dispose(); $stream.Dispose()";
    const data = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', windowsHide: true, timeout: 20000, maxBuffer: 3 * 1024 * 1024 }).trim();
    // System.Speech writes raw PCM to AudioStream; wrap it as mono 16 kHz WAV.
    const pcm = Buffer.from(data, 'base64');
    const samples = new Float32Array(Math.floor(pcm.length / 2));
    for (let i = 0; i < samples.length; i++) samples[i] = pcm.readInt16LE(i * 2) / 32768;
    const audio = await prepareVoice({ mimeType: 'audio/wav', data: Buffer.from(encodeVoiceWav(samples)).toString('base64') });
    const result = requireEnglishVoiceEstimate(await estimateWithGemini('Translate the spoken meal into English and estimate nutrition.', {
      audio, apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    }));
    if (!/boiled eggs/i.test(result.englishText) || !/banana/i.test(result.englishText)) throw new Error('The food translation did not match the synthetic input.');
    console.log(JSON.stringify({ syntheticInput: phrase, englishText: result.englishText, calories: result.calories, source: result.source, diaryChanged: false }));
  }
  console.log('Other-language pronunciation and translation still require native-speaker recording tests. Only English desktop synthesis is installed.');
} catch (error) {
  console.error(error.code || 'VOICE_CHECK_FAILED', error.code ? error.message : 'Could not complete the synthetic voice check.');
  process.exitCode = 1;
}
