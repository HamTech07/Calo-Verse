import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ClayCard,
  FoodImage,
  Metric,
  Pill,
  PrimaryButton,
  ProgressBar,
  ScreenTitle,
  SecondaryButton,
} from '../components/ui';
import { MACRO_BACKGROUNDS, demoScanFood, foods, regions } from '../data/foods';
import { PhotoMealScanner } from '../components/PhotoMealScanner';
import { VoiceMealLogger } from '../components/VoiceMealLogger';
import { NutrientInfoCard, type Nutrient } from '../components/PlanDialogs';
import { askNutritionAi, resolveMealInput, NutritionAiError } from '../services/nutritionAi';
import { clayShadow, colors, fonts, softShadow, typography } from '../theme';
import { Food, FoodLog, MealType, NutritionTargets, PlanId, Profile, TabId, Tier } from '../types';
import { findFoodMatch, formatGoal, mealLabels, planOptions } from '../utils/nutrition';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface MainAppProps {
  profile: Profile;
  targets: NutritionTargets;
  tier: Tier;
  activePlan: PlanId;
  aiChecksUsed: number;
  scansUsed: number;
  trialStartedAt: string;
  planStartedAt: string;
  waterMl: number;
  logs: FoodLog[];
  onTierChange: (tier: Tier) => void;
  onPlanChange: (plan: PlanId) => void;
  onAiUsage: (used: number) => void;
  onScanUsage: (used: number) => void;
  onWaterChange: (waterMl: number) => void;
  onAddFood: (food: Food, mealType?: MealType, note?: string, loggedAt?: string) => void;
  onRemoveFoodLog?: (id: string) => void;
  onCustomTargetChange?: (target: number) => void;
  onSignOut: () => void;
  onReset: () => void;
}

const tabs: Array<{ id: TabId; label: string; icon: IconName }> = [
  { id: 'home', label: 'Home', icon: 'home-outline' },
  { id: 'foods', label: 'Search', icon: 'search-outline' },
  { id: 'scan', label: 'Scan', icon: 'scan-outline' },
  { id: 'plans', label: 'Plans', icon: 'calendar-outline' },
  { id: 'profile', label: 'Profile', icon: 'person-outline' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(value: string | number | Date) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDayKey(value: string | number | Date) {
  const date = startOfLocalDay(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function planDateForDay(planStartedAt: string, dayNumber: number) {
  const date = startOfLocalDay(planStartedAt);
  date.setDate(date.getDate() + dayNumber - 1);
  return date;
}



export function MainApp(props: MainAppProps) {
  const [tab, setTab] = useState<TabId>('home');
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslate = useRef(new Animated.Value(0)).current;
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('Unlock more of your Calo Verse.');
  const [adminOpen, setAdminOpen] = useState(false);
  const trialExpired = props.tier === 'free' && Date.now() - new Date(props.trialStartedAt).getTime() >= 3 * 24 * 60 * 60 * 1000;

  const openUpgrade = (reason: string) => {
    setUpgradeReason(reason);
    setUpgradeOpen(true);
  };

  const navigateToTab = (nextTab: TabId) => {
    if (nextTab === tab || tabTransitioning) return;
    setTabTransitioning(true);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 90, useNativeDriver: false }),
      Animated.timing(contentTranslate, { toValue: -5, duration: 90, useNativeDriver: false }),
    ]).start(() => {
      setTab(nextTab);
      contentTranslate.setValue(9);
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(contentOpacity, { toValue: 1, duration: 220, useNativeDriver: false }),
          Animated.timing(contentTranslate, { toValue: 0, duration: 220, useNativeDriver: false }),
        ]).start(() => setTabTransitioning(false));
      }, 24);
    });
  };

  useEffect(() => {
    if (trialExpired) openUpgrade('Your 3-day full-plan preview has ended. Upgrade to keep the complete 30-day diet plan unlocked.');
  }, [trialExpired]);

  return (
    <View style={styles.app}>
      <LinearGradient colors={['#F7FAF6', '#F1F7F2', '#F8F6EC']} style={StyleSheet.absoluteFill} />
      <AppHeader profile={props.profile} tier={props.tier} onProfile={() => navigateToTab('profile')} />

      <Animated.View style={[styles.viewport, { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }]}>
        {tab === 'home' ? (
          <DashboardTab
            {...props}
            onOpenFoods={() => navigateToTab('foods')}
            onOpenScan={() => {
              navigateToTab('scan');
              if (props.tier !== 'pro' && props.scansUsed >= 3) openUpgrade('Your 3 free AI calorie scans are used. Upgrade to Pro for unlimited scans.');
            }}
            onUpgrade={() => openUpgrade('Unlock branded foods, unlimited Calo AI questions, photo scans and voice AI.')}
          />
        ) : null}
        {tab === 'foods' ? (
          <FoodsTab
            tier={props.tier}
            aiChecksUsed={props.aiChecksUsed}
            onAiUsage={props.onAiUsage}
            onAddFood={props.onAddFood}
            onUpgrade={openUpgrade}
          />
        ) : null}
        {tab === 'scan' ? (
          <ScanTab
            tier={props.tier}
            scansUsed={props.scansUsed}
            trialStartedAt={props.trialStartedAt}
            onScanUsage={props.onScanUsage}
            onAiUsage={props.onAiUsage}
            onAddFood={props.onAddFood}
            onUpgrade={() => openUpgrade('Upgrade to Pro to use unlimited AI photo scans and multilingual voice guidance.')}
          />
        ) : null}
        {tab === 'plans' ? (
          <PlansTab
            activePlan={props.activePlan}
            tier={props.tier}
            calorieTarget={props.targets.calories}
            monthlyTarget={props.targets.monthlyCalories}
            logs={props.logs}
            trialStartedAt={props.trialStartedAt}
            planStartedAt={props.planStartedAt}
            aiChecksUsed={props.aiChecksUsed}
            onAiUsage={props.onAiUsage}
            onUpgrade={openUpgrade}
            onAddFood={props.onAddFood}
            onPlanChange={props.onPlanChange}
            onTierChange={props.onTierChange}
          />
        ) : null}
        {tab === 'profile' ? (
          <ProfileTab
            profile={props.profile}
            targets={props.targets}
            tier={props.tier}
            activePlan={props.activePlan}
            onCustomTargetChange={props.onCustomTargetChange}
            onUpgrade={() => openUpgrade('Choose the tier that matches how you want to track.')}
            onOpenAdmin={() => setAdminOpen(true)}
            onSignOut={props.onSignOut}
            onReset={props.onReset}
          />
        ) : null}
      </Animated.View>

      <BottomNav tab={tab} onChange={navigateToTab} tier={props.tier} scansUsed={props.scansUsed} />

      <UpgradeModal
        visible={upgradeOpen}
        reason={upgradeReason}
        currentTier={props.tier}
        onClose={() => setUpgradeOpen(false)}
        onChoose={(tier) => {
          props.onTierChange(tier);
          setUpgradeOpen(false);
        }}
      />

      <AdminPanelModal
        visible={adminOpen}
        currentUserEmail={props.profile.email}
        onClose={() => setAdminOpen(false)}
      />
    </View>
  );
}

function AppHeader({ profile, tier, onProfile }: { profile: Profile; tier: Tier; onProfile: () => void }) {
  const initials = profile.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.header}>
      <View style={styles.headerInner}>
        <Pressable accessibilityLabel="Open profile" onPress={onProfile} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
        <View style={styles.brandRow}>
          <FoodImage source={require('../../assets/caloverse-mark.png')} resizeMode="contain" style={styles.miniBrandImage} />
          <Text style={styles.headerBrand}>Calo Verse</Text>
        </View>
        <View style={[styles.tierBadge, tier === 'pro' && styles.proBadge]}>
          <Ionicons name={tier === 'pro' ? 'sparkles' : tier === 'plus' ? 'add-circle' : 'leaf'} size={13} color={tier === 'pro' ? '#745615' : colors.primary} />
          <Text style={[styles.tierBadgeText, tier === 'pro' && { color: '#745615' }]}>{tier.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
}

