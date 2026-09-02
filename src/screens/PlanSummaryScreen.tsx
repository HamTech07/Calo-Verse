import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ClayCard, FoodImage, Metric, PrimaryButton, ProgressBar } from '../components/ui';
import { MACRO_BACKGROUNDS } from '../data/foods';
import { NutrientInfoCard } from '../components/PlanDialogs';
import { colors, softShadow, typography } from '../theme';
import { NutritionTargets, PlanId, Profile } from '../types';
import { formatGoal, planOptions } from '../utils/nutrition';

export function PlanSummaryScreen({
  profile,
  targets,
  activePlan,
  onContinue,
}: {
  profile: Profile;
  targets: NutritionTargets;
  activePlan: PlanId;
  onContinue: () => void;
}) {
  const selectedPlan = planOptions.find((item) => item.id === activePlan) ?? planOptions[0];
  const plan = profile.goal === 'maintain' && activePlan === 'low'
    ? { ...selectedPlan, eyebrow: 'MAINTAIN PLAN', title: 'Weight Maintenance', schedule: 'Balanced daily energy target' }
    : selectedPlan;
  const changeText =
    targets.projectedKgChange === 0
      ? 'Weight maintenance range'
      : `${Math.abs(targets.projectedKgChange).toFixed(1)} kg ${targets.projectedKgChange < 0 ? 'loss' : 'gain'} / month`;

  return (
    <LinearGradient colors={['#F8FAF7', '#EDF7F1', '#FAF4E6']} style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.successMark}>
          <Ionicons name="checkmark" size={28} color={colors.surface} />
        </View>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>YOUR 30-DAY CALO VERSE IS READY</Text>
          <Text style={styles.title}>Built around you, {profile.name.split(' ')[0]}</Text>
          <Text style={styles.subtitle}>
            A complete one-month nutrition plan for {formatGoal(profile.goal).toLowerCase()}, based on your body and routine.
          </Text>
        </View>

        <ClayCard tone="mint" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.cardEyebrow}>DAILY ENERGY TARGET</Text>
              <Text style={styles.calories}>{targets.calories.toLocaleString()}</Text>
              <Text style={styles.kcal}>kcal / day</Text>
            </View>
            <View style={styles.targetIcon}>
              <Ionicons name="nutrition" size={30} color={colors.primary} />
            </View>
          </View>
          <View style={styles.monthlyStrip}>
            <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.monthlyText}>Month 1 · {targets.monthlyCalories.toLocaleString()} kcal total target</Text>
          </View>
        </ClayCard>

        <View style={styles.metricGrid}>
          <NutrientInfoCard nutrient="protein" style={styles.metricCard}>
            <FoodImage source={MACRO_BACKGROUNDS.protein} style={styles.metricBackground} />
            <LinearGradient colors={['rgba(12,31,25,0.10)', 'rgba(12,31,25,0.90)']} style={StyleSheet.absoluteFill} />
            <View style={styles.metricCardContent}>
              <View style={[styles.metricIcon, { backgroundColor: 'rgba(225,245,239,0.88)' }]}>
                <Ionicons name="barbell-outline" size={20} color={colors.secondary} />
              </View>
              <Metric label="PROTEIN" value={targets.protein} suffix="g" inverted />
              <ProgressBar value={0.78} color={colors.secondary} />
              <Text style={styles.exploreHint}>Explore foods ›</Text>
            </View>
          </NutrientInfoCard>
          <NutrientInfoCard nutrient="carbs" style={styles.metricCard}>
            <FoodImage source={MACRO_BACKGROUNDS.carbs} style={styles.metricBackground} />
            <LinearGradient colors={['rgba(38,24,14,0.08)', 'rgba(38,24,14,0.90)']} style={StyleSheet.absoluteFill} />
            <View style={styles.metricCardContent}>
              <View style={[styles.metricIcon, { backgroundColor: 'rgba(255,236,224,0.90)' }]}>
                <Ionicons name="flash-outline" size={20} color="#9A5C37" />
              </View>
              <Metric label="CARBS" value={targets.carbs} suffix="g" inverted />
              <ProgressBar value={0.68} color="#E89A63" />
              <Text style={styles.exploreHint}>Explore foods ›</Text>
            </View>
          </NutrientInfoCard>
          <NutrientInfoCard nutrient="fats" style={styles.metricCard}>
            <FoodImage source={MACRO_BACKGROUNDS.fats} style={styles.metricBackground} />
            <LinearGradient colors={['rgba(25,28,14,0.08)', 'rgba(25,28,14,0.90)']} style={StyleSheet.absoluteFill} />
            <View style={styles.metricCardContent}>
              <View style={[styles.metricIcon, { backgroundColor: 'rgba(255,245,205,0.90)' }]}>
                <Ionicons name="water-outline" size={20} color="#8A6B19" />
              </View>
              <Metric label="FATS" value={targets.fats} suffix="g" inverted />
              <ProgressBar value={0.58} color={colors.gold} />
              <Text style={styles.exploreHint}>Explore foods ›</Text>
            </View>
          </NutrientInfoCard>
          <NutrientInfoCard nutrient="fiber" style={styles.metricCard}>
            <FoodImage source={MACRO_BACKGROUNDS.fiber} style={styles.metricBackground} />
            <LinearGradient colors={['rgba(13,33,24,0.08)', 'rgba(13,33,24,0.90)']} style={StyleSheet.absoluteFill} />
            <View style={styles.metricCardContent}>
              <View style={[styles.metricIcon, { backgroundColor: 'rgba(224,244,235,0.90)' }]}>
                <Ionicons name="leaf-outline" size={20} color={colors.blue} />
              </View>
              <Metric label="FIBER" value={targets.fiber} suffix="g" inverted />
              <ProgressBar value={0.64} color={colors.blue} />
              <Text style={styles.exploreHint}>Explore foods ›</Text>
            </View>
          </NutrientInfoCard>
        </View>

        <ClayCard style={styles.planCard}>
          <View style={[styles.planAccent, { backgroundColor: plan.color }]}>
            <Ionicons name="time-outline" size={25} color={plan.accent} />
          </View>
          <View style={styles.planCopy}>
            <Text style={styles.cardEyebrow}>{plan.eyebrow}</Text>
            <Text style={styles.planTitle}>{plan.title}</Text>
            <Text style={styles.planSchedule}>{plan.schedule}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
        </ClayCard>

        <ClayCard tone="gold" style={styles.projectionCard}>
          <View style={styles.projectionIcon}>
            <Ionicons name="trending-up" size={23} color="#765B15" />
          </View>
          <View style={styles.projectionCopy}>
            <Text style={styles.projectionTitle}>{changeText}</Text>
            <Text style={styles.projectionDetail}>
              BMR {targets.bmr.toLocaleString()} · TDEE {targets.tdee.toLocaleString()} kcal
            </Text>
          </View>
        </ClayCard>

        <Text style={styles.disclaimer}>
          This demo provides general wellness estimates, not medical advice. Adjust with a qualified professional when needed.
        </Text>

        <PrimaryButton label="Enter my dashboard" icon="arrow-forward" onPress={onContinue} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 38,
    gap: 20,
  },
  successMark: {
    width: 54,
    height: 54,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  heading: { gap: 7, marginBottom: 2 },
  eyebrow: { ...typography.label, color: colors.primary, fontSize: 11, letterSpacing: 1.2 },
  title: { ...typography.title, fontSize: 32 },
  subtitle: { ...typography.body, color: colors.muted, maxWidth: 520 },
  heroCard: { padding: 24, gap: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardEyebrow: { ...typography.label, fontSize: 10, color: colors.primary, letterSpacing: 1.15 },
  calories: { ...typography.title, fontSize: 48, lineHeight: 54, color: colors.primaryDark, marginTop: 4 },
  kcal: { ...typography.body, color: colors.muted },
  targetIcon: {
    width: 62,
    height: 62,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthlyStrip: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 17,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  monthlyText: { ...typography.label, color: colors.primaryDark },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  exploreHint: { color: '#FFFFFF', fontSize: 11, opacity: 0.85 },
  metricCard: { width: '48%', minWidth: 150, minHeight: 178, padding: 0, flexGrow: 1, position: 'relative' },
  metricBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  metricCardContent: { flex: 1, justifyContent: 'flex-end', padding: 17, gap: 12 },
  metricIcon: { width: 38, height: 38, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  planCard: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  planAccent: { width: 52, height: 52, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  planCopy: { flex: 1, gap: 2 },
  planTitle: { ...typography.heading, fontSize: 18 },
  planSchedule: { ...typography.body, color: colors.muted, fontSize: 13 },
  projectionCard: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 13 },
  projectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectionCopy: { flex: 1, gap: 3 },
  projectionTitle: { ...typography.heading, fontSize: 16, color: '#5F4B16' },
  projectionDetail: { ...typography.body, color: '#765F25', fontSize: 12 },
  disclaimer: { ...typography.body, color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
