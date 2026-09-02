import { useEffect, useRef, useState } from 'react';
import { encodeVoiceWav } from '../utils/voiceWav';
import type { MealRecordingPhase, MealVoiceClip } from './mealRecorderTypes';

export function useMealRecorder() {
  const [phase, setPhase] = useState<MealRecordingPhase>('idle');
  const [clip, setClip] = useState<MealVoiceClip | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const owned = useRef({ generation: 0, alive: true, busy: false, stream: null as MediaStream | null, recorder: null as MediaRecorder | null, url: '', timer: undefined as ReturnType<typeof setTimeout> | undefined, clock: undefined as ReturnType<typeof setInterval> | undefined });
  const release = () => {
    const state = owned.current;
    clearTimeout(state.timer); clearInterval(state.clock);
    if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop();
    state.stream?.getTracks().forEach(track => track.stop());
    state.stream = null; state.recorder = null;
  };
  const discard = () => {
    const state = owned.current; state.generation++; release(); state.busy = false;
    if (state.url) URL.revokeObjectURL(state.url);
    state.url = '';
    if (state.alive) { setClip(null); setSeconds(0); setPhase('idle'); setError(''); }
  };
  useEffect(() => {
    owned.current.alive = true;
    const hidden = () => { if (document.hidden && owned.current.busy) discard(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { owned.current.alive = false; discard(); document.removeEventListener('visibilitychange', hidden); };
  }, []);
  const stop = () => { if (owned.current.recorder?.state === 'recording') release(); };
  const start = async () => {
    const state = owned.current;
    if (state.busy) return;
    discard(); state.busy = true; setPhase('preparing');
    const request = ++state.generation;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Microphone recording needs a supported browser on HTTPS or localhost.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!state.alive || request !== state.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      state.stream = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : undefined);
      state.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { if (state.alive && request === state.generation) { discard(); setError('The microphone stopped unexpectedly. Please record again.'); } };
      recorder.onstop = async () => {
        if (!state.alive || request !== state.generation) return;
        setPhase('processing');
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          if (!blob.size || blob.size > 2 * 1024 * 1024) throw new Error('Record a shorter voice note.');
          const decoder = new OfflineAudioContext(1, 1, 16000);
          const decoded = await decoder.decodeAudioData(await blob.arrayBuffer());
          if (decoded.duration < 0.5 || decoded.duration > 46) throw new Error('Record between 0.5 and 45 seconds.');
          const renderer = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
          const source = renderer.createBufferSource(); source.buffer = decoded; source.connect(renderer.destination); source.start();
          const mono = await renderer.startRendering();
          const wav = encodeVoiceWav(mono.getChannelData(0));
          const binary: string[] = [];
          for (let i = 0; i < wav.length; i += 8192) binary.push(String.fromCharCode(...wav.subarray(i, i + 8192)));
          if (!state.alive || request !== state.generation) return;
          const uri = URL.createObjectURL(new Blob([wav as BlobPart], { type: 'audio/wav' }));
          state.url = uri;
          setClip({ uri, data: btoa(binary.join('')), mimeType: 'audio/wav', seconds: decoded.duration }); setPhase('ready');
        } catch (e) { if (state.alive && request === state.generation) { setError(e instanceof Error ? e.message : 'This recording could not be read.'); setPhase('idle'); } }
        finally { if (request === state.generation) state.busy = false; }
      };
      recorder.start(); setPhase('recording');
      const began = Date.now();
      state.clock = setInterval(() => { if (state.alive && request === state.generation) setSeconds(Math.min(45, Math.floor((Date.now() - began) / 1000))); }, 250);
      state.timer = setTimeout(stop, 45000);
    } catch (e) {
      if (request === state.generation) release();
      if (state.alive && request === state.generation) { state.busy = false; setPhase('idle'); setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Microphone access is off. Allow it in browser settings, or use text input.' : e instanceof Error ? e.message : 'Microphone unavailable. Use text input instead.'); }
    }
  };
  return { phase, clip, seconds, error, start, stop, discard };
}
