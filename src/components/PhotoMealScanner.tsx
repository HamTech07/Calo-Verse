import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ClayCard, FoodImage, PrimaryButton, SecondaryButton } from './ui';
import { NutrientInfoCard, type Nutrient } from './PlanDialogs';
import { MACRO_BACKGROUNDS } from '../data/foods';
import { askPhotoNutrition, type LiveEstimate } from '../services/nutritionAi';
import { colors, typography } from '../theme';
import type { Tier, Food, MealType } from '../types';

type PreparedPhoto = { uri: string; data: string; mimeType: 'image/jpeg' };
type Props = {
  tier: Tier;
  scansUsed: number;
  trialStartedAt: string;
  surface: 'daily' | 'scan';
  onUpgrade: () => void;
  onScanUsage: (used: number) => void;
  onAddFood: (food: Food, mealType?: MealType, note?: string) => void;
};

// Photo state is temporary (native tools may use device cache); diary data never includes the photo.
export function PhotoMealScanner({ tier, scansUsed, trialStartedAt, surface, onUpgrade, onScanUsage, onAddFood }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const alive = useRef(true);
  const working = useRef(false);
  const selection = useRef(0);
  const [open, setOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [estimate, setEstimate] = useState<LiveEstimate | null>(null);
  const [estimatedNotes, setEstimatedNotes] = useState('');
  const [previousCalories, setPreviousCalories] = useState<number | null>(null);
  const [meal, setMeal] = useState<MealType>('lunch');
  const [saved, setSaved] = useState(false);
  const savedRef = useRef(false);
  const stale = estimate !== null && notes.trim() !== estimatedNotes;
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; selection.current++; };
  }, []);

  const elapsed = Date.now() - Date.parse(trialStartedAt);
  const expired = !Number.isFinite(elapsed) || elapsed < 0 || elapsed >= 30 * 86400000;
  const locked = tier !== 'pro' && (surface === 'daily' || expired);
  const closeCamera = (cancel = true) => { if (cancel) selection.current++; setOpen(false); setCameraReady(false); };
  const beginCamera = async () => {
    if (working.current) return;
    if (locked) { onUpgrade(); return; }
    working.current = true; setBusy(true);
    setError('');
    try {
      const access = permission?.granted ? permission : await requestPermission();
      if (!alive.current) return;
      if (!access.granted) { setError('Camera access is off. Allow it in browser or device settings, or choose a photo instead.'); return; }
      setCameraReady(false);
      setOpen(true);
    } catch { if (alive.current) setError('Camera is unavailable. Use Choose photo instead.'); }
    finally { working.current = false; if (alive.current) setBusy(false); }
  };
  const prepare = async (uri: string, width: number, height: number, request: number) => {
    if (!alive.current || request !== selection.current) return;
    working.current = true; setBusy(true); setError('');
    try {
      const actions = Math.max(width, height) > 1280
        ? [{ resize: width >= height ? { width: 1280 } : { height: 1280 } }] : [];
      const result = await manipulateAsync(uri, actions, { format: SaveFormat.JPEG, compress: 0.8, base64: true });
      if (!result.base64 || result.base64.length > 5592408) throw new Error('Photo too large');
      if (alive.current && request === selection.current) {
        setPhoto({ uri: result.uri, data: result.base64, mimeType: 'image/jpeg' });
        setNotes(''); setEstimate(null); setPreviousCalories(null); setSaved(false); savedRef.current = false;
      }
    } catch {
      if (alive.current && request === selection.current) setError('This photo could not be prepared. Choose a smaller, clear food photo.');
    } finally {
      working.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const choosePhoto = () => {
    if (working.current) return;
    if (locked) { onUpgrade(); return; }
    const request = ++selection.current;
    setError('');
    // Launch directly from the click, as required on web. Cancellation must not lock the UI.
    void ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 }).then(async result => {
      if (result.canceled || !alive.current || request !== selection.current) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 20 * 1024 * 1024) {
        setError('Choose a photo smaller than 20 MB.'); return;
      }
      await prepare(asset.uri, asset.width, asset.height, request);
    }).catch(() => { if (alive.current) setError('Photo selection is unavailable. Please try again.'); });
  };
  const capture = async () => {
    if (!cameraReady || !camera.current || working.current) return;
    working.current = true; setBusy(true);
    const request = ++selection.current;
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.85 });
      if (!alive.current || !shot || request !== selection.current) return;
      closeCamera(false);
      await prepare(shot.uri, shot.width, shot.height, request);
    } catch { if (alive.current) setError('The photo could not be captured. Try again or choose a photo.'); }
    finally { working.current = false; if (alive.current) setBusy(false); }
  };
  const analyze = async () => {
    if (!photo || working.current || savedRef.current) return;
    working.current = true; setBusy(true); setError('');
    const submittedNotes = notes.trim();
    try {
      // Only this explicit user action sends the selected food photo to Google.
      const result = await askPhotoNutrition(submittedNotes, { mimeType: photo.mimeType, data: photo.data }, surface);
      onScanUsage(result.scansUsed);
      if (!alive.current) return;
      setPreviousCalories(estimate?.calories ?? null);
      setEstimate(result.estimate);
      setEstimatedNotes(submittedNotes);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'AI could not estimate this photo. Please try again.');
    } finally { working.current = false; if (alive.current) setBusy(false); }
  };
  const addMeal = () => {
    if (!estimate || stale || working.current || savedRef.current || error) return;
    savedRef.current = true;
    try {
      const food: Food = {
        id: 'photo-' + Date.now(), name: estimate.name, region: 'AI meal estimate',
        brand: 'Gemini photo + text estimate', isBranded: false, portionSize: estimate.portion,
        calories: estimate.calories, protein: estimate.protein, carbs: estimate.carbs,
        fats: estimate.fats, fiber: estimate.fiber, processingLevel: 'Not assessed',
        accessTier: 'free', image: '',
      };
      onAddFood(food, meal, estimate.englishText + '. ' + estimate.explanation + ' AI estimate; portion and recipe variations apply.');
      setSaved(true);
    } catch { savedRef.current = false; setError('The meal could not be added. Please try again.'); }
  };
  return (
    <ClayCard style={styles.card}>
      <Text style={styles.title}>Camera + text meal logger</Text>
      <Text style={styles.body}>{surface === 'daily' ? 'Pro camera meal logging' : tier === 'pro' ? 'Pro photo scans' : Math.max(0, 3 - scansUsed) + ' photo scans remaining · 3-day trial'}</Text>
      {locked ? <>
        <Text style={styles.body}>{surface === 'daily' ? 'Scan a meal and add preparation details with Pro. Trial scans are available on the Scan tab.' : 'Your photo trial has ended. Manual food search and calorie logging remain available.'}</Text>
        <PrimaryButton label="View Pro plan" onPress={onUpgrade} icon="lock-closed-outline" />
      </> : <>
        <Text style={styles.body}>Photograph only your food. Add the portion, oil, ghee or sauces so they can be included in the estimate.</Text>
        {photo ? <Image source={{ uri: photo.uri }} accessibilityLabel="Selected food photo preview" style={styles.preview} resizeMode="cover" /> :
          <View style={styles.placeholder}><Text style={styles.body}>Your food photo will appear here</Text></View>}
        <View style={styles.actions}>
          <PrimaryButton label="Open camera" onPress={() => { void beginCamera(); }} disabled={busy} compact icon="camera-outline" />
          <PrimaryButton label="Choose photo" onPress={choosePhoto} disabled={busy} compact icon="images-outline" />
        </View>
        {busy ? <Text accessibilityLiveRegion="polite" style={styles.body}>Working on your photo…</Text> : null}
        <Text style={styles.label}>Portion and preparation details</Text>
        <TextInput accessibilityLabel="Photo preparation details" placeholder="Example: 1 bowl of nihari with 1 tablespoon of extra ghee" value={notes} onChangeText={setNotes} maxLength={2000} multiline editable={!busy && !saved} style={styles.input} placeholderTextColor={colors.muted} />
        <Text style={styles.body}>Send shares this food photo and your notes with Google Gemini. Free-tier inputs may be used by Google to improve products. Do not include faces or private information. Calo Verse saves only the English estimate, not your photo.</Text>
        <PrimaryButton label={estimate ? 'Send updated details to Gemini' : 'Send to Gemini'} disabled={!photo || saved} loading={busy} onPress={() => { void analyze(); }} icon="sparkles-outline" />
        <Text style={styles.body}>One successful new photo uses one trial scan. Refining the same photo does not use another scan, while your trial is active. Failed estimates do not use a scan.</Text>
        {estimate ? <View style={styles.result}>
          <Text style={styles.title}>{estimate.name}</Text>
          <Text style={styles.calories}>{estimate.calories} kcal</Text>
          <Text style={styles.body}>{estimate.portion} · {estimate.confidence} confidence</Text>
          {previousCalories !== null ? <Text style={styles.label}>{estimate.calories - previousCalories >= 0 ? '+' : ''}{Math.round((estimate.calories - previousCalories) * 10) / 10} kcal compared with the previous estimate</Text> : null}
          <Text style={styles.body}>{estimate.explanation}</Text>
          <View style={styles.macros}>
            {(['protein', 'carbs', 'fats', 'fiber'] as Nutrient[]).map(nutrient => <NutrientInfoCard key={nutrient} nutrient={nutrient} style={styles.macro}>
              <FoodImage source={MACRO_BACKGROUNDS[nutrient]} style={StyleSheet.absoluteFillObject} />
              <View style={styles.macroShade}><Text style={styles.macroText}>{nutrient === 'fats' ? 'Fat' : nutrient[0].toUpperCase() + nutrient.slice(1)}</Text><Text style={styles.macroValue}>{estimate[nutrient]} g</Text></View>
            </NutrientInfoCard>)}
          </View>
          {stale ? <Text accessibilityLiveRegion="polite" style={styles.error}>Details changed. Send the updated details before adding this meal.</Text> : null}
          <Text style={styles.label}>Add to</Text>
          <View style={styles.actions}>{(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(slot => <Pressable key={slot} accessibilityRole="button" accessibilityState={{ selected: meal === slot, disabled: saved || busy }} disabled={saved || busy} onPress={() => setMeal(slot)} style={[styles.meal, meal === slot && styles.selectedMeal]}><Text style={styles.body}>{slot[0].toUpperCase() + slot.slice(1)}</Text></Pressable>)}</View>
          <PrimaryButton label={saved ? 'Added to your diary' : 'Add ' + estimate.calories + ' kcal to ' + meal} disabled={saved || stale || busy || !!error} onPress={addMeal} icon={saved ? 'checkmark' : 'add'} />
          <Text accessibilityLiveRegion="polite" style={styles.body}>{saved ? 'Saved once. To correct this entry, remove it from your diary before logging it again.' : 'An approximate estimate, not an exact measurement. Review the portion before adding.'}</Text>
        </View> : null}
        {photo ? <SecondaryButton label={saved ? "Start another meal" : "Discard photo and notes"} onPress={() => { if (working.current) return; selection.current++; setPhoto(null); setNotes(''); setError(''); setEstimate(null); setPreviousCalories(null); setSaved(false); savedRef.current = false; }} compact /> : null}
      </>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Modal visible={open} animationType="fade" onRequestClose={() => closeCamera()}>
        <View style={styles.cameraPage}>
          {open && permission?.granted ? <CameraView ref={camera} style={styles.camera} facing="back" onCameraReady={() => setCameraReady(true)} onMountError={() => { closeCamera(); setError('Camera could not start. Close other camera apps, check permissions, or choose a photo.'); }} /> : null}
          <View style={styles.cameraActions}>
            <Text style={styles.cameraHint}>Frame only your food. Nothing is uploaded.</Text>
            <PrimaryButton label="Capture food photo" onPress={() => { void capture(); }} disabled={!cameraReady || busy} loading={busy} icon="camera" />
            <SecondaryButton label="Close camera" onPress={() => closeCamera()} />
          </View>
        </View>
      </Modal>
    </ClayCard>
  );
}
const styles = StyleSheet.create({
  card: { gap: 12, padding: 18 },
  title: { ...typography.heading, fontSize: 18, color: colors.primaryDark },
  body: { ...typography.body, fontSize: 12, lineHeight: 18, color: colors.muted },
  label: { ...typography.label, color: colors.ink },
  preview: { width: '100%', height: 190, borderRadius: 18 },
  placeholder: { minHeight: 120, padding: 20, borderRadius: 18, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 84, borderWidth: 1, borderColor: colors.outline, borderRadius: 16, padding: 12, color: colors.ink, backgroundColor: colors.surface, textAlignVertical: 'top', ...typography.body },
  error: { ...typography.body, color: '#A13628', fontSize: 12, lineHeight: 18 },
  result: { gap: 10, paddingTop: 10, borderTopWidth: 1, borderColor: colors.outline },
  calories: { ...typography.heading, fontSize: 30, color: colors.primary },
  macros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macro: { width: '47%', minHeight: 80, borderRadius: 14, overflow: 'hidden' },
  macroShade: { flex: 1, padding: 12, backgroundColor: 'rgba(12,33,24,0.72)', justifyContent: 'center' },
  macroText: { ...typography.label, color: '#FFF', fontSize: 12 },
  macroValue: { ...typography.heading, color: '#FFF', fontSize: 20 },
  meal: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.outline },
  selectedMeal: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cameraPage: { flex: 1, backgroundColor: '#111' },
  camera: { flex: 1 },
  cameraActions: { padding: 24, gap: 12, backgroundColor: '#17211D' },
  cameraHint: { ...typography.body, color: '#FFF', textAlign: 'center' },
});
