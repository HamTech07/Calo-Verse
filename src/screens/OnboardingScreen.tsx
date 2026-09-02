import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ClayCard, Field, LogoMark, PrimaryButton, SecondaryButton } from '../components/ui';
import { colors, fonts, softShadow, typography } from '../theme';
import { ActivityId, Gender, Goal, Profile } from '../types';
import { activityOptions, goalOptions } from '../utils/nutrition';

const genderOptions: Array<{
  id: Gender;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { id: 'male', title: 'Male', icon: 'male' },
  { id: 'female', title: 'Female', icon: 'female' },
  { id: 'other', title: 'Other', icon: 'male-female' },
];

export function OnboardingScreen({
  name,
  email,
  onComplete,
}: {
  name: string;
  email: string;
  onComplete: (profile: Profile) => void;
}) {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState('30');
  const [height, setHeight] = useState('175');
  const [weight, setWeight] = useState('70');
  const [activity, setActivity] = useState<ActivityId>('light');
  const [goal, setGoal] = useState<Goal>('lose');
  const [error, setError] = useState('');

  const stepInfo = useMemo(
    () => [
      { label: 'Basics', title: 'Tell us about you', subtitle: 'We use these details to estimate your daily energy needs.' },
      { label: 'Movement', title: 'How active are you?', subtitle: 'Choose the option closest to your usual week.' },
      { label: 'Goal', title: 'What are we building?', subtitle: 'Your target stays flexible—you can change it any time.' },
    ],
    [],
  );

  const next = () => {
    if (step === 0) {
      const ageNumber = Number(age);
      const heightNumber = Number(height);
      const weightNumber = Number(weight);
      if (ageNumber < 16 || ageNumber > 90) {
        setError('Enter an age between 16 and 90.');
        return;
      }
      if (heightNumber < 120 || heightNumber > 230) {
        setError('Enter a height between 120 and 230 cm.');
        return;
      }
      if (weightNumber < 35 || weightNumber > 300) {
        setError('Enter a weight between 35 and 300 kg.');
        return;
      }
    }

    setError('');
    if (step < 2) {
      setStep(step + 1);
      return;
    }

    onComplete({
      name,
      email,
      gender,
      age: Number(age),
      heightCm: Number(height),
      weightKg: Number(weight),
      activity,
      goal,
    });
  };

  return (
    <LinearGradient colors={['#F7FAF6', '#EFF7F1', '#F9F7ED']} style={styles.page}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <LogoMark size={52} />
            <View style={styles.progressWrap}>
              <View style={styles.progressMeta}>
                <Text style={styles.progressText}>STEP {step + 1} OF 3</Text>
                <Text style={styles.progressLabel}>{stepInfo[step].label}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${((step + 1) / 3) * 100}%` }]} />
              </View>
            </View>
          </View>

          <View style={styles.heading}>
            <Text style={typography.title}>{stepInfo[step].title}</Text>
            <Text style={styles.subtitle}>{stepInfo[step].subtitle}</Text>
          </View>

          <ClayCard style={styles.card}>
            {step === 0 ? (
              <View style={styles.sectionGap}>
                <View style={styles.genderRow}>
                  {genderOptions.map((item) => {
                    const selected = gender === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setGender(item.id)}
                        style={({ pressed }) => [
                          styles.genderCard,
                          selected && styles.genderCardSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={28}
                          color={selected ? colors.primary : colors.ink}
                        />
                        <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{item.title}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.twoCol}>
                  <Field
                    label="Age"
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                    placeholder="30"
                    suffix="yrs"
                  />
                  <Field
                    label="Height"
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="number-pad"
                    placeholder="175"
                    suffix="cm"
                  />
                </View>
                <Field
                  label="Weight"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="70"
                  suffix="kg"
                />
              </View>
            ) : null}

            {step === 1 ? (
              <View style={styles.optionList}>
                {activityOptions.map((item, index) => {
                  const selected = activity === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setActivity(item.id)}
                      style={({ pressed }) => [
                        styles.listOption,
                        selected && styles.listOptionSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                        <Ionicons
                          name={index > 2 ? 'barbell-outline' : index > 0 ? 'walk-outline' : 'desktop-outline'}
                          size={21}
                          color={selected ? colors.primaryDark : colors.muted}
                        />
                      </View>
                      <View style={styles.optionCopy}>
                        <Text style={styles.optionTitle}>{item.title}</Text>
                        <Text style={styles.optionDetail}>{item.detail}</Text>
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={23}
                        color={selected ? colors.primary : colors.outline}
                      />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.goalGrid}>
                {goalOptions.map((item, index) => {
                  const selected = goal === item.id;
                  const icon: React.ComponentProps<typeof Ionicons>['name'] =
                    index === 0 ? 'trending-down' : index === 1 ? 'remove' : 'trending-up';
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setGoal(item.id)}
                      style={({ pressed }) => [
                        styles.goalCard,
                        selected && styles.goalCardSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={[styles.goalIcon, selected && styles.goalIconSelected]}>
                        <Ionicons name={icon} size={26} color={selected ? colors.surface : colors.primary} />
                      </View>
                      <View style={styles.optionCopy}>
                        <Text style={styles.goalTitle}>{item.title}</Text>
                        <Text style={styles.optionDetail}>{item.detail}</Text>
                      </View>
                      {selected ? <Ionicons name="checkmark-circle" size={25} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
                <View style={styles.formulaNote}>
                  <Ionicons name="sparkles-outline" size={20} color={colors.gold} />
                  <Text style={styles.formulaCopy}>
                    Calo Verse uses the Mifflin–St Jeor formula, then adjusts for your movement and goal.
                  </Text>
                </View>
              </View>
            ) : null}
          </ClayCard>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            {step > 0 ? (
              <SecondaryButton label="Back" icon="arrow-back" onPress={() => setStep(step - 1)} style={styles.back} />
            ) : null}
            <PrimaryButton
              label={step === 2 ? 'Build my plan' : 'Continue'}
              icon={step === 2 ? 'sparkles' : 'arrow-forward'}
              onPress={next}
              style={styles.continue}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 34,
    gap: 24,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  progressWrap: { flex: 1, gap: 8 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { ...typography.label, color: colors.primary, fontSize: 11, letterSpacing: 1 },
  progressLabel: { ...typography.label, color: colors.muted },
  progressTrack: { height: 8, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.outline },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: colors.primary },
  heading: { gap: 7 },
  subtitle: { ...typography.body, color: colors.muted, maxWidth: 460 },
  card: { padding: 22 },
  sectionGap: { gap: 20 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderCard: {
    flex: 1,
    minHeight: 102,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSoft,
  },
  genderCardSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, ...softShadow },
  optionTitle: { ...typography.label, fontSize: 14 },
  optionTitleSelected: { color: colors.primaryDark },
  twoCol: { flexDirection: 'row', gap: 12 },
  optionList: { gap: 12 },
  listOption: {
    minHeight: 74,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceSoft,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listOptionSelected: { borderColor: colors.primarySoft, backgroundColor: colors.surfaceMint },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: { backgroundColor: colors.primarySoft },
  optionCopy: { flex: 1, gap: 2 },
  optionDetail: { ...typography.body, color: colors.muted, fontSize: 13, lineHeight: 18 },
  goalGrid: { gap: 13 },
  goalCard: {
    minHeight: 92,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  goalCardSelected: { backgroundColor: colors.surfaceMint, borderColor: colors.primarySoft, ...softShadow },
  goalIcon: {
    width: 50,
    height: 50,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconSelected: { backgroundColor: colors.primary },
  goalTitle: { ...typography.heading, fontSize: 17 },
  formulaNote: {
    borderRadius: 20,
    backgroundColor: colors.goldSoft,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  formulaCopy: { ...typography.body, color: '#685425', fontSize: 13, lineHeight: 19, flex: 1 },
  error: { ...typography.label, color: colors.danger, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12 },
  back: { flex: 0.38 },
  continue: { flex: 1 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