function BottomNav({ tab, onChange, tier, scansUsed }: { tab: TabId; onChange: (tab: TabId) => void; tier: Tier; scansUsed: number }) {
  return (
    <View style={styles.nav}>
      <View style={styles.navInner}>
        {tabs.map((item) => {
          const selected = tab === item.id;
          const center = item.id === 'scan';
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onChange(item.id)}
              style={styles.navItem}
            >
              <View style={[styles.navIconWrap, selected && styles.navIconSelected, center && styles.navScan]}>
                <Ionicons
                  name={selected ? item.icon.replace('-outline', '') as IconName : item.icon}
                  size={center ? 25 : 22}
                  color={selected || center ? colors.primaryDark : '#7D8782'}
                />
                {center && tier !== 'pro' && scansUsed >= 3 ? (
                  <View style={styles.lockDot}>
                    <Ionicons name="lock-closed" size={7} color={colors.surface} />
                  </View>
                ) : null}
              </View>
              <Text style={[styles.navLabel, selected && styles.navLabelSelected]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ScreenScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenScroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

function DashboardTab({
  profile,
  targets,
  tier,
  activePlan,
  aiChecksUsed,
  scansUsed,
  trialStartedAt,
  planStartedAt,
  waterMl,
  logs,
  onWaterChange,
  onAddFood,
  onRemoveFoodLog,
  onCustomTargetChange,
  onAiUsage,
  onScanUsage,
  onOpenFoods,
  onOpenScan,
  onUpgrade,
}: MainAppProps & {
  onOpenFoods: () => void;
  onOpenScan: () => void;
  onUpgrade: () => void;
}) {
  const [mealInput, setMealInput] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<MealType>('breakfast');
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [customInputTarget, setCustomInputTarget] = useState(String(targets.calories));
  const [lastFeedback, setLastFeedback] = useState<{
    headline: string;
    detail: string;
    isManual: boolean;
  } | null>(null);


  const todayKey = localDayKey(Date.now());
  const planStart = startOfLocalDay(planStartedAt);
  const planEnd = new Date(planStart.getTime() + 30 * DAY_MS);
  const currentPlanDay = Math.min(30, Math.max(1, Math.floor((startOfLocalDay(Date.now()).getTime() - planStart.getTime()) / DAY_MS) + 1));
  const todayLogs = useMemo(() => logs.filter((log) => localDayKey(log.loggedAt) === todayKey), [logs, todayKey]);
  const planLogs = useMemo(
    () => logs.filter((log) => {
      const loggedAt = new Date(log.loggedAt).getTime();
      return loggedAt >= planStart.getTime() && loggedAt < planEnd.getTime();
    }),
    [logs, planStartedAt],
  );
  const totals = useMemo(
    () =>
      todayLogs.reduce(
        (sum, log) => ({
          calories: sum.calories + log.food.calories,
          protein: sum.protein + log.food.protein,
          carbs: sum.carbs + log.food.carbs,
          fats: sum.fats + log.food.fats,
          fiber: sum.fiber + (log.food.fiber ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 },
      ),
    [todayLogs],
  );
  const caloriesBeforeToday = planLogs
    .filter((log) => startOfLocalDay(log.loggedAt).getTime() < startOfLocalDay(Date.now()).getTime())
    .reduce((sum, log) => sum + log.food.calories, 0);
  const monthlyConsumed = planLogs.reduce((sum, log) => sum + log.food.calories, 0);
  const todayAllowance = Math.max(0, targets.calories * currentPlanDay - caloriesBeforeToday);
  const remaining = todayAllowance - totals.calories;
  const isOverBudget = remaining < 0;
  const active = planOptions.find((plan) => plan.id === activePlan) ?? planOptions[0];
  const elapsedDays = Math.floor((Date.now() - new Date(trialStartedAt).getTime()) / (24 * 60 * 60 * 1000));
  const trialDaysLeft = Math.max(0, 3 - elapsedDays);


  const logBusy = useRef(false);
  const [loggingMeal, setLoggingMeal] = useState(false);
  const handleLogMeal = async (textToLog?: string) => {
    if (logBusy.current) return;
    const rawText = (textToLog ?? mealInput).trim();
    if (!rawText) {
      setLastFeedback({
        headline: 'Tell us what you ate',
        detail: 'Example: "Breakfast 700 calories", "2 eggs and 1 paratha", or "Chicken biryani".',
        isManual: true,
      });
      return;
    }

    logBusy.current = true;
    setLoggingMeal(true);
    try {
    const parsed = await resolveMealInput(rawText, selectedSlot, onAiUsage);

    // Add food entry
    const newFood: Food = {
      id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: parsed.itemsSummary,
      region: parsed.isManual ? 'Manual Entry' : 'Calo AI Estimation',
      brand: parsed.isManual ? 'User Entry' : 'Smart AI Estimate',
      isBranded: false,
      portionSize: parsed.portion,
      calories: parsed.calories,
      protein: parsed.protein,
      carbs: parsed.carbs,
      fats: parsed.fats,
      fiber: parsed.fiber,
      processingLevel: 'Minimally Processed',
      accessTier: 'free',
      image: parsed.matchedFoods[0]?.food.image ?? foods[0].image,
    };

    onAddFood(newFood, parsed.mealType, parsed.explanation);
    setLastFeedback({
      headline: `+${parsed.calories.toLocaleString()} kcal logged (${mealLabels[parsed.mealType].label})`,
      detail: parsed.explanation,
      isManual: parsed.isManual,
    });
    setMealInput('');
    } catch (error) {
      if (error instanceof NutritionAiError && error.code === 'FREE_LIMIT') onUpgrade();
      setLastFeedback({ headline: 'Meal not added', detail: error instanceof Error ? error.message : 'Unable to estimate this meal.', isManual: false });
    } finally { logBusy.current = false; setLoggingMeal(false); }
  };

  const handleSaveTarget = () => {
    const num = Number(customInputTarget.replace(/[^0-9]/g, ''));
    if (num >= 1000 && num <= 8000) {
      onCustomTargetChange?.(num);
      setTargetModalOpen(false);
    } else {
      Alert.alert('Invalid Target', 'Please enter a target between 1000 and 8000 kcal.');
    }
  };

  // Group logs by meal type
  const mealGroups: Record<MealType, FoodLog[]> = {
    breakfast: todayLogs.filter((l) => (l.mealType ?? 'breakfast') === 'breakfast'),
    lunch: todayLogs.filter((l) => l.mealType === 'lunch'),
    snack: todayLogs.filter((l) => l.mealType === 'snack'),
    dinner: todayLogs.filter((l) => l.mealType === 'dinner'),
  };

  return (
    <ScreenScroll>
      <ScreenTitle
        eyebrow="TODAY · CALORIE & MEAL TRACKER"
        title={`Hello, ${profile.name.split(' ')[0]}`}
        subtitle={`${formatGoal(profile.goal)} · Target: ${targets.calories.toLocaleString()} kcal`}
        action={
          tier === 'free' ? (
            <Pressable onPress={onUpgrade} style={styles.levelUpButton}>
              <Ionicons name="sparkles" size={16} color="#775A12" />
              <Text style={styles.levelUpText}>{trialDaysLeft ? `${trialDaysLeft}d preview` : 'Upgrade'}</Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Main Calorie Ring / Status Card */}
      <ClayCard tone={isOverBudget ? 'peach' : 'mint'} style={styles.calorieCard}>
        <View style={styles.calorieTop}>
          <View>
            <View style={styles.targetRow}>
              <Text style={styles.cardEyebrow}>DAILY CALORIE TARGET</Text>
              <Pressable onPress={() => setTargetModalOpen(true)} style={styles.editTargetPill}>
                <Ionicons name="pencil" size={12} color={colors.primary} />
                <Text style={styles.editTargetText}>Edit Target</Text>
              </Pressable>
            </View>
            <Text style={styles.bigNumber}>{totals.calories.toLocaleString()}</Text>
            <Text style={styles.bigNumberSuffix}>of {todayAllowance.toLocaleString()} kcal available today · {targets.calories.toLocaleString()} base</Text>
          </View>

          <View style={[styles.remainingBubble, isOverBudget && styles.remainingBubbleOver]}>
            <Text style={[styles.remainingNumber, isOverBudget && { color: colors.coral }]}>
              {Math.abs(remaining).toLocaleString()}
            </Text>
            <Text style={[styles.remainingLabel, isOverBudget && { color: colors.coral }]}>
              {isOverBudget ? 'kcal over' : 'kcal left'}
            </Text>
          </View>
        </View>

        <ProgressBar
          value={todayAllowance > 0 ? totals.calories / todayAllowance : 0}
          color={isOverBudget ? colors.coral : colors.primary}
        />

        {/* Live daily balance */}
        <View style={styles.urduStatusPill}>
          <Ionicons
            name={isOverBudget ? 'warning-outline' : 'checkmark-circle-outline'}
            size={16}
            color={isOverBudget ? colors.coral : colors.primaryDark}
          />
          <Text style={[styles.urduStatusText, isOverBudget && { color: colors.coral }]}>
            {isOverBudget
              ? `${Math.abs(remaining).toLocaleString()} kcal above today’s available allowance.`
              : `${totals.calories.toLocaleString()} kcal consumed · ${remaining.toLocaleString()} kcal remaining today.`}
          </Text>
        </View>

        <View style={styles.macroRow}>
          <MiniMacro
            label="Protein"
            value={totals.protein}
            target={targets.protein}
            color={colors.secondary}
            image={MACRO_BACKGROUNDS.protein}
          />
          <MiniMacro
            label="Carbs"
            value={totals.carbs}
            target={targets.carbs}
            color="#E89A63"
            image={MACRO_BACKGROUNDS.carbs}
          />
          <MiniMacro
            label="Fats"
            value={totals.fats}
            target={targets.fats}
            color={colors.gold}
            image={MACRO_BACKGROUNDS.fats}
          />
          <MiniMacro label="Fiber" value={totals.fiber} target={targets.fiber} color={colors.blue} image={MACRO_BACKGROUNDS.fiber} />
        </View>

        <View style={styles.monthlyBudgetCard}>
          <View style={styles.monthlyBudgetTop}>
            <View>
              <Text style={styles.monthlyBudgetLabel}>30-DAY CALORIE BUDGET</Text>
              <Text style={styles.monthlyBudgetValue}>{monthlyConsumed.toLocaleString()} / {targets.monthlyCalories.toLocaleString()} kcal</Text>
            </View>
            <Text style={styles.monthlyDayBadge}>Day {currentPlanDay} of 30</Text>
          </View>
          <ProgressBar value={targets.monthlyCalories > 0 ? monthlyConsumed / targets.monthlyCalories : 0} color={colors.gold} />
          <Text style={styles.monthlyBudgetHint}>Unused calories roll into the next active day. Today’s allowance is {todayAllowance.toLocaleString()} kcal.</Text>
        </View>
      </ClayCard>

      {/* Prominent AI Daily Meal Logger Box */}
      <ClayCard tone="gold" style={styles.aiMealBoxCard}>
        <View style={styles.aiMealBoxHeader}>
          <View style={styles.aiSparkleIcon}>
            <Ionicons name="sparkles" size={20} color="#775A12" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiMealBoxTitle}>AI Daily Meal Logger · What did you eat?</Text>
            <Text style={styles.aiMealBoxSubtitle}>
              Enter a food name for an AI estimate, or type the calories directly (for example, “Breakfast 700 calories”).
            </Text>
          </View>
        </View>

        {/* Meal Slot Picker Tabs */}
        <View style={styles.mealSlotRow}>
          {(['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).map((slot) => {
            const isSelected = selectedSlot === slot;
            return (
              <Pressable
                key={slot}
                onPress={() => setSelectedSlot(slot)}
                style={[styles.slotTab, isSelected && styles.slotTabSelected]}
              >
                <Ionicons
                  name={mealLabels[slot].icon as IconName}
                  size={15}
                  color={isSelected ? colors.surface : colors.primaryDark}
                />
                <Text style={[styles.slotTabText, isSelected && styles.slotTabTextSelected]}>
                  {mealLabels[slot].label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Input Box */}
        <Text style={styles.sectionSubtitle}>Live AI sends food descriptions to Google. Avoid sensitive details; free-tier inputs may be used to improve its products. Manual calories are saved to your account without an AI call.</Text>
        {loggingMeal ? <Text accessibilityLiveRegion="polite" style={styles.notice}>Estimating your meal…</Text> : null}
        <View style={styles.mealInputShell}>
          <TextInput
            accessibilityLabel="Meal log input"
            editable={!loggingMeal}
            value={mealInput}
            onChangeText={setMealInput}
            onSubmitEditing={() => handleLogMeal()}
            placeholder={`Log ${mealLabels[selectedSlot].label}: “700 calories” or “2 eggs + 1 paratha”`}
            placeholderTextColor="#86918B"
            returnKeyType="done"
            style={styles.mealTextInput}
          />
          <Pressable
            accessibilityLabel="Log meal button"
            disabled={loggingMeal}
            onPress={() => handleLogMeal()}
            style={({ pressed }) => [styles.mealLogButton, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={22} color={colors.surface} />
          </Pressable>
        </View>

        <PhotoMealScanner surface="daily" tier={tier} scansUsed={scansUsed} trialStartedAt={trialStartedAt}
          onScanUsage={onScanUsage} onAddFood={onAddFood} onUpgrade={onUpgrade} />


        {/* Quick Suggestion Chips */}
        <View style={styles.presetSection}>
          <Text style={styles.presetHeading}>QUICK ONE-TAP MEAL EXAMPLES:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetChipScroll}>
            <Pressable onPress={() => handleLogMeal('2 eggs and 1 paratha')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>🍳 Estimate 2 Eggs + 1 Paratha</Text>
            </Pressable>
            <Pressable onPress={() => handleLogMeal('Chicken biryani 1 plate')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>🍛 Estimate Chicken Biryani</Text>
            </Pressable>
            <Pressable onPress={() => handleLogMeal('Breakfast 700 calories')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>⚡ Breakfast 700 kcal (Direct)</Text>
            </Pressable>
            <Pressable onPress={() => handleLogMeal('1 plate daal chawal')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>🥣 Estimate Daal Chawal Plate</Text>
            </Pressable>
            <Pressable onPress={() => handleLogMeal('1 cup tea and 1 samosa')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>☕ Estimate Tea + Samosa</Text>
            </Pressable>
            <Pressable onPress={() => handleLogMeal('Grilled chicken breast and rice')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>🍗 Estimate Chicken Breast + Rice</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Free Plan Tracker */}
        <View style={styles.aiLimitRow}>
          <Text style={styles.aiLimitText}>
            Manual numbers: <Text style={{ fontWeight: '800', color: colors.primaryDark }}>Unlimited</Text> · AI Smart auto-estimates:{' '}
            <Text style={{ fontWeight: '800', color: colors.primaryDark }}>
              {tier === 'free' ? `${Math.max(0, 3 - aiChecksUsed)} free left` : 'Unlimited'}
            </Text>
          </Text>
        </View>

        {/* Real-time feedback banner */}
        {lastFeedback ? (
          <View style={[styles.feedbackBanner, lastFeedback.isManual ? styles.feedbackManual : styles.feedbackAi]}>
            <Ionicons
              name={lastFeedback.isManual ? 'checkmark-circle' : 'sparkles'}
              size={20}
              color={colors.primary}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.feedbackHeadline}>{lastFeedback.headline}</Text>
              <Text style={styles.feedbackDetail}>{lastFeedback.detail}</Text>
            </View>
          </View>
        ) : null}
      </ClayCard>

      {/* Grouped meal breakdown */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today’s Meals Breakdown</Text>
        <Pressable onPress={onOpenFoods}>
          <Text style={styles.sectionLink}>Search Database</Text>
        </Pressable>
      </View>

      {(['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).map((slot) => {
        const slotLogs = mealGroups[slot];
        const slotCals = slotLogs.reduce((sum, item) => sum + item.food.calories, 0);

        return (
          <ClayCard key={slot} style={styles.mealGroupCard}>
            <View style={styles.mealGroupTop}>
              <View style={styles.mealGroupIconWrap}>
                <Ionicons name={mealLabels[slot].icon as IconName} size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealGroupTitle}>{mealLabels[slot].label}</Text>
                <Text style={styles.mealGroupSub}>Meal entries</Text>
              </View>
              <View style={styles.mealGroupCalBadge}>
                <Text style={styles.mealGroupCalText}>{slotCals} kcal</Text>
              </View>
            </View>

            {slotLogs.length > 0 ? (
              <View style={styles.mealGroupList}>
                {slotLogs.map((item) => (
                  <View key={item.id} style={styles.mealItemRow}>
                    <FoodImage source={item.food.image} style={styles.mealItemImage} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1} style={styles.mealItemName}>
                        {item.food.name}
                      </Text>
                      <Text style={styles.mealItemMeta}>
                        {item.food.calories} kcal · {item.food.portionSize}
                      </Text>
                    </View>
                    {onRemoveFoodLog ? (
                      <Pressable
                        onPress={() => onRemoveFoodLog(item.id)}
                        style={styles.deleteItemButton}
                        accessibilityLabel="Delete food log"
                      >
                        <Ionicons name="trash-outline" size={17} color={colors.coral} />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptySlotText}>No foods logged yet for {mealLabels[slot].label.toLowerCase()}.</Text>
            )}
          </ClayCard>
        );
      })}

      {/* Quick Action Navigation */}
      <View style={styles.quickRow}>
        <QuickAction
          icon="search"
          title="Search Food"
          detail="Unlimited manual database"
          image={foods[0].image}
          color={colors.blueSoft}
          iconColor="#FFFFFF"
          onPress={onOpenFoods}
        />
        <QuickAction
          icon="scan"
          title="AI Photo Scan"
          detail={tier === 'pro' ? 'Unlimited scans' : `${Math.max(0, 3 - scansUsed)} free scans left`}
          image={demoScanFood.image}
          color={colors.goldSoft}
          iconColor="#FFFFFF"
          locked={tier !== 'pro' && scansUsed >= 3}
          onPress={onOpenScan}
        />
      </View>

      {/* Hydration tracker */}
      <ClayCard tone="blue" style={styles.waterCard}>
        <View style={styles.waterTop}>
          <View style={styles.waterTitleRow}>
            <View style={styles.waterIcon}>
              <Ionicons name="water" size={23} color={colors.blue} />
            </View>
            <View>
              <Text style={styles.waterTitle}>Hydration Track</Text>
              <Text style={styles.waterSub}>Keep hydrated throughout your day</Text>
            </View>
          </View>
          <Text style={styles.waterAmount}>
            {(waterMl / 1000).toFixed(2)} <Text style={styles.waterUnit}>/ {(targets.waterMl / 1000).toFixed(1)} L</Text>
          </Text>
        </View>
        <View style={styles.glassRow}>
          {Array.from({ length: 8 }).map((_, index) => {
            const activeGlass = index < Math.round((waterMl / targets.waterMl) * 8);
            return <View key={index} style={[styles.glass, activeGlass && styles.glassActive]} />;
          })}
        </View>
        <View style={styles.waterActions}>
          <SecondaryButton
            compact
            label="Undo"
            icon="remove"
            onPress={() => onWaterChange(Math.max(0, waterMl - 250))}
            style={styles.waterUndo}
          />
          <PrimaryButton
            compact
            label="Add 250 ml"
            icon="add"
            onPress={() => onWaterChange(Math.min(targets.waterMl, waterMl + 250))}
            style={styles.waterAdd}
          />
        </View>
      </ClayCard>

      {/* Target Customizer Modal */}
      <Modal visible={targetModalOpen} transparent animationType="slide" onRequestClose={() => setTargetModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTargetModalOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Set Daily Calorie Target</Text>
            <Text style={styles.modalSubtitle}>
              Choose your daily calorie goal, such as 3,000 kcal for a muscle-building plan or 2,000 kcal for a diet cut.
            </Text>

            {/* Quick target presets */}
            <View style={styles.targetPresetRow}>
              <Pressable
                onPress={() => setCustomInputTarget('3000')}
                style={[styles.targetPresetPill, customInputTarget === '3000' && styles.targetPresetSelected]}
              >
                <Text style={styles.targetPresetText}>💪 3,000 kcal (Bulk)</Text>
              </Pressable>
              <Pressable
                onPress={() => setCustomInputTarget('2500')}
                style={[styles.targetPresetPill, customInputTarget === '2500' && styles.targetPresetSelected]}
              >
                <Text style={styles.targetPresetText}>⚖️ 2,500 kcal (Maintain)</Text>
              </Pressable>
              <Pressable
                onPress={() => setCustomInputTarget('2000')}
                style={[styles.targetPresetPill, customInputTarget === '2000' && styles.targetPresetSelected]}
              >
                <Text style={styles.targetPresetText}>🔥 2,000 kcal (Diet Cut)</Text>
              </Pressable>
              <Pressable
                onPress={() => setCustomInputTarget('1800')}
                style={[styles.targetPresetPill, customInputTarget === '1800' && styles.targetPresetSelected]}
              >
                <Text style={styles.targetPresetText}>🥗 1,800 kcal (Strict)</Text>
              </Pressable>
            </View>

            <View style={styles.searchShell}>
              <Ionicons name="flame" size={20} color={colors.primary} />
              <TextInput
                value={customInputTarget}
                onChangeText={setCustomInputTarget}
                keyboardType="numeric"
                placeholder="Enter calories (e.g. 3000)"
                placeholderTextColor="#89938E"
                style={styles.searchInput}
              />
              <Text style={styles.cardEyebrow}>KCAL</Text>
            </View>

            <PrimaryButton label="Save Daily Target" icon="checkmark-circle" onPress={handleSaveTarget} />
            <SecondaryButton label="Cancel" onPress={() => setTargetModalOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScreenScroll>
  );
}

function MiniMacro({ label, value, target, color, image }: { label: 'Protein' | 'Carbs' | 'Fats' | 'Fiber'; value: number; target: number; color: string; image: string }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <NutrientInfoCard nutrient={label.toLowerCase() as Nutrient} style={styles.miniMacro}>
      <FoodImage source={image} style={styles.macroBackground} />
      <LinearGradient colors={['rgba(10,24,20,0.08)', 'rgba(10,24,20,0.92)']} style={StyleSheet.absoluteFill} />
      <View style={styles.macroContent}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.macroLabel}>{label.toUpperCase()}</Text>
          <Text style={styles.macroValue}>{value}<Text style={{ fontSize: 9, opacity: 0.7 }}>/{target}g</Text></Text>
          <Text style={styles.macroHint}>Explore foods ›</Text>
          <View style={styles.macroProgressTrack}>
            <View style={[styles.macroProgressFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
          </View>
        </View>
      </View>
    </NutrientInfoCard>
  );
}

function PhotoMetric({
  label,
  value,
  suffix,
  image,
}: {
  label: 'PROTEIN' | 'CARBS' | 'FATS' | 'FIBER';
  value: string | number;
  suffix?: string;
  image: string;
}) {
  return (
    <NutrientInfoCard nutrient={label.toLowerCase() as Nutrient} style={styles.photoMetric}>
      <FoodImage source={image} style={styles.photoMetricImage} />
      <LinearGradient colors={['rgba(11,29,23,0.06)', 'rgba(11,29,23,0.90)']} style={StyleSheet.absoluteFill} />
      <View style={styles.photoMetricContent}>
        <Metric label={label} value={value} suffix={suffix} inverted />
        <Text style={styles.macroHint}>Explore foods ›</Text>
      </View>
    </NutrientInfoCard>
  );
}


function QuickAction({
  icon,
  title,
  detail,
  image,
  color,
  iconColor,
  locked,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail: string;
  image: string;
  color: string;
  iconColor: string;
  locked?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickPress, pressed && styles.pressed]}>
      <ClayCard style={styles.quickCard}>
        <FoodImage source={image} style={styles.quickBackground} />
        <LinearGradient colors={['rgba(11,27,23,0.08)', 'rgba(11,27,23,0.88)']} style={StyleSheet.absoluteFill} />
        <View style={styles.quickContent}>
          <View style={[styles.quickIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}> 
            <Ionicons name={icon} size={22} color={iconColor} />
            {locked ? <Ionicons name="lock-closed" size={11} color="#FFFFFF" style={styles.quickLock} /> : null}
          </View>
          <Text style={styles.quickTitle}>{title}</Text>
          <Text style={styles.quickDetail}>{detail}</Text>
        </View>
      </ClayCard>
    </Pressable>
  );
}

function FoodsTab({
  tier,
  aiChecksUsed,
  onAiUsage,
  onAddFood,
  onUpgrade,
}: {
  tier: Tier;
  aiChecksUsed: number;
  onAiUsage: (used: number) => void;
  onAddFood: (food: Food, mealType?: MealType) => void;
  onUpgrade: (reason: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [region, setRegion] = useState('All');
  const [notice, setNotice] = useState('Browse freely with Unlimited manual search, or Ask Calo AI.');
  const [assistantReply, setAssistantReply] = useState<{ headline: string; detail: string } | null>(null);
  const aiBusy = useRef(false);
  const [askingAi, setAskingAi] = useState(false);

  const regionalFoods = useMemo(
    () => foods.filter((item) => region === 'All' || item.region === region),
    [region],
  );

  const results = useMemo(() => {
    const normalized = activeQuery.trim().toLowerCase();
    return foods.filter((item) => {
      const matchesRegion = region === 'All' || item.region === region;
      const matchesQuery =
        !normalized ||
        `${item.name} ${item.brand} ${item.region}`.toLowerCase().includes(normalized) ||
        item.keywords?.some((kw) => kw.toLowerCase().includes(normalized));
      return matchesRegion && matchesQuery;
    });
  }, [activeQuery, region]);
  const showingFallback = Boolean(activeQuery.trim()) && results.length === 0;
  const visibleResults = showingFallback ? regionalFoods : results;

  const runManualSearch = () => {
    if (!query.trim()) {
      setActiveQuery('');
      setAssistantReply(null);
      setNotice('Showing all regional foods.');
      return;
    }
    setActiveQuery(query);
    setAssistantReply(null);
    setNotice(`Unlimited manual results for “${query.trim()}”`);
  };

  const askAi = async () => {
    if (aiBusy.current) return;
    const cleaned = query.trim();
    if (!cleaned) {
      setNotice('Enter a food or dish, then press Ask Calo AI.');
      return;
    }
    aiBusy.current = true;
    setAskingAi(true);
    setAssistantReply(null);
    setNotice('Asking Gemini for a nutrition estimate…');
    try {
    setActiveQuery('');
    const { estimate, aiChecksUsed: used } = await askNutritionAi(cleaned);
    onAiUsage(used);
    setAssistantReply({
      headline: `About ${estimate.calories} kcal · ${estimate.name}`,
      detail: `${estimate.portion}. Protein ${estimate.protein} g · Carbs ${estimate.carbs} g · Fats ${estimate.fats} g · Fiber ${estimate.fiber} g. ${estimate.explanation}`,
    });
    setNotice(`Live AI estimate · ${estimate.englishText}`);
    } catch (error) {
      if (error instanceof NutritionAiError && error.code === 'FREE_LIMIT') onUpgrade(error.message);
      setNotice(error instanceof Error ? error.message : 'AI is unavailable. Please try again.');
    } finally { aiBusy.current = false; setAskingAi(false); }
  };

  const add = (item: Food) => {
    if (item.isBranded && tier === 'free') {
      onUpgrade('Branded and packaged foods unlock with Plus or Pro.');
      return;
    }
    onAddFood(item, 'breakfast');
    setNotice(`${item.name} added to today’s log.`);
  };

  return (
    <ScreenScroll>
      <ScreenTitle
        eyebrow="REGIONAL & DAILY FOOD DATABASE"
        title="Eat familiar. Track smarter."
        subtitle="Unlimited manual search for local & international foods."
      />

      <View style={styles.searchShell}>
        <Ionicons name="search" size={21} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search foods"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={runManualSearch}
          placeholder="Search: biryani, paratha, eggs, chicken..."
          placeholderTextColor="#89938E"
          returnKeyType="search"
          style={styles.searchInput}
        />
        <Pressable accessibilityLabel="Run unlimited manual search" onPress={runManualSearch} style={styles.searchButton}>
          <Ionicons name="search" size={20} color={colors.surface} />
        </Pressable>
      </View>

      <View style={styles.searchMetaRow}>
        <Text style={styles.notice}>{notice}</Text>
        <Text style={styles.unlimited}>Manual search · Unlimited</Text>
      </View>

      <ClayCard style={styles.aiAssistantCard}>
        <FoodImage source={foods[0].image} style={styles.aiAssistantImage} />
        <LinearGradient
          colors={['rgba(15,45,39,0.35)', 'rgba(13,27,24,0.78)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiAssistantShade}
        />
        <View style={styles.aiAssistantContent}>
          <View style={styles.aiAssistantTop}>
            <View style={styles.aiAssistantIcon}>
              <Ionicons name="sparkles" size={17} color="#F5D98A" />
            </View>
            <Text style={styles.aiAssistantEyebrow}>CALO AI · CALORIE ASSISTANT</Text>
          </View>
          <Text style={styles.aiAssistantHeadline}>{assistantReply?.headline ?? 'Ask a food. Get an instant average.'}</Text>
          <Text style={styles.aiAssistantDetail}>
            {assistantReply?.detail ??
              'Type a food item, such as “Chicken Biryani” or “2 boiled eggs and paratha.” Manual search is unlimited; AI assistance includes 3 free uses.'}
          </Text>
          <Pressable accessibilityRole="button" disabled={askingAi} accessibilityState={{ busy: askingAi, disabled: askingAi }} onPress={askAi} style={({ pressed }) => [styles.aiAskButton, pressed && styles.pressed]}>
            <Ionicons name="sparkles" size={17} color={colors.primaryDark} />
            <Text style={styles.aiAskButtonText}>{askingAi ? 'Estimating…' : 'Ask Calo AI'}</Text>
            <Text style={styles.aiAskCount}>{tier === 'free' ? `${Math.max(0, 3 - aiChecksUsed)} free left` : 'Unlimited'}</Text>
          </Pressable>
          <Text style={styles.aiAssistantDisclaimer}>Live Gemini estimates, not exact measurements. Food descriptions are sent to Google; free-tier inputs may be used to improve its products. Do not include sensitive personal information.</Text>
        </View>
      </ClayCard>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {regions.map((item) => (
          <Pill key={item} label={item} selected={region === item} onPress={() => setRegion(item)} />
        ))}
      </ScrollView>

      <View style={styles.resultHeader}>
        <View>
          <Text style={styles.sectionTitle}>{visibleResults.length} food cards</Text>
          <Text style={styles.sectionSubtitle}>{showingFallback ? 'No exact match—showing the complete selected region.' : activeQuery ? `Results for “${activeQuery}”` : 'Complete regional database'}</Text>
        </View>
        <View style={styles.resultActions}>
          {activeQuery ? <Pill label="Show all" icon="close-circle-outline" onPress={() => { setActiveQuery(''); setQuery(''); setNotice('Showing all regional foods.'); }} /> : null}
          <Pill label={tier === 'free' ? 'Standard cards' : 'Expanded access'} icon="options-outline" />
        </View>
      </View>

      <View style={styles.foodGrid}>
        {visibleResults.map((item) => {
          const locked = item.isBranded && tier === 'free';
          return (
            <ClayCard key={item.id} style={styles.foodCard}>
              <View style={styles.foodImageWrap}>
                <FoodImage source={item.image} style={styles.foodCardImage} />
                <View style={styles.calorieBadge}>
                  <Text style={styles.calorieBadgeText}>{item.calories} kcal</Text>
                </View>
                {locked ? (
                  <View style={styles.foodLockOverlay}>
                    <View style={styles.foodLockCircle}>
                      <Ionicons name="lock-closed" size={18} color={colors.surface} />
                    </View>
                    <Text style={styles.foodLockText}>PLUS</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.foodBody}>
                <View style={styles.foodTitleRow}>
                  <View style={styles.foodCopy}>
                    <Text numberOfLines={1} style={styles.foodTitle}>
                      {item.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.foodPortion}>
                      {item.portionSize} · {item.region}
                    </Text>
                  </View>
                  {item.isBranded ? (
                    <View style={styles.brandTag}>
                      <Text style={styles.brandTagText}>{item.brand}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.foodMacros}>
                  <Text style={styles.foodMacro}>
                    <Text style={styles.foodMacroStrong}>{item.protein}g</Text> P
                  </Text>
                  <Text style={styles.foodMacro}>
                    <Text style={styles.foodMacroStrong}>{item.carbs}g</Text> C
                  </Text>
                  <Text style={styles.foodMacro}>
                    <Text style={styles.foodMacroStrong}>{item.fats}g</Text> F
                  </Text>
                  <Text style={styles.foodMacro}>
                    <Text style={styles.foodMacroStrong}>{item.fiber}g</Text> fiber
                  </Text>
                </View>
                <Pressable onPress={() => add(item)} style={({ pressed }) => [styles.addFoodButton, pressed && styles.pressed]}>
                  <Ionicons name={locked ? 'lock-closed' : 'add'} size={17} color={colors.primary} />
                  <Text style={styles.addFoodText}>{locked ? 'Unlock branded food' : 'Add to today'}</Text>
                </Pressable>
              </View>
            </ClayCard>
          );
        })}
      </View>

      {showingFallback ? (
        <ClayCard style={styles.noResults}>
          <Ionicons name="search-outline" size={30} color={colors.primary} />
          <Text style={styles.emptyTitle}>No exact match—food cards restored</Text>
          <Text style={styles.emptyDetail}>The full selected region remains visible. Try a shorter name or ask Calo AI for an estimate.</Text>
        </ClayCard>
      ) : null}
    </ScreenScroll>
  );
}

function ScanTab(props: Omit<React.ComponentProps<typeof PhotoMealScanner>, 'surface'> & { onAiUsage: (used: number) => void }) {
  return (
    <ScreenScroll>
      <ScreenTitle eyebrow="MEAL SCANNER" title="Scan or speak" subtitle="Capture a photo or describe your meal by voice. Review the English estimate before saving." />
      <PhotoMealScanner {...props} surface="scan" />
      <VoiceMealLogger tier={props.tier} onAddFood={props.onAddFood} onAiUsage={props.onAiUsage} onUpgrade={props.onUpgrade} />
    </ScreenScroll>
  );
}

function PlansTab({
  activePlan,
  tier,
  calorieTarget,
  monthlyTarget,
  logs,
  trialStartedAt,
  planStartedAt,
  aiChecksUsed,
  onAiUsage,
  onUpgrade,
  onAddFood,
  onPlanChange,
  onTierChange,
}: {
  activePlan: PlanId;
  tier: Tier;
  calorieTarget: number;
  monthlyTarget: number;
  logs: FoodLog[];
  trialStartedAt: string;
  planStartedAt: string;
  aiChecksUsed: number;
  onAiUsage: (used: number) => void;
  onUpgrade: (reason: string) => void;
  onAddFood: (food: Food, mealType?: MealType, note?: string, loggedAt?: string) => void;
  onPlanChange: (plan: PlanId) => void;
  onTierChange: (tier: Tier) => void;
}) {
  const [promo, setPromo] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [planMealInput, setPlanMealInput] = useState('');
  const [planMealReply, setPlanMealReply] = useState<{ headline: string; detail: string } | null>(null);
  const currentPlanDay = Math.min(30, Math.max(1, Math.floor((startOfLocalDay(Date.now()).getTime() - startOfLocalDay(planStartedAt).getTime()) / DAY_MS) + 1));
  const trialExpired = Date.now() - new Date(trialStartedAt).getTime() >= 3 * DAY_MS;
  const [selectedDay, setSelectedDay] = useState(currentPlanDay);
  const planDays = useMemo(() => {
    let consumedBefore = 0;
    return Array.from({ length: 30 }, (_, index) => {
      const dayNumber = index + 1;
      const date = planDateForDay(planStartedAt, dayNumber);
      const dayLogs = logs.filter((log) => localDayKey(log.loggedAt) === localDayKey(date));
      const consumed = dayLogs.reduce((sum, log) => sum + log.food.calories, 0);
      const allowance = dayNumber <= currentPlanDay
        ? Math.max(0, calorieTarget * dayNumber - consumedBefore)
        : calorieTarget;
      consumedBefore += consumed;
      return {
        dayNumber,
        date,
        consumed,
        allowance,
        remaining: allowance - consumed,
        locked: tier === 'free' && (trialExpired || dayNumber > 3),
      };
    });
  }, [calorieTarget, currentPlanDay, logs, tier, trialExpired, planStartedAt]);
  const selectedPlanDay = planDays[selectedDay - 1] ?? planDays[0];
  const consumedCalories = selectedPlanDay.consumed;
  const remainingCalories = selectedPlanDay.remaining;
  const monthlyConsumed = planDays.reduce((sum, day) => sum + day.consumed, 0);

  const selectPlanDay = (dayNumber: number) => {
    const day = planDays[dayNumber - 1];
    if (day?.locked) {
      onUpgrade('Your free plan includes the first 3 days of the 30-day schedule. Upgrade to unlock Days 4–30.');
      return;
    }
    setSelectedDay(dayNumber);
    setPlanMealReply(null);
  };

  const planLogBusy = useRef(false);
  const [loggingPlanMeal, setLoggingPlanMeal] = useState(false);
  const logPlanMeal = async () => {
    if (planLogBusy.current) return;
    const cleaned = planMealInput.trim();
    if (!cleaned) {
      setPlanMealReply({
        headline: 'Tell me what you ate',
        detail: 'Example: “Breakfast 700 calories” or “Chicken biryani and 2 samosas.”',
      });
      return;
    }

    if (selectedPlanDay.locked) {
      onUpgrade('Upgrade to add entries after Day 3 of the 30-day schedule.');
      return;
    }

    planLogBusy.current = true;
    setLoggingPlanMeal(true);
    try {
    const parsed = await resolveMealInput(cleaned, 'lunch', onAiUsage);

    const updatedConsumed = consumedCalories + parsed.calories;
    const balance = selectedPlanDay.allowance - updatedConsumed;

    setPlanMealReply({
      headline: `${parsed.calories.toLocaleString()} kcal added to Day ${selectedDay}`,
      detail: `${parsed.explanation} Day ${selectedDay} balance: ${balance >= 0 ? `${balance.toLocaleString()} kcal remaining` : `${Math.abs(balance).toLocaleString()} kcal above the allowance`}.`,
    });

    onAddFood(
      {
        id: `meal-plan-${Date.now()}`,
        name: parsed.itemsSummary,
        region: 'Plan Check-in',
        brand: parsed.isManual ? 'Manual Log' : 'Calo AI Plan Estimate',
        isBranded: false,
        portionSize: parsed.portion,
        calories: parsed.calories,
        protein: parsed.protein,
        carbs: parsed.carbs,
        fats: parsed.fats,
        fiber: parsed.fiber,
        processingLevel: 'Minimally Processed',
        accessTier: 'free',
        image: foods[1].image,
      },
      parsed.mealType,
      `30-day plan · Day ${selectedDay}. ${parsed.explanation}`,
      new Date(selectedPlanDay.date.getFullYear(), selectedPlanDay.date.getMonth(), selectedPlanDay.date.getDate(), 12).toISOString(),
    );
    setPlanMealInput('');
    } catch (error) {
      if (error instanceof NutritionAiError && error.code === 'FREE_LIMIT') onUpgrade(error.message);
      setPlanMealReply({ headline: 'Meal not added', detail: error instanceof Error ? error.message : 'Unable to estimate this meal.' });
    } finally { planLogBusy.current = false; setLoggingPlanMeal(false); }
  };

  return (
    <ScreenScroll>
      <ScreenTitle
        eyebrow="DIET & BULK PLANS"
        title="Choose a plan that fits"
        subtitle="Whether cutting fat or building muscle (Bulking 3,000+ kcal), track easily."
      />

      <View style={styles.planList}>
        {planOptions.map((plan) => {
          const selected = plan.id === activePlan;
          return (
            <Pressable key={plan.id} onPress={() => onPlanChange(plan.id)} style={({ pressed }) => pressed && styles.pressed}>
              <ClayCard style={[styles.planOptionCard, selected && { borderColor: plan.accent, borderWidth: 2 }]}>
                <View style={styles.planArt}>
                  <FoodImage source={plan.image} style={styles.planArtImage} />
                  <LinearGradient colors={['rgba(15,35,30,0.05)', 'rgba(15,35,30,0.82)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.planArtContent}>
                    <Ionicons
                      name={plan.id === 'low' ? 'leaf-outline' : plan.id === 'bulk' ? 'barbell-outline' : plan.id === 'medium' ? 'time-outline' : 'flame-outline'}
                      size={28}
                      color="#FFFFFF"
                    />
                    <Text style={styles.planArtTime}>{plan.id === 'bulk' ? '3000+' : plan.id === 'low' ? '12%' : plan.id === 'medium' ? '16:8' : '18:6'}</Text>
                  </View>
                </View>
                <View style={styles.planOptionCopy}>
                  <View style={styles.planLabelRow}>
                    <Text style={[styles.cardEyebrow, { color: plan.accent }]}>{plan.eyebrow}</Text>
                    {plan.badge ? (
                      <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                        <Text style={[styles.popularText, { color: plan.accent }]}>{plan.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.planOptionTitle}>{plan.title}</Text>
                  <Text style={[styles.planOptionSchedule, { color: plan.accent }]}>{plan.schedule}</Text>
                  <Text style={styles.planOptionDetail}>{plan.description}</Text>
                </View>
                <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={27} color={selected ? colors.primary : colors.outline} />
              </ClayCard>
            </Pressable>
          );
        })}
      </View>

      <ClayCard style={styles.scheduleCard}>
        <View style={styles.scheduleHeader}>
          <View>
            <Text style={styles.cardEyebrow}>30-DAY FLEXIBLE SCHEDULE</Text>
            <Text style={styles.scheduleTitle}>{monthlyConsumed.toLocaleString()} / {monthlyTarget.toLocaleString()} kcal</Text>
            <Text style={styles.scheduleSubtitle}>Unused calories roll into the next active day. Free preview includes Days 1–3.</Text>
          </View>
          <View style={styles.scheduleMonthBadge}><Text style={styles.scheduleMonthBadgeText}>MONTH 1</Text></View>
        </View>
        <ProgressBar value={monthlyTarget > 0 ? monthlyConsumed / monthlyTarget : 0} color={colors.gold} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRail}>
          {planDays.map((day) => {
            const selected = day.dayNumber === selectedDay;
            const isToday = day.dayNumber === currentPlanDay;
            return (
              <Pressable
                key={day.dayNumber}
                onPress={() => selectPlanDay(day.dayNumber)}
                style={[styles.dayCard, selected && styles.dayCardSelected, day.locked && styles.dayCardLocked]}
              >
                <View style={styles.dayCardTop}>
                  <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>DAY {day.dayNumber}</Text>
                  {day.locked ? <Ionicons name="lock-closed" size={12} color={colors.muted} /> : isToday ? <View style={styles.todayDot} /> : null}
                </View>
                <Text style={styles.dayDate}>{day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                <Text style={[styles.dayCalories, day.remaining < 0 && { color: colors.coral }]}>{day.consumed.toLocaleString()} kcal</Text>
                <Text style={styles.dayAllowance}>of {day.allowance.toLocaleString()} available</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ClayCard>

      {/* AI Plan Meal Check-in Box */}
      <ClayCard style={styles.mealAiCard}>
        <View style={styles.mealAiHero}>
          <FoodImage source={foods[1].image} style={styles.mealAiHeroImage} />
          <LinearGradient colors={['rgba(18,48,40,0.62)', 'rgba(12,31,26,0.96)']} style={StyleSheet.absoluteFill} />
          <View style={styles.mealAiHeroContent}>
            <View style={styles.aiAssistantTop}>
              <View style={styles.aiAssistantIcon}>
                <Ionicons name="sparkles" size={17} color="#F5D98A" />
              </View>
              <Text style={styles.aiAssistantEyebrow}>AI MEAL CHECK-IN · DIET & BULK</Text>
            </View>
            <Text style={styles.mealAiTitle}>Check what you ate against your plan</Text>
            <Text style={styles.mealAiSubtitle}>
              Enter calories directly, or provide food names for an AI average. The selected day’s consumed and remaining calories update automatically.
            </Text>
          </View>
        </View>
        <View style={styles.mealAiBody}>
          <View style={styles.mealBalanceRow}>
            <Metric label={`DAY ${selectedDay} ALLOWANCE`} value={selectedPlanDay.allowance.toLocaleString()} suffix="kcal" />
            <Metric label="CONSUMED" value={consumedCalories.toLocaleString()} suffix="kcal" />
            <Metric label="REMAINING" value={Math.abs(remainingCalories).toLocaleString()} suffix={remainingCalories < 0 ? 'over' : 'kcal'} />
          </View>
          <TextInput
            accessibilityLabel="Tell Calo AI what you ate"
            multiline
            value={planMealInput}
            onChangeText={setPlanMealInput}
            placeholder="Example: Breakfast 700 calories · or · 2 eggs and 1 paratha"
            placeholderTextColor="#89938E"
            style={styles.mealAiInput}
          />
          <Text style={styles.sectionSubtitle}>Food descriptions go to Google AI. Avoid sensitive personal details; free-tier inputs may be used to improve its products. Estimates are approximate.</Text>
          <PrimaryButton label={loggingPlanMeal ? 'Estimating meal…' : 'Calculate & add to plan'} loading={loggingPlanMeal} icon="sparkles" onPress={logPlanMeal} />
          <Text style={styles.mealAiUsage}>
            Manual calorie logging unlimited · {tier === 'free' ? `${Math.max(0, 3 - aiChecksUsed)} of 3 free AI estimates left` : 'Unlimited AI estimates'}
          </Text>
          {planMealReply ? (
            <View style={styles.mealAiReply}>
              <Ionicons name="checkmark-circle" size={23} color={colors.primary} />
              <View style={styles.mealAiReplyCopy}>
                <Text style={styles.mealAiReplyTitle}>{planMealReply.headline}</Text>
                <Text style={styles.mealAiReplyDetail}>{planMealReply.detail}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ClayCard>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Choose your Verse</Text>
          <Text style={styles.sectionSubtitle}>Select the tier that matches how you want to track.</Text>
        </View>
      </View>

      <View style={styles.pricingGrid}>
        <PriceCard tier="free" current={tier === 'free'} price="$0" detail="Unlimited manual search & logging · 3 AI checks" onChoose={() => onTierChange('free')} />
        <PriceCard tier="plus" current={tier === 'plus'} price="$5" detail="Unlimited AI estimates + branded foods" onChoose={() => onTierChange('plus')} />
        <PriceCard tier="pro" current={tier === 'pro'} price="$10" detail="Unlimited AI photo scans + voice studio" onChoose={() => onTierChange('pro')} />
      </View>

      <ClayCard style={styles.promoCard}>
        <View style={styles.promoIcon}>
          <Ionicons name="pricetag-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.promoCopy}>
          <Text style={styles.promoTitle}>Have a promo code?</Text>
          <Text style={styles.promoDetail}>Try VERSE20 in this demo.</Text>
        </View>
        <TextInput
          autoCapitalize="characters"
          value={promo}
          onChangeText={setPromo}
          placeholder="CODE"
          placeholderTextColor="#8C9691"
          style={styles.promoInput}
        />
        <Pressable
          onPress={() => {
            const clean = promo.trim().toUpperCase();
            if (clean === '1519') {
              onTierChange('pro');
              setPromoMessage('🎉 Promo 1519 applied! 100% Pro unlocked.');
            } else if (clean === 'VERSE20') {
              setPromoMessage('20% demo discount applied!');
            } else {
              setPromoMessage('Use code 1519 for free Pro!');
            }
          }}
          style={styles.applyButton}
        >
          <Text style={styles.applyText}>Apply</Text>
        </Pressable>
      </ClayCard>
      {promoMessage ? <Text style={styles.promoMessage}>{promoMessage}</Text> : null}
    </ScreenScroll>
  );
}

function PriceCard({ tier, current, price, detail, onChoose }: { tier: Tier; current: boolean; price: string; detail: string; onChoose: () => void }) {
  return (
    <ClayCard tone={tier === 'pro' ? 'gold' : tier === 'plus' ? 'mint' : 'white'} style={[styles.priceCard, current && styles.priceCardCurrent]}>
      <View style={styles.priceTop}>
        <Text style={styles.priceTier}>{tier.toUpperCase()}</Text>
        {tier === 'pro' ? <Ionicons name="sparkles" size={18} color={colors.gold} /> : null}
      </View>
      <Text style={styles.price}>
        {price}
        <Text style={styles.priceMonth}>{tier === 'free' ? '' : ' /mo'}</Text>
      </Text>
      <Text style={styles.priceDetail}>{detail}</Text>
      <Pressable onPress={onChoose} style={[styles.priceButton, current && styles.priceButtonCurrent]}>
        <Text style={[styles.priceButtonText, current && styles.priceButtonTextCurrent]}>{current ? 'Current plan' : `Try ${tier}`}</Text>
      </Pressable>
    </ClayCard>
  );
}

function ProfileTab({
  profile,
  targets,
  tier,
  activePlan,
  onCustomTargetChange,
  onUpgrade,
  onOpenAdmin,
  onSignOut,
  onReset,
}: {
  profile: Profile;
  targets: NutritionTargets;
  tier: Tier;
  activePlan: PlanId;
  onCustomTargetChange?: (target: number) => void;
  onUpgrade: () => void;
  onOpenAdmin?: () => void;
  onSignOut: () => void;
  onReset: () => void;
}) {
  const [customGoal, setCustomGoal] = useState(String(targets.calories));
  const [isAdminUser, setIsAdminUser] = useState(false);
  const active = planOptions.find((plan) => plan.id === activePlan) ?? planOptions[0];

  useEffect(() => {
    const checkAdmin = async () => {
      const email = (profile.email || '').trim().toLowerCase();
      if (email === 'hamdanamir2005@gmail.com') {
        setIsAdminUser(true);
        return;
      }
      try {
        const stored = await AsyncStorage.getItem('caloverse_custom_admins');
        const list: string[] = stored ? JSON.parse(stored) : [];
        setIsAdminUser(list.includes(email));
      } catch {
        setIsAdminUser(false);
      }
    };
    checkAdmin();
  }, [profile.email]);

  return (
    <ScreenScroll>
      <ScreenTitle eyebrow="YOUR SPACE" title="Profile & targets" subtitle="A clear view of the choices powering your plan." />
      <ClayCard tone="mint" style={styles.profileHero}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{profile.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View style={styles.profileGoalBadge}>
            <Text style={styles.profileGoalText}>{formatGoal(profile.goal)}</Text>
          </View>
        </View>
        <View style={styles.profileTier}>
          <Text style={styles.profileTierText}>{tier.toUpperCase()}</Text>
        </View>
      </ClayCard>

      <View style={styles.profileMetrics}>
        <ClayCard style={styles.profileMetric}>
          <Metric label="DAILY TARGET" value={targets.calories.toLocaleString()} suffix="kcal" />
        </ClayCard>
        <ClayCard style={styles.profileMetric}>
          <Metric label="CURRENT PLAN" value={profile.goal === 'maintain' && activePlan === 'low' ? 'Weight Maintenance' : active.title} />
        </ClayCard>
        <ClayCard style={styles.profileMetric}>
          <Metric label="BMR" value={targets.bmr.toLocaleString()} suffix="kcal" />
        </ClayCard>
        <ClayCard style={styles.profileMetric}>
          <Metric label="WATER" value={(targets.waterMl / 1000).toFixed(1)} suffix="L" />
        </ClayCard>
      </View>

      {/* Quick Daily Target Adjuster */}
      <ClayCard style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Custom Daily Calorie Target</Text>
        <Text style={styles.detailLabel}>Set a specific calorie goal (e.g. 3,000 kcal for Muscle Bulk):</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            value={customGoal}
            onChangeText={setCustomGoal}
            keyboardType="numeric"
            style={[styles.searchInput, { borderWidth: 1, borderColor: colors.outline, borderRadius: 14, paddingHorizontal: 12 }]}
          />
          <PrimaryButton
            compact
            label="Update"
            onPress={() => {
              const val = Number(customGoal);
              if (val >= 1000 && val <= 8000) {
                onCustomTargetChange?.(val);
                Alert.alert('Updated', `Daily calorie target updated to ${val} kcal.`);
              }
            }}
          />
        </View>
      </ClayCard>

      <ClayCard style={styles.detailsCard}>
        <DetailRow icon="body-outline" label="Body profile" value={`${profile.age} yrs · ${profile.heightCm} cm · ${profile.weightKg} kg`} />
        <View style={styles.detailDivider} />
        <DetailRow icon="walk-outline" label="Activity" value={profile.activity.replace('_', ' ')} />
        <View style={styles.detailDivider} />
        <DetailRow icon="analytics-outline" label="Formula" value="Mifflin–St Jeor" />
      </ClayCard>

      {/* Admin Panel Button - ONLY for hamdanamir2005@gmail.com and authorized admins */}
      {isAdminUser && onOpenAdmin ? (
        <PrimaryButton
          label="Admin Dashboard"
          icon="shield-checkmark-outline"
          onPress={onOpenAdmin}
          style={{ backgroundColor: colors.coral }}
        />
      ) : null}

      {tier !== 'pro' ? <PrimaryButton label="Explore upgrades" icon="sparkles" onPress={onUpgrade} /> : null}
      <View style={styles.profileActions}>
        <SecondaryButton label="Sign out" icon="log-out-outline" onPress={onSignOut} style={styles.profileAction} />
        <SecondaryButton label="Reset plan" icon="refresh-outline" onPress={onReset} style={styles.profileAction} />
      </View>
    </ScreenScroll>
  );
}

function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}><Ionicons name={icon} size={19} color={colors.primary} /></View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function FeatureLine({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.featureLine}>
      <View style={styles.featureCheck}><Ionicons name="checkmark" size={15} color={colors.primaryDark} /></View>
      <Ionicons name={icon} size={19} color="#765B15" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function UpgradeModal({
  visible,
  reason,
  currentTier,
  onClose,
  onChoose,
}: {
  visible: boolean;
  reason: string;
  currentTier: Tier;
  onClose: () => void;
  onChoose: (tier: Tier) => void;
}) {
  const [platform, setPlatform] = useState<'apple' | 'google'>('apple');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApplyPromo = () => {
    const code = promoCode.trim();
    if (!code) {
      setPromoMsg({ type: 'error', text: 'Please enter a promo code.' });
      return;
    }
    if (code === '1519') {
      setPromoMsg({ type: 'success', text: 'Promo 1519 applied! 100% discount unlocked.' });
      setTimeout(() => {
        onChoose('pro');
        onClose();
        Alert.alert('🎉 Pro Plus Unlocked!', 'Promo code 1519 verified successfully. Enjoy 100% free Pro access!');
      }, 700);
    } else {
      setPromoMsg({ type: 'error', text: 'Invalid promo code. Please try again.' });
    }
  };

  const handlePurchase = () => {
    setPurchasing(true);
    setTimeout(() => {
      setPurchasing(false);
      onChoose('pro');
      onClose();
      Alert.alert(
        '🎉 Subscription Activated!',
        `Successfully subscribed to Calo Verse Pro (${selectedPlan === 'annual' ? 'Annual Plan' : 'Monthly Plan'}) via ${platform === 'apple' ? 'Apple App Store' : 'Google Play'}. (Local Testing Mode)`
      );
    }, 1200);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable accessibilityLabel="Close upgrade modal" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalSheet, { maxHeight: '90%', paddingBottom: 10 }]}>
          <View style={styles.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>

          {/* Header */}
          <View style={styles.modalHeading}>
            <View style={styles.modalSparkle}>
              <Ionicons name="sparkles" size={25} color="#765B15" />
            </View>
            <View style={styles.modalHeadingCopy}>
              <Text style={styles.modalTitle}>Calo Verse Pro</Text>
              <Text style={styles.modalSubtitle}>{reason}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={21} color={colors.muted} />
            </Pressable>
          </View>

          {/* Platform toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceSoft, borderRadius: 16, padding: 3, gap: 3 }}>
            <Pressable
              onPress={() => setPlatform('apple')}
              style={[{ flex: 1, paddingVertical: 8, borderRadius: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
                platform === 'apple' && { backgroundColor: colors.surface }]}
            >
              <Ionicons name="logo-apple" size={15} color={platform === 'apple' ? colors.primaryDark : colors.muted} />
              <Text style={{ ...typography.label, fontSize: 11, color: platform === 'apple' ? colors.primaryDark : colors.muted }}>App Store</Text>
            </Pressable>
            <Pressable
              onPress={() => setPlatform('google')}
              style={[{ flex: 1, paddingVertical: 8, borderRadius: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
                platform === 'google' && { backgroundColor: colors.surface }]}
            >
              <Ionicons name="logo-google" size={15} color={platform === 'google' ? colors.primaryDark : colors.muted} />
              <Text style={{ ...typography.label, fontSize: 11, color: platform === 'google' ? colors.primaryDark : colors.muted }}>Google Play</Text>
            </Pressable>
          </View>

          {/* Plan selector */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Monthly */}
            <Pressable
              onPress={() => setSelectedPlan('monthly')}
              style={[styles.modalPlan, { flex: 1, backgroundColor: colors.surfaceMint },
                selectedPlan === 'monthly' && styles.modalPlanSelected]}
            >
              <Text style={[styles.modalPlanTitle, { fontSize: 15 }]}>Monthly</Text>
              <Text style={{ ...typography.title, color: colors.primaryDark, fontSize: 22 }}>$9.99</Text>
              <Text style={styles.modalPlanFeatures}>per month</Text>
              <Text style={{ ...typography.label, color: colors.primary, fontSize: 9, marginTop: 3 }}>
                {platform === 'apple' ? '3-day FREE trial' : 'Start today'}
              </Text>
            </Pressable>
            {/* Annual */}
            <Pressable
              onPress={() => setSelectedPlan('annual')}
              style={[styles.modalPlan, { flex: 1, backgroundColor: colors.goldSoft },
                selectedPlan === 'annual' && styles.modalPlanSelected]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.modalPlanTitle, { fontSize: 15 }]}>Annual</Text>
                <View style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ ...typography.label, color: '#fff', fontSize: 8 }}>SAVE 40%</Text>
                </View>
              </View>
              <Text style={{ ...typography.title, color: colors.primaryDark, fontSize: 22 }}>$71.99</Text>
              <Text style={styles.modalPlanFeatures}>$5.99/month</Text>
              <Text style={{ ...typography.label, color: '#775A12', fontSize: 9, marginTop: 3 }}>Best value</Text>
            </Pressable>
          </View>

          {/* Feature highlights */}
          <View style={{ gap: 8 }}>
            {[
              { icon: 'camera-outline' as IconName, text: 'Unlimited photo scans + text refinement' },
              { icon: 'sparkles' as IconName, text: 'Unlimited Calo AI meal estimates' },
              { icon: 'mic-outline' as IconName, text: 'Multilingual voice food assistant' },
              { icon: 'barcode-outline' as IconName, text: 'Packaged food barcode scanning' },
            ].map((f) => (
              <View key={f.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={f.icon} size={15} color={colors.primary} />
                </View>
                <Text style={{ ...typography.body, fontSize: 12, color: colors.primaryDark, flex: 1 }}>{f.text}</Text>
              </View>
            ))}
          </View>

          {/* Promo Code input */}
          <View style={{ backgroundColor: colors.surfaceSoft, borderRadius: 16, padding: 10, gap: 6, borderWidth: 1, borderColor: colors.outline }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="gift-outline" size={16} color={colors.primary} />
              <Text style={{ ...typography.label, fontSize: 11, color: colors.ink }}>Have a Promo Code?</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                value={promoCode}
                onChangeText={(txt) => { setPromoCode(txt); setPromoMsg(null); }}
                placeholder="Enter code (e.g. 1519)"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: colors.ink,
                  borderWidth: 1,
                  borderColor: colors.outline,
                }}
              />
              <Pressable
                onPress={handleApplyPromo}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...typography.label, color: '#fff', fontSize: 11 }}>Apply</Text>
              </Pressable>
            </View>
            {promoMsg ? (
              <Text style={{ ...typography.label, fontSize: 11, color: promoMsg.type === 'success' ? '#1B8755' : '#D9534F' }}>
                {promoMsg.text}
              </Text>
            ) : null}
          </View>

          {/* CTA button */}
          <PrimaryButton
            label={
              purchasing
                ? (platform === 'apple' ? 'Confirming with Face ID…' : 'Processing…')
                : platform === 'apple'
                ? selectedPlan === 'monthly'
                  ? 'Start 3-Day Free Trial · $9.99/mo'
                  : 'Subscribe Annual · $71.99/yr'
                : selectedPlan === 'monthly'
                ? 'Buy Monthly · $9.99'
                : 'Buy Annual · $71.99'
            }
            icon={purchasing ? 'hourglass-outline' : platform === 'apple' ? 'logo-apple' : 'logo-google'}
            loading={purchasing}
            onPress={handlePurchase}
          />

          {/* Restore + note */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable
              onPress={() => {
                onChoose('pro');
                onClose();
                Alert.alert('Purchases Restored', 'Your previous subscription and Pro privileges have been restored.');
              }}
            >
              <Text style={{ ...typography.label, color: colors.muted, fontSize: 10 }}>Restore Purchases</Text>
            </Pressable>
            <Text style={styles.modalDemoNote}>Demo only · No real payment</Text>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AdminPanelModal({
  visible,
  currentUserEmail,
  onClose,
}: {
  visible: boolean;
  currentUserEmail: string;
  onClose: () => void;
}) {
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const superAdmin = 'hamdanamir2005@gmail.com';

  const loadAdmins = async () => {
    try {
      const stored = await AsyncStorage.getItem('caloverse_custom_admins');
      const list: string[] = stored ? JSON.parse(stored) : [];
      setAdmins(list);
    } catch {
      setAdmins([]);
    }
  };

  useEffect(() => {
    if (visible) {
      loadAdmins();
      setNewAdminEmail('');
    }
  }, [visible]);

  const handleAddAdmin = async () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (email === superAdmin || admins.includes(email)) {
      Alert.alert('Already Admin', 'This email is already an admin.');
      return;
    }
    const updated = [...admins, email];
    setLoading(true);
    try {
      await AsyncStorage.setItem('caloverse_custom_admins', JSON.stringify(updated));
      setAdmins(updated);
      setNewAdminEmail('');
      Alert.alert('Admin Added', `${email} has been added as an admin.`);
    } catch {
      Alert.alert('Error', 'Failed to save admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = (emailToDelete: string) => {
    if (emailToDelete === superAdmin) {
      Alert.alert('Cannot Delete', 'Primary Super Admin cannot be removed.');
      return;
    }
    Alert.alert(
      'Remove Admin',
      `Are you sure you want to remove ${emailToDelete} from admins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = admins.filter((e) => e !== emailToDelete);
            try {
              await AsyncStorage.setItem('caloverse_custom_admins', JSON.stringify(updated));
              setAdmins(updated);
              Alert.alert('Removed', `${emailToDelete} is no longer an admin.`);
            } catch {
              Alert.alert('Error', 'Failed to update admin list.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable accessibilityLabel="Close admin modal" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalSheet, { maxHeight: '85%', gap: 14 }]}>
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeading}>
            <View style={[styles.modalSparkle, { backgroundColor: '#FBE8E7' }]}>
              <Ionicons name="shield-checkmark" size={24} color={colors.coral} />
            </View>
            <View style={styles.modalHeadingCopy}>
              <Text style={styles.modalTitle}>Admin Management</Text>
              <Text style={styles.modalSubtitle}>Manage administrators & app permissions</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={21} color={colors.muted} />
            </Pressable>
          </View>

          {/* Database & Subscription Overview Info */}
          <View style={{ backgroundColor: colors.surfaceMint, borderRadius: 14, padding: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="server-outline" size={16} color={colors.primaryDark} />
              <Text style={{ ...typography.label, fontSize: 12, color: colors.primaryDark }}>Database Records (Firestore)</Text>
            </View>
            <Text style={{ ...typography.body, fontSize: 11, color: colors.secondary }}>
              Subscribers and promo users (code 1519) are stored live in Firestore under <Text style={{ fontWeight: 'bold' }}>'subscriptions'</Text> and <Text style={{ fontWeight: 'bold' }}>'promoRedemptions'</Text>.
            </Text>
          </View>

          {/* Add Admin Section */}
          <View style={{ gap: 8 }}>
            <Text style={{ ...typography.label, fontSize: 12, color: colors.ink }}>ADD NEW ADMIN</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={newAdminEmail}
                onChangeText={setNewAdminEmail}
                placeholder="admin@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  flex: 1,
                  backgroundColor: colors.surfaceSoft,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13,
                  color: colors.ink,
                  borderWidth: 1,
                  borderColor: colors.outline,
                }}
              />
              <Pressable
                onPress={handleAddAdmin}
                disabled={loading}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...typography.label, color: '#fff', fontSize: 12 }}>Add</Text>
              </Pressable>
            </View>
          </View>

          {/* Admin List */}
          <View style={{ flexShrink: 1, gap: 8 }}>
            <Text style={{ ...typography.label, fontSize: 12, color: colors.ink }}>CURRENT ADMINISTRATORS</Text>
            <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
              {/* Primary Super Admin */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: colors.surfaceSoft,
                  borderRadius: 12,
                  marginBottom: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="key" size={16} color={colors.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.body, fontSize: 13, color: colors.ink, fontWeight: '600' }}>
                      {superAdmin}
                    </Text>
                    <Text style={{ ...typography.label, fontSize: 10, color: colors.muted }}>Primary Super Admin</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: colors.goldSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ ...typography.label, fontSize: 9, color: '#775A12' }}>OWNER</Text>
                </View>
              </View>

              {/* Custom Added Admins */}
              {admins.map((adm) => (
                <View
                  key={adm}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: colors.surfaceSoft,
                    borderRadius: 12,
                    marginBottom: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                    <Text style={{ ...typography.body, fontSize: 13, color: colors.ink, flex: 1 }}>
                      {adm}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteAdmin(adm)}
                    style={{ padding: 6 }}
                    accessibilityLabel={`Delete admin ${adm}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))}

              {admins.length === 0 ? (
                <Text style={{ ...typography.body, fontSize: 11, color: colors.muted, textAlign: 'center', marginVertical: 8 }}>
                  No secondary admins added yet.
                </Text>
              ) : null}
            </ScrollView>
          </View>

          <PrimaryButton label="Done" onPress={onClose} compact />
        </View>
      </View>
    </Modal>
  );
}



function ModalPlan({
  title,
  price,
  features,
  selected,
  color,
  onPress,
}: {
  title: string;
  price: string;
  features: string;
  selected: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.modalPlan, { backgroundColor: color }, selected && styles.modalPlanSelected, pressed && styles.pressed]}>
      <View style={styles.modalPlanTop}>
        <Text style={styles.modalPlanTitle}>{title}</Text>
        {selected ? <View style={styles.currentPill}><Text style={styles.currentPillText}>CURRENT</Text></View> : <Ionicons name="arrow-forward-circle" size={25} color={colors.primary} />}
      </View>
      <Text style={styles.modalPlanPrice}>{price}</Text>
      <Text style={styles.modalPlanFeatures}>{features}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: Platform.OS === 'web' ? 14 : 42, paddingHorizontal: 14, backgroundColor: 'rgba(247,250,246,0.94)', borderBottomWidth: 1, borderBottomColor: 'rgba(214,223,217,0.72)' },
  headerInner: { width: '100%', maxWidth: 760, alignSelf: 'center', minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 40, height: 40, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface, ...softShadow },
  avatarText: { ...typography.label, color: colors.primaryDark },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniBrandImage: { width: 40, height: 32, backgroundColor: 'transparent' },
  headerBrand: { fontFamily: fonts.display, color: colors.primaryDark, fontSize: 18, fontWeight: '900' },
  tierBadge: { minHeight: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: colors.surfaceMint, flexDirection: 'row', alignItems: 'center', gap: 5 },
  proBadge: { backgroundColor: colors.goldSoft },
  tierBadgeText: { ...typography.label, fontSize: 10, color: colors.primary },
  viewport: { flex: 1 },
  screenScroll: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 160, gap: 18 },
  nav: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 28 : 42, backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(214,223,217,0.8)', ...softShadow },
  navInner: { width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-around' },
  navItem: { minWidth: 60, alignItems: 'center', gap: 3 },
  navIconWrap: { width: 43, height: 37, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  navIconSelected: { backgroundColor: colors.primarySoft },
  navScan: { width: 50, height: 44, borderRadius: 20, backgroundColor: colors.surfaceMint, marginTop: -17, ...softShadow },
  lockDot: { position: 'absolute', top: 2, right: 1, width: 15, height: 15, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  navLabel: { ...typography.label, color: '#7D8782', fontSize: 10 },
  navLabelSelected: { color: colors.primaryDark },
  levelUpButton: { backgroundColor: colors.goldSoft, minHeight: 36, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelUpText: { ...typography.label, color: '#775A12', fontSize: 11 },
  calorieCard: { padding: 22, gap: 18 },
  calorieTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardEyebrow: { ...typography.label, color: colors.primary, fontSize: 10, letterSpacing: 1.1 },
  bigNumber: { ...typography.title, color: colors.primaryDark, fontSize: 44, lineHeight: 48, marginTop: 4 },
  bigNumberSuffix: { ...typography.body, color: colors.muted, fontSize: 13 },
  remainingBubble: { width: 94, height: 94, borderRadius: 47, backgroundColor: 'rgba(255,255,255,0.74)', borderWidth: 7, borderColor: 'rgba(40,107,87,0.12)', alignItems: 'center', justifyContent: 'center' },
  remainingNumber: { ...typography.heading, color: colors.primaryDark, fontSize: 20 },
  remainingLabel: { ...typography.label, color: colors.muted, fontSize: 9 },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  miniMacro: { width: '48%', flexGrow: 1, minHeight: 102, borderRadius: 17, overflow: 'hidden', position: 'relative', justifyContent: 'flex-end' },
  macroHint: { color: '#FFFFFF', opacity: 0.85, fontSize: 10, marginTop: 4, marginBottom: 4 },
  macroBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  macroContent: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 11 },
  macroDot: { width: 7, height: 29, borderRadius: 5 },
  macroLabel: { ...typography.label, color: 'rgba(255,255,255,0.78)', fontSize: 9 },
  macroValue: { ...typography.label, color: colors.surface, fontSize: 11 },
  macroProgressTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 4, overflow: 'hidden' },
  macroProgressFill: { height: 3, borderRadius: 2 },
  monthlyBudgetCard: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.68)', borderWidth: 1, borderColor: 'rgba(211,168,58,0.22)', padding: 15, gap: 10 },
  monthlyBudgetTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  monthlyBudgetLabel: { ...typography.label, color: colors.muted, fontSize: 9, letterSpacing: 1 },
  monthlyBudgetValue: { ...typography.heading, color: colors.primaryDark, fontSize: 19, marginTop: 3 },
  monthlyDayBadge: { ...typography.label, color: '#765B15', backgroundColor: colors.goldSoft, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 11, fontSize: 9 },
  monthlyBudgetHint: { ...typography.body, color: colors.muted, fontSize: 10, lineHeight: 15 },
  quickRow: { flexDirection: 'row', gap: 12 },
  quickPress: { flex: 1 },
  quickCard: { minHeight: 148, position: 'relative' },
  quickBackground: { position: 'absolute', width: '100%', height: '100%' },
  quickContent: { flex: 1, justifyContent: 'flex-end', padding: 15, gap: 5 },
  quickIcon: { width: 42, height: 42, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  quickLock: { position: 'absolute', right: 4, top: 4 },
  quickTitle: { ...typography.heading, fontSize: 17, color: '#FFFFFF' },
  quickDetail: { ...typography.body, color: 'rgba(255,255,255,0.82)', fontSize: 12 },
  waterCard: { padding: 20, gap: 16 },
  waterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  waterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waterIcon: { width: 42, height: 42, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  waterTitle: { ...typography.heading, fontSize: 17 },
  waterSub: { ...typography.body, color: colors.muted, fontSize: 11 },
  waterAmount: { ...typography.heading, color: colors.blue, fontSize: 18 },
  waterUnit: { ...typography.body, color: colors.muted, fontSize: 11 },
  glassRow: { flexDirection: 'row', gap: 6 },
  glass: { flex: 1, height: 22, borderRadius: 7, backgroundColor: 'rgba(77,134,168,0.15)', borderWidth: 1, borderColor: 'rgba(77,134,168,0.2)' },
  glassActive: { backgroundColor: '#73B8DC', borderColor: '#73B8DC' },
  waterActions: { flexDirection: 'row', gap: 10 },
  waterUndo: { flex: 0.6, backgroundColor: 'rgba(255,255,255,0.65)' },
  waterAdd: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3 },
  sectionTitle: { ...typography.heading, fontSize: 19 },
  sectionSubtitle: { ...typography.body, color: colors.muted, fontSize: 12 },
  sectionLink: { ...typography.label, color: colors.primary },
  logRow: { gap: 13, paddingVertical: 3, paddingRight: 12 },
  logCard: { width: 220 },
  logImage: { height: 105 },
  logCopy: { padding: 14, gap: 3 },
  logTitle: { ...typography.heading, fontSize: 15 },
  logMeta: { ...typography.body, color: colors.muted, fontSize: 11 },
  emptyCard: { padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyIcon: { width: 46, height: 46, borderRadius: 18, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center' },
  emptyCopy: { flex: 1, gap: 3 },
  emptyTitle: { ...typography.heading, fontSize: 16 },
  emptyDetail: { ...typography.body, color: colors.muted, fontSize: 12 },
  emptyAdd: { width: 40, height: 40, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchShell: { minHeight: 58, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, flexDirection: 'row', alignItems: 'center', paddingLeft: 17, paddingRight: 7, gap: 10, ...softShadow },
  searchInput: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 14, color: colors.ink, paddingVertical: 12, outlineStyle: 'none' } as any,
  searchButton: { width: 44, height: 44, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 4 },
  notice: { ...typography.body, color: colors.muted, fontSize: 11, flex: 1 },
  searchCount: { ...typography.label, color: '#9A5C37', fontSize: 11 },
  unlimited: { ...typography.label, color: colors.primary, fontSize: 11 },
  aiAssistantCard: { minHeight: 180, overflow: 'hidden', position: 'relative', justifyContent: 'center' },
  aiAssistantImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  aiAssistantShade: { ...StyleSheet.absoluteFillObject },
  aiAssistantContent: { padding: 21, gap: 8 },
  aiAssistantTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  aiAssistantIcon: { width: 32, height: 32, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  aiAssistantEyebrow: { ...typography.label, color: '#F5D98A', fontSize: 10, letterSpacing: 1.1 },
  aiAssistantHeadline: { ...typography.heading, color: colors.surface, fontSize: 22 },
  aiAssistantDetail: { ...typography.body, color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 20, maxWidth: 610 },
  aiAskButton: { minHeight: 44, alignSelf: 'flex-start', borderRadius: 18, paddingHorizontal: 14, backgroundColor: '#F5D98A', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  aiAskButtonText: { ...typography.label, color: colors.primaryDark, fontSize: 11 },
  aiAskCount: { ...typography.label, color: '#765B1D', fontSize: 9, borderLeftWidth: 1, borderLeftColor: 'rgba(90,67,12,0.24)', paddingLeft: 8 },
  aiAssistantDisclaimer: { ...typography.label, color: 'rgba(255,255,255,0.55)', fontSize: 9, marginTop: 3 },
  chipRow: { gap: 8, paddingVertical: 2, paddingRight: 18 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  resultActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 7 },
  foodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  foodCard: { width: '48%', minWidth: 220, flexGrow: 1 },
  foodImageWrap: { height: 142, position: 'relative' },
  foodCardImage: { height: '100%' },
  calorieBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 11 },
  calorieBadgeText: { ...typography.label, fontSize: 10 },
  foodLockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25,35,31,0.48)', alignItems: 'center', justifyContent: 'center', gap: 6 },
  foodLockCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(211,168,58,0.95)', alignItems: 'center', justifyContent: 'center' },
  foodLockText: { ...typography.label, color: colors.surface, letterSpacing: 1 },
  foodBody: { padding: 15, gap: 11 },
  foodTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  foodCopy: { flex: 1, gap: 3 },
  foodTitle: { ...typography.heading, fontSize: 16 },
  foodPortion: { ...typography.body, color: colors.muted, fontSize: 11 },
  brandTag: { backgroundColor: colors.goldSoft, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 },
  brandTagText: { ...typography.label, color: '#765B15', fontSize: 8 },
  foodMacros: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  foodMacro: { ...typography.body, color: colors.muted, fontSize: 10 },
  foodMacroStrong: { color: colors.ink, fontWeight: '800' },
  addFoodButton: { minHeight: 39, borderRadius: 18, backgroundColor: colors.surfaceMint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addFoodText: { ...typography.label, color: colors.primary, fontSize: 11 },
  noResults: { alignItems: 'center', padding: 28, gap: 7 },
  lockedHero: { padding: 25, gap: 16, alignItems: 'center' },
  lockedIcon: { width: 76, height: 76, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.56)', alignItems: 'center', justifyContent: 'center', ...softShadow },
  lockedTitle: { ...typography.title, color: '#654E13', fontSize: 26 },
  lockedDetail: { ...typography.body, color: '#715E31', textAlign: 'center', maxWidth: 480 },
  lockedFeatures: { alignSelf: 'stretch', gap: 11, marginVertical: 4 },
  featureLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureCheck: { width: 25, height: 25, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  featureText: { ...typography.body, color: '#604E27', flex: 1, fontSize: 13 },
  disclaimer: { ...typography.body, color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  modeSwitch: { flexDirection: 'row', gap: 9 },
  scanRefineCard: { padding: 15, gap: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: 1, borderColor: 'rgba(40,107,87,0.16)' },
  scanRefineHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  scanRefineIcon: { width: 42, height: 42, borderRadius: 17, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  scanRefineCopy: { flex: 1, gap: 3 },
  scanRefineTitle: { ...typography.heading, color: colors.primaryDark, fontSize: 16 },
  scanRefineSubtitle: { ...typography.body, color: colors.muted, fontSize: 11, lineHeight: 16 },
  scanRefineInput: { minHeight: 86, borderRadius: 20, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.outline, padding: 14, textAlignVertical: 'top', fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.ink, outlineStyle: 'none' } as any,
  scannerCard: { height: 370, position: 'relative', backgroundColor: '#173D31' },
  scannerImage: { height: '100%' },
  scanFrame: { position: 'absolute', left: '13%', right: '13%', top: '14%', bottom: '26%' },
  scanCorner: { position: 'absolute', width: 34, height: 34, borderColor: colors.surface },
  cornerTl: { top: 0, left: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 13 },
  cornerTr: { top: 0, right: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 13 },
  cornerBl: { bottom: 0, left: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 13 },
  cornerBr: { bottom: 0, right: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 13 },
  scanLine: { position: 'absolute', top: '48%', left: 8, right: 8, height: 3, borderRadius: 2, backgroundColor: colors.primarySoft, ...softShadow },
  scannerCopy: { position: 'absolute', left: 22, right: 22, bottom: 20, gap: 4 },
  scannerLabel: { ...typography.label, color: colors.primarySoft, fontSize: 10, letterSpacing: 1.2 },
  scannerTitle: { ...typography.heading, color: colors.surface, fontSize: 19 },
  scanResult: { padding: 20, gap: 17 },
  scanResultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  scanCalories: { ...typography.title, color: colors.primaryDark, fontSize: 33 },
  confidenceBadge: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 7 },
  confidenceText: { ...typography.label, color: colors.primary, fontSize: 10 },
  scanMacroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoMetric: { width: '48%', minWidth: 126, minHeight: 96, flexGrow: 1, borderRadius: 18, overflow: 'hidden', position: 'relative', justifyContent: 'flex-end' },
  photoMetricImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  photoMetricContent: { padding: 13 },
  scanExplanationBox: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.72)', padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  scanExplanationText: { ...typography.body, color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18 },
  voiceCard: { padding: 24, gap: 17, alignItems: 'center' },
  voiceOrb: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center', ...clayShadow },
  voiceListening: { ...typography.label, color: colors.muted, fontSize: 10, letterSpacing: 1.2 },
  voiceInput: { width: '100%', minHeight: 112, borderRadius: 24, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.outline, padding: 17, textAlignVertical: 'top', fontFamily: fonts.display, fontSize: 18, lineHeight: 25, color: colors.ink, outlineStyle: 'none' } as any,
  promptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' },
  answerBox: { width: '100%', borderRadius: 21, backgroundColor: colors.surfaceMint, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  answerText: { ...typography.body, color: colors.primaryDark, flex: 1 },
  planList: { gap: 13 },
  scheduleCard: { padding: 18, gap: 14 },
  scheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  scheduleTitle: { ...typography.title, color: colors.primaryDark, fontSize: 25, marginTop: 3 },
  scheduleSubtitle: { ...typography.body, color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3, maxWidth: 500 },
  scheduleMonthBadge: { backgroundColor: colors.goldSoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  scheduleMonthBadgeText: { ...typography.label, color: '#765B15', fontSize: 9 },
  dayRail: { gap: 9, paddingVertical: 3, paddingRight: 8 },
  dayCard: { width: 126, minHeight: 118, borderRadius: 19, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.outline, padding: 12, gap: 5 },
  dayCardSelected: { backgroundColor: colors.surfaceMint, borderWidth: 2, borderColor: colors.primary },
  dayCardLocked: { opacity: 0.58 },
  dayCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayNumber: { ...typography.label, color: colors.muted, fontSize: 9, letterSpacing: 0.7 },
  dayNumberSelected: { color: colors.primary },
  todayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  dayDate: { ...typography.body, color: colors.muted, fontSize: 10 },
  dayCalories: { ...typography.heading, color: colors.primaryDark, fontSize: 16, marginTop: 3 },
  dayAllowance: { ...typography.body, color: colors.muted, fontSize: 9, lineHeight: 13 },
  planOptionCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  planArt: { width: 84, height: 96, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  planArtImage: { width: '100%', height: '100%' },
  planArtContent: { position: 'absolute', left: 8, right: 8, bottom: 8, gap: 1 },
  planArtTime: { ...typography.heading, fontSize: 16, color: '#FFFFFF' },
  planOptionCopy: { flex: 1, minWidth: 0, gap: 3 },
  planLabelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  popularBadge: { borderRadius: 9, paddingHorizontal: 6, paddingVertical: 2 },
  popularText: { ...typography.label, fontSize: 8 },
  planOptionTitle: { ...typography.heading, fontSize: 16, flexShrink: 1 },
  planOptionSchedule: { ...typography.label, fontSize: 11 },
  planOptionDetail: { ...typography.body, color: colors.muted, fontSize: 12, lineHeight: 16 },
  safetyNote: { backgroundColor: colors.goldSoft, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  safetyText: { ...typography.body, color: '#725627', fontSize: 12, lineHeight: 18, flex: 1 },
  mealAiCard: { overflow: 'hidden' },
  mealAiHero: { minHeight: 170, position: 'relative', justifyContent: 'flex-end' },
  mealAiHeroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  mealAiHeroContent: { padding: 20, gap: 7 },
  mealAiTitle: { ...typography.heading, color: colors.surface, fontSize: 23 },
  mealAiSubtitle: { ...typography.body, color: 'rgba(255,255,255,0.84)', fontSize: 12, lineHeight: 18, maxWidth: 590 },
  mealAiBody: { padding: 18, gap: 14 },
  mealBalanceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingHorizontal: 3 },
  mealAiInput: { minHeight: 104, borderRadius: 22, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.outline, padding: 15, textAlignVertical: 'top', fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink, outlineStyle: 'none' } as any,
  mealAiUsage: { ...typography.label, color: colors.muted, fontSize: 9, textAlign: 'center' },
  mealAiReply: { borderRadius: 20, backgroundColor: colors.surfaceMint, padding: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  mealAiReplyCopy: { flex: 1, gap: 3 },
  mealAiReplyTitle: { ...typography.heading, color: colors.primaryDark, fontSize: 16 },
  mealAiReplyDetail: { ...typography.body, color: colors.muted, fontSize: 12, lineHeight: 18 },
  pricingGrid: { gap: 12 },
  priceCard: { padding: 18, gap: 9 },
  priceCardCurrent: { borderWidth: 2, borderColor: colors.primary },
  priceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceTier: { ...typography.label, color: colors.primary, fontSize: 11, letterSpacing: 1 },
  price: { ...typography.title, color: colors.primaryDark, fontSize: 27 },
  priceMonth: { ...typography.body, color: colors.muted, fontSize: 12 },
  priceDetail: { ...typography.body, color: colors.muted, fontSize: 13 },
  priceButton: { minHeight: 40, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  priceButtonCurrent: { backgroundColor: colors.primary },
  priceButtonText: { ...typography.label, color: colors.primary },
  priceButtonTextCurrent: { color: colors.surface },
  promoCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  promoIcon: { width: 42, height: 42, borderRadius: 17, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center' },
  promoCopy: { flex: 1, gap: 2 },
  promoTitle: { ...typography.label },
  promoDetail: { ...typography.body, color: colors.muted, fontSize: 10 },
  promoInput: { width: 82, minHeight: 40, borderRadius: 15, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.outline, paddingHorizontal: 10, fontFamily: fonts.display, fontSize: 12, fontWeight: '800', color: colors.ink, outlineStyle: 'none' } as any,
  applyButton: { minHeight: 40, borderRadius: 16, backgroundColor: colors.primary, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  applyText: { ...typography.label, color: colors.surface, fontSize: 11 },
  promoMessage: { ...typography.label, color: colors.primary, textAlign: 'center' },
  profileHero: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 13 },
  profileAvatar: { width: 62, height: 62, borderRadius: 25, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...softShadow },
  profileAvatarText: { ...typography.title, color: colors.surface, fontSize: 26 },
  profileCopy: { flex: 1, gap: 2 },
  profileName: { ...typography.heading, fontSize: 19 },
  profileEmail: { ...typography.body, color: colors.muted, fontSize: 11 },
  profileGoalBadge: { alignSelf: 'flex-start', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 8, paddingVertical: 4, marginTop: 3 },
  profileGoalText: { ...typography.label, color: colors.primary, fontSize: 9 },
  profileTier: { borderRadius: 14, backgroundColor: colors.goldSoft, paddingHorizontal: 10, paddingVertical: 7 },
  profileTierText: { ...typography.label, color: '#755A15', fontSize: 9 },
  profileMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  profileMetric: { width: '48%', minWidth: 145, flexGrow: 1, padding: 16 },
  detailsCard: { padding: 17, gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon: { width: 38, height: 38, borderRadius: 15, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { ...typography.label, flex: 1 },
  detailValue: { ...typography.body, color: colors.muted, fontSize: 12, textTransform: 'capitalize', textAlign: 'right' },
  detailDivider: { height: 1, backgroundColor: colors.outline },
  backendNote: { padding: 17, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  backendNoteCopy: { flex: 1, gap: 3 },
  backendNoteTitle: { ...typography.heading, color: '#654E13', fontSize: 16 },
  backendNoteText: { ...typography.body, color: '#735C24', fontSize: 12, lineHeight: 18 },
  profileActions: { flexDirection: 'row', gap: 10 },
  profileAction: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(18,28,24,0.48)', justifyContent: 'flex-end', paddingHorizontal: Platform.OS === 'web' ? 18 : 0 },
  modalSheet: { width: '100%', maxWidth: 620, alignSelf: 'center', backgroundColor: colors.background, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 22, gap: 17, ...clayShadow },
  modalHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.outline, alignSelf: 'center' },
  modalHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modalSparkle: { width: 48, height: 48, borderRadius: 19, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  modalHeadingCopy: { flex: 1, gap: 3 },
  modalTitle: { ...typography.heading, fontSize: 21 },
  modalSubtitle: { ...typography.body, color: colors.muted, fontSize: 12, lineHeight: 18 },
  modalClose: { width: 36, height: 36, borderRadius: 15, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  modalPlans: { gap: 11 },
  modalPlan: { borderRadius: 23, padding: 16, gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  modalPlanSelected: { borderWidth: 2, borderColor: colors.primary },
  modalPlanTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalPlanTitle: { ...typography.heading, fontSize: 19 },
  modalPlanPrice: { ...typography.label, color: colors.primary },
  modalPlanFeatures: { ...typography.body, color: colors.muted, fontSize: 11 },
  currentPill: { borderRadius: 10, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4 },
  currentPillText: { ...typography.label, color: colors.surface, fontSize: 8 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editTargetPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceMint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  editTargetText: { ...typography.label, fontSize: 9, color: colors.primary },
  targetPresetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
  targetPresetPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.outline },
  targetPresetSelected: { backgroundColor: colors.surfaceMint, borderColor: colors.primary },
  targetPresetText: { ...typography.label, fontSize: 11, color: colors.primaryDark },
  remainingBubbleOver: { borderColor: 'rgba(217,90,75,0.3)', backgroundColor: 'rgba(255,235,233,0.8)' },
  urduStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 6, alignSelf: 'flex-start' },
  urduStatusText: { ...typography.body, fontSize: 12, color: colors.primaryDark, fontWeight: '700' },
  aiMealBoxCard: { padding: 18, gap: 14 },
  aiMealBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiSparkleIcon: { width: 38, height: 38, borderRadius: 16, backgroundColor: 'rgba(245,217,138,0.4)', alignItems: 'center', justifyContent: 'center' },
  aiMealBoxTitle: { ...typography.heading, fontSize: 17, color: colors.primaryDark },
  aiMealBoxSubtitle: { ...typography.body, fontSize: 11, color: colors.muted, lineHeight: 16 },
  mealSlotRow: { flexDirection: 'row', gap: 8 },
  slotTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 14, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.outline },
  slotTabSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotTabText: { ...typography.label, fontSize: 11, color: colors.ink },
  slotTabTextSelected: { color: colors.surface },
  mealInputShell: { minHeight: 52, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 6, gap: 8, ...softShadow },
  mealTextInput: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 13, color: colors.ink, paddingVertical: 10, outlineStyle: 'none' } as any,
  mealLogButton: { width: 38, height: 38, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  quickScanPanel: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(40,107,87,0.16)', padding: 13, gap: 12 },
  quickScanHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickScanIcon: { width: 38, height: 38, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  quickScanCopy: { flex: 1, gap: 2 },
  quickScanTitle: { ...typography.heading, color: colors.primaryDark, fontSize: 14 },
  quickScanSubtitle: { ...typography.body, color: colors.muted, fontSize: 10, lineHeight: 14 },
  quickScanButton: { minHeight: 38, borderRadius: 15, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  quickScanButtonText: { ...typography.label, color: colors.surface, fontSize: 10 },
  quickScanProgress: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 15, backgroundColor: colors.surfaceMint, padding: 11 },
  quickScanProgressText: { ...typography.body, color: colors.primaryDark, fontSize: 11 },
  quickScanResult: { gap: 11 },
  quickScanFoodRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  quickScanImage: { width: 74, height: 74, borderRadius: 18 },
  quickScanFoodCopy: { flex: 1, gap: 2 },
  quickScanFoodName: { ...typography.heading, color: colors.primaryDark, fontSize: 15 },
  quickScanCalories: { ...typography.title, color: colors.primary, fontSize: 23 },
  quickScanMath: { ...typography.body, color: colors.muted, fontSize: 10, lineHeight: 14 },
  quickScanInput: { minHeight: 48, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, paddingHorizontal: 13, fontFamily: fonts.body, fontSize: 12, color: colors.ink, outlineStyle: 'none' } as any,
  presetSection: { gap: 6 },
  presetHeading: { ...typography.label, fontSize: 9, color: colors.muted, letterSpacing: 0.8 },
  presetChipScroll: { gap: 8, paddingVertical: 2 },
  presetChip: { backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: colors.outline, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  presetChipText: { ...typography.label, fontSize: 10, color: colors.primaryDark },
  aiLimitRow: { paddingHorizontal: 4 },
  aiLimitText: { ...typography.body, fontSize: 11, color: colors.muted },
  feedbackBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 16, padding: 12, borderWidth: 1 },
  feedbackManual: { backgroundColor: colors.surfaceMint, borderColor: colors.primarySoft },
  feedbackAi: { backgroundColor: colors.goldSoft, borderColor: '#F5D98A' },
  feedbackHeadline: { ...typography.heading, fontSize: 14, color: colors.primaryDark },
  feedbackDetail: { ...typography.body, fontSize: 11, color: colors.muted, lineHeight: 16 },
  mealGroupCard: { padding: 16, gap: 12 },
  mealGroupTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealGroupIconWrap: { width: 36, height: 36, borderRadius: 14, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center' },
  mealGroupTitle: { ...typography.heading, fontSize: 15 },
  mealGroupSub: { ...typography.body, color: colors.muted, fontSize: 11 },
  mealGroupCalBadge: { backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.outline, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  mealGroupCalText: { ...typography.label, color: colors.primary, fontSize: 11 },
  mealGroupList: { gap: 8 },
  mealItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.outline },
  mealItemImage: { width: 44, height: 44, borderRadius: 12 },
  mealItemName: { ...typography.heading, fontSize: 14 },
  mealItemMeta: { ...typography.body, color: colors.muted, fontSize: 11 },
  deleteItemButton: { padding: 8, borderRadius: 10, backgroundColor: colors.dangerSoft },
  emptySlotText: { ...typography.body, color: colors.muted, fontSize: 11, fontStyle: 'italic', paddingVertical: 4 },
  modalDemoNote: { ...typography.body, color: colors.muted, fontSize: 10, textAlign: 'center' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
