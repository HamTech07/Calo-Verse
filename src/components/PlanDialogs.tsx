import { useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FoodImage, PrimaryButton } from './ui';
import { MACRO_BACKGROUNDS } from '../data/foods';
import { clayShadow, colors, typography } from '../theme';
import type { Goal } from '../types';

export type Nutrient = 'protein' | 'carbs' | 'fats' | 'fiber';

const foodGuides: Record<Nutrient, { title: string; intro: string; foods: [string, string][]; tip: string }> = {
  protein: {
    title: 'Protein', intro: 'Build your plate with a variety of protein foods.',
    foods: [
      ['Chicken breast pieces', 'Try skinless, grilled or baked chicken.'],
      ['Lean beef strips', 'Choose cuts such as sirloin or top round; trim visible fat.'],
      ['Fish, eggs & plain yogurt', 'More ways to add variety to your protein choices.'],
      ['Lentils, chickpeas & tofu', 'Plant-based options; beans and lentils also provide fiber.'],
    ],
    tip: 'Fruit and vegetables complement protein foods, but most are not concentrated protein sources.',
  },
  carbs: {
    title: 'Carbs', intro: 'Carbohydrates provide energy. Choose fiber-rich foods often.',
    foods: [
      ['Oats, brown rice & whole-wheat roti', 'Whole-grain options for breakfast or main meals.'],
      ['Bananas, apples & oranges', 'Choose whole fruit for fiber as well as carbohydrates.'],
      ['Potatoes, sweet potatoes & corn', 'Starchy vegetables; try baked, boiled or steamed.'],
      ['Beans, peas & lentils', 'Provide carbohydrates, plant protein and fiber together.'],
    ],
    tip: 'Chicken and beef are protein choices, not major carbohydrate sources. Sauces, batter and sides change the meal.',
  },
  fats: {
    title: 'Fats', intro: 'Include sources of unsaturated fat in your meals.',
    foods: [
      ['Avocado & olives', 'Add to a salad, toast or vegetable bowl.'],
      ['Almonds, walnuts & seeds', 'Try unsalted nuts, chia, flax or pumpkin seeds.'],
      ['Olive or canola oil', 'Use a measured amount when cooking or dressing vegetables.'],
      ['Salmon & sardines', 'Oily fish provide fat as well as protein.'],
    ],
    tip: 'Fats are energy-dense. Oils, butter and ghee added during cooking still count toward your calories.',
  },
  fiber: {
    title: 'Fiber', intro: 'Look to plants: whole fruits, vegetables, legumes and whole grains.',
    foods: [
      ['Pears, apples & berries', 'Choose whole fruit, with edible skin where appropriate.'],
      ['Broccoli, carrots & green peas', 'Add a variety of vegetables to meals and snacks.'],
      ['Chickpeas, beans & lentils', 'Mix into soups, salads or a vegetable curry.'],
      ['Oats, whole grains & chia seeds', 'Add variety to breakfast bowls and side dishes.'],
    ],
    tip: 'Chicken, beef and other animal foods do not supply dietary fiber. Pair them with vegetables, beans or whole grains.',
  },
};

