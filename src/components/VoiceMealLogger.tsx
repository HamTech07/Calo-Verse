import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useMealRecorder } from '../hooks/useMealRecorder';
import { askNutritionAi, askVoiceNutrition, type LiveEstimate } from '../services/nutritionAi';
import { ClayCard, PrimaryButton } from './ui';
import { colors, typography } from '../theme';
import type { Food, MealType, Tier } from '../types';

type Props = { tier: Tier; voiceChecksUsed: number; onUpgrade: () => void; onVoiceUsage: (used: number) => void; onAddFood: (food: Food, meal?: MealType, note?: string) => void };
export function VoiceMealLogger(props: Props) {
  return <ClayCard style={styles.card}>
    <Text style={styles.title}>Multilingual voice AI</Text>
    {props.tier !== 'pro' && props.voiceChecksUsed >= 3 ? <>
      <Text style={styles.body}>Your 3 free voice estimates are used. Text entry and manual calorie logging remain available.</Text>
      <PrimaryButton label="Unlock unlimited Pro voice" onPress={props.onUpgrade} icon="mic-outline" />
    </> : <VoiceRecorder {...props} />}
  </ClayCard>;
}
function VoiceRecorder({ tier, voiceChecksUsed, onAddFood, onVoiceUsage }: Props) {
  const recorder = useMealRecorder();
  const player = useAudioPlayer(recorder.clip?.uri ?? null);
  const playback = useAudioPlayerStatus(player);
  const [estimate, setEstimate] = useState<LiveEstimate | null>(null);
  const [translation, setTranslation] = useState('');
  const [meal, setMeal] = useState<MealType>('lunch');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const operation = useRef(false);
  const added = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const captureBusy = ['preparing', 'recording', 'processing'].includes(recorder.phase);
  const stale = !!estimate && translation.trim() !== estimate.englishText;
  const clearResult = () => { setEstimate(null); setTranslation(''); setSaved(false); added.current = false; setError(''); };
  const start = () => { if (operation.current || captureBusy) return; player.pause(); clearResult(); void recorder.start(); };
  const discard = () => { if (operation.current) return; player.pause(); recorder.discard(); clearResult(); };
  const send = async (corrected = false) => {
    if (operation.current || saved || captureBusy || (!corrected && !recorder.clip) || (corrected && !translation.trim())) return;
    operation.current = true; setBusy(true); setError(''); player.pause();
    try {
      const response = corrected ? await askNutritionAi(translation.trim()) : await askVoiceNutrition({ mimeType: recorder.clip!.mimeType, data: recorder.clip!.data });
      if (!corrected) onVoiceUsage((response as Awaited<ReturnType<typeof askVoiceNutrition>>).voiceChecksUsed);
      if (!alive.current) return;
      setEstimate(response.estimate); setTranslation(response.estimate.englishText);
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Voice AI is unavailable. Please try text input.'); }
    finally { operation.current = false; if (alive.current) setBusy(false); }
  };
  const add = () => {
    if (!estimate || stale || busy || added.current || error) return;
    added.current = true;
    try {
      const food: Food = { id: 'voice-' + Date.now(), name: estimate.name, region: 'AI meal estimate',
        brand: 'Gemini voice estimate', isBranded: false, portionSize: estimate.portion,
        calories: estimate.calories, protein: estimate.protein, carbs: estimate.carbs, fats: estimate.fats, fiber: estimate.fiber,
        processingLevel: 'Not assessed', accessTier: 'free', image: require('../../assets/food-biryani.jpg') };
      onAddFood(food, meal, estimate.englishText + '. ' + estimate.explanation + ' Approximate AI nutrition estimate.');
      setSaved(true); player.pause();
    } catch { added.current = false; setError('The meal could not be added. Please try again.'); }
  };
  return <View style={styles.content}>
    <Text style={styles.body}>Say what you ate, how much, and any oil or sauces. Speak in your language; review the English translation before saving.</Text>
    <Text style={styles.label}>{tier === 'pro' ? 'Unlimited voice estimates' : `${Math.max(0, 3 - voiceChecksUsed)} of 3 free voice estimates remaining`}</Text>
    <Text style={styles.notice}>Recording stays on this device until you press Send voice to Gemini. Google free-tier audio may be used to improve products. Avoid personal details or other people's voices. Raw audio is not saved to your diary.</Text>
    {recorder.phase === 'recording' ? <>
      <Text accessibilityLiveRegion="polite" style={styles.recording}>● Recording · {recorder.seconds}s / 45s</Text>
      <PrimaryButton label="Stop recording" onPress={() => { void recorder.stop(); }} icon="stop-circle-outline" />
    </> : <PrimaryButton label={recorder.clip ? 'Record again' : 'Record meal'} onPress={start} disabled={busy || captureBusy} loading={recorder.phase === 'preparing'} icon="mic-outline" />}
    {recorder.phase === 'processing' ? <Text style={styles.body}>Preparing your recording…</Text> : null}
    {recorder.clip ? <>
      <Text style={styles.body}>Voice note ready · {Math.round(recorder.clip.seconds)} seconds</Text>
      <PrimaryButton label={playback.playing ? 'Pause recording preview' : 'Play recording preview'} compact disabled={busy || captureBusy} onPress={() => { if (playback.playing) player.pause(); else { void player.seekTo(0); player.play(); } }} icon={playback.playing ? 'pause' : 'play'} />
      <PrimaryButton label="Send voice to Gemini" onPress={() => { void send(); }} disabled={saved || captureBusy} loading={busy} icon="sparkles-outline" />
    </> : null}
    {estimate ? <View style={styles.result}>
      <Text style={styles.label}>English meal text — review or correct</Text>
      <TextInput accessibilityLabel="English voice translation" value={translation} onChangeText={setTranslation} multiline maxLength={2000} editable={!busy && !saved} style={styles.input} />
      {stale ? <><Text style={styles.notice}>Text changed. Update the estimate before saving.</Text><PrimaryButton label="Re-estimate corrected text" onPress={() => { void send(true); }} disabled={saved} loading={busy} /></> : null}
      <Text style={styles.title}>{estimate.name} · {estimate.calories} kcal</Text>
      <Text style={styles.label}>Likely range: {estimate.caloriesLow}–{estimate.caloriesHigh} kcal · conservative value will be logged</Text>
      <Text style={styles.body}>{estimate.portion} · {estimate.confidence} confidence</Text>
      <Text style={styles.body}>Protein {estimate.protein} g · Carbs {estimate.carbs} g · Fat {estimate.fats} g · Fiber {estimate.fiber} g</Text>
      <Text style={styles.body}>{estimate.explanation}</Text>
      <Text style={styles.label}>Add to</Text>
      <View style={styles.meals}>{(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(slot => <Pressable key={slot} accessibilityRole="button" accessibilityState={{ selected: slot === meal }} disabled={busy || saved} onPress={() => setMeal(slot)} style={[styles.meal, slot === meal && styles.selected]}><Text style={styles.body}>{slot[0].toUpperCase() + slot.slice(1)}</Text></Pressable>)}</View>
      <PrimaryButton label={saved ? 'Added to your diary' : 'Add to ' + meal} onPress={add} disabled={saved || stale || busy || !!error} icon={saved ? 'checkmark' : 'add'} />
      <Text style={styles.body}>{saved ? 'Saved once in English. Remove this diary entry before logging a correction.' : 'An approximate estimate, not a measured nutrition result.'}</Text>
    </View> : null}
    {recorder.clip || captureBusy ? <PrimaryButton label={saved ? 'Clear recording' : 'Discard recording'} onPress={discard} disabled={busy} compact icon="trash-outline" /> : null}
    {error || recorder.error ? <Text accessibilityRole="alert" style={styles.error}>{error || recorder.error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 18, gap: 12 }, content: { gap: 12 }, result: { gap: 10, borderTopWidth: 1, borderColor: colors.outline, paddingTop: 14 },
  title: { ...typography.heading, fontSize: 18, color: colors.primaryDark },
  label: { ...typography.label, color: colors.ink },
  body: { ...typography.body, fontSize: 12, lineHeight: 18, color: colors.muted },
  notice: { ...typography.body, fontSize: 11, lineHeight: 17, color: colors.muted },
  recording: { ...typography.label, color: '#A13628', fontSize: 16 },
  input: { ...typography.body, padding: 12, minHeight: 84, textAlignVertical: 'top', borderRadius: 14, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface, color: colors.ink },
  meals: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meal: { padding: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.outline },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  error: { ...typography.body, fontSize: 12, lineHeight: 18, color: '#A13628' },
});
