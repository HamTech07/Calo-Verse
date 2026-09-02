import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import type { MealRecordingPhase, MealVoiceClip } from './mealRecorderTypes';

export function useMealRecorder() {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, sampleRate: 16000, bitRate: 64000 });
  const [phase, setPhase] = useState<MealRecordingPhase>('idle');
  const [clip, setClip] = useState<MealVoiceClip | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const state = useRef({ generation: 0, alive: true, busy: false, recording: false, uri: '', began: 0, timer: undefined as ReturnType<typeof setTimeout> | undefined, clock: undefined as ReturnType<typeof setInterval> | undefined });
  const removeOwnedFile = (uri: string) => { if (uri && uri.startsWith(Paths.cache.uri)) { try { new File(uri).delete(); } catch { /* Cache cleanup is best effort. */ } } };
  const stop = async (save = true) => {
    const current = state.current;
    if (!current.recording) return;
    current.recording = false; clearTimeout(current.timer); clearInterval(current.clock);
    const request = current.generation;
    if (current.alive) setPhase('processing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      await setAudioModeAsync({ allowsRecording: false });
      if (!uri) throw new Error('No recording was captured.');
      if (!save || !current.alive || request !== current.generation) { removeOwnedFile(uri); return; }
      current.uri = uri;
      const file = new File(uri);
      if (!file.size || file.size > 2 * 1024 * 1024) throw new Error('Record a shorter voice note.');
      const data = await file.base64();
      if (!current.alive || request !== current.generation) { removeOwnedFile(uri); return; }
      setClip({ uri, data, mimeType: 'audio/m4a', seconds: Math.min(45, (Date.now() - current.began) / 1000) }); setPhase('ready');
    } catch (e) { if (current.alive && request === current.generation) { setPhase('idle'); setError(e instanceof Error ? e.message : 'Recording could not be prepared.'); } }
    finally {
      try { await setAudioModeAsync({ allowsRecording: false }); } catch {}
      current.busy = false;
      if (current.alive && (!save || request !== current.generation)) setPhase('idle');
    }
  };
  const discard = () => {
    const current = state.current; current.generation++; clearTimeout(current.timer); clearInterval(current.clock);
    if (current.recording) void stop(false);
    removeOwnedFile(current.uri); current.uri = '';
    if (current.alive) { setClip(null); setSeconds(0); setPhase(current.busy ? 'processing' : 'idle'); setError(''); }
  };
  useEffect(() => {
    state.current.alive = true;
    const subscription = AppState.addEventListener('change', next => { if (next !== 'active' && state.current.recording) discard(); });
    return () => { state.current.alive = false; discard(); subscription.remove(); };
  }, [recorder]);
  const start = async () => {
    const current = state.current;
    if (current.busy) return;
    discard(); current.busy = true; setPhase('preparing');
    const request = ++current.generation;
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!current.alive || request !== current.generation) return;
      if (!permission.granted) throw new Error('Microphone access is off. Allow it in device settings, or use text input.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: false });
      await recorder.prepareToRecordAsync();
      if (!current.alive || request !== current.generation || AppState.currentState !== 'active') {
        try { await recorder.stop(); } catch {} await setAudioModeAsync({ allowsRecording: false }); return;
      }
      recorder.record(); current.recording = true; current.began = Date.now(); setPhase('recording');
      current.clock = setInterval(() => { if (current.alive) setSeconds(Math.min(45, Math.floor((Date.now() - current.began) / 1000))); }, 250);
      current.timer = setTimeout(() => { void stop(); }, 45000);
    } catch (e) {
      try { await setAudioModeAsync({ allowsRecording: false }); } catch {}
      if (current.alive && request === current.generation) { current.busy = false; setPhase('idle'); setError(e instanceof Error ? e.message : 'Microphone unavailable.'); }
    } finally {
      if (!current.recording) current.busy = false;
      if (current.alive && request !== current.generation) setPhase('idle');
    }
  };
  return { phase, clip, seconds, error, start, stop, discard };
}