function CenterDialog({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose: () => void; children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss dialog" accessible={false} />
        <View style={styles.dialog} accessibilityViewIsModal>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close dialog" style={styles.close}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function NutrientInfoCard({ nutrient, style, children }: {
  nutrient: Nutrient; style?: StyleProp<ViewStyle>; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const guide = foodGuides[nutrient];
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${guide.title}: explore food sources`}
        accessibilityHint="Opens a food guide" onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
      <CenterDialog visible={open} title={`${guide.title} food guide`} onClose={() => setOpen(false)}>
        <View style={styles.hero}>
          <FoodImage source={MACRO_BACKGROUNDS[nutrient]} style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={['rgba(10,30,25,0.12)', 'rgba(10,30,25,0.85)']} style={StyleSheet.absoluteFill} />
          <Text style={styles.heroText}>{guide.intro}</Text>
        </View>
        <Text style={styles.eyebrow}>FOODS TO EXPLORE</Text>
        {guide.foods.map(([title, detail]) => (
          <View key={title} style={styles.foodRow}>
            <View style={styles.leaf}><Ionicons name="leaf-outline" size={18} color={colors.primary} /></View>
            <View style={styles.foodCopy}>
              <Text style={styles.foodTitle}>{title}</Text>
              <Text style={styles.body}>{detail}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.tip}>{guide.tip}</Text>
        <Text style={styles.caption}>General food ideas, not a prescribed diet. Portions and preparation change calories and nutrients.</Text>
        <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL('https://www.niddk.nih.gov/health-information/weight-management/healthy-eating-physical-activity-for-life/health-tips-for-adults').catch(() => undefined); }}>
          <Text style={styles.source}>Healthy eating guidance · NIH ↗</Text>
        </Pressable>
        <PrimaryButton label="Got it" onPress={() => setOpen(false)} />
      </CenterDialog>
    </>
  );
}

const goals: { id: Goal; title: string; description: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'lose', title: 'Diet', description: 'A calorie target for gradual weight loss.', icon: 'leaf-outline' },
  { id: 'maintain', title: 'Maintain', description: 'A calorie target for maintaining your weight.', icon: 'scale-outline' },
  { id: 'gain', title: 'Bulk', description: 'A higher calorie target for weight gain.', icon: 'barbell-outline' },
];

export function ResetPlanDialog({ currentGoal, onClose, onConfirm }: {
  currentGoal: Goal; onClose: () => void; onConfirm: (goal: Goal) => void;
}) {
  const [goal, setGoal] = useState(currentGoal);
  return (
    <CenterDialog visible title="Start a fresh plan" onClose={onClose}>
      <Text style={styles.body}>What would you like to focus on for the next 30 days?</Text>
      {goals.map((option) => (
        <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: goal === option.id }}
          accessibilityLabel={option.title} onPress={() => setGoal(option.id)}
          style={[styles.goal, goal === option.id && styles.selectedGoal]}>
          <Ionicons name={option.icon} size={25} color={colors.primary} />
          <View style={styles.foodCopy}>
            <Text style={styles.foodTitle}>{option.title}</Text>
            <Text style={styles.body}>{option.description}</Text>
          </View>
          <Ionicons name={goal === option.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={colors.primary} />
        </Pressable>
      ))}
      <Text style={styles.tip}>Your plan restarts from today with a recalculated target. Meal history stays saved, and today's meals still count. Your subscription and free-trial limits stay unchanged.</Text>
      <PrimaryButton label="Start my 30-day plan" icon="refresh-outline" onPress={() => onConfirm(goal)} />
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.source}>Keep my current plan</Text></Pressable>
    </CenterDialog>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(10,22,19,0.58)', padding: 20 },
  dialog: { width: '100%', maxWidth: 440, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 26, overflow: 'hidden', ...clayShadow },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12, gap: 8 },
  title: { ...typography.heading, fontSize: 21, flex: 1 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.surfaceSoft },
  scroll: { flexShrink: 1 },
  content: { padding: 20, paddingTop: 0, gap: 14 },
  card: { borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surface },
  hero: { height: 116, borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end', padding: 16 },
  heroText: { ...typography.label, color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  eyebrow: { ...typography.label, color: colors.primary, fontSize: 10, letterSpacing: 1.4 },
  foodRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  leaf: { backgroundColor: colors.surfaceMint, width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  foodCopy: { flex: 1, gap: 3 },
  foodTitle: { ...typography.label, fontSize: 14, color: colors.ink },
  body: { ...typography.body, color: colors.muted, fontSize: 13, lineHeight: 19 },
  tip: { ...typography.body, fontSize: 12, lineHeight: 18, color: colors.primaryDark, backgroundColor: colors.surfaceMint, padding: 13, borderRadius: 14 },
  caption: { ...typography.body, fontSize: 11, lineHeight: 16, color: colors.muted },
  source: { ...typography.label, color: colors.primary, fontSize: 12, textAlign: 'center' },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.outline, borderRadius: 18, padding: 16 },
  selectedGoal: { borderColor: colors.primary, backgroundColor: colors.surfaceMint },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
