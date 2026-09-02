import { foods } from '../data/foods';
import { ActivityId, Food, Goal, MealType, NutritionTargets, PlanId, Profile } from '../types';

export const activityOptions: Array<{
  id: ActivityId;
  title: string;
  detail: string;
  factor: number;
}> = [
  { id: 'sedentary', title: 'Mostly seated', detail: 'Little structured movement', factor: 1.2 },
  { id: 'light', title: 'Lightly active', detail: '1–3 active days / week', factor: 1.375 },
  { id: 'moderate', title: 'Moderately active', detail: '3–5 active days / week', factor: 1.55 },
  { id: 'active', title: 'Very active', detail: '6–7 active days / week', factor: 1.725 },
  { id: 'athlete', title: 'Athlete level', detail: 'Hard training most days', factor: 1.9 },
];

export const goalOptions: Array<{ id: Goal; title: string; detail: string }> = [
  { id: 'lose', title: 'Lose weight (Diet Cut)', detail: 'A steady, sustainable calorie deficit' },
  { id: 'maintain', title: 'Maintain weight', detail: 'Protect energy and daily routine' },
  { id: 'gain', title: 'Build Muscle (Bulk Plan)', detail: 'Calorie surplus (e.g. 3,000 kcal) & high protein' },
];

export const planOptions: Array<{
  id: PlanId;
  image: string;
  eyebrow: string;
  title: string;
  schedule: string;
  description: string;
  color: string;
  accent: string;
  badge?: string;
  category: 'diet' | 'bulk';
}> = [
  {
    id: 'low',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZZgBD_YrG3yp01Lbu9JLg8XbtVfSZuJjmqgt2r6yZh9D7YEJJHVenLiW0Mlg-iR6mPMTQdBXKf9pjTeHcVyNCiX6Wx3gyTaNsIqgnK3SjLEnn6gliKc5rbss4rmNL2fiGI91T5KD9Amm98ZN75GNUTp4vFTWTRJNSPezL_J4nnLOJIXwCiV1f1ay4EUm_2azReFv7_DmoQo57zYT57bvwWzfQE7Do5z9t4eCCgnvq9WnWQusBFv5_EQ',
    eyebrow: 'DIET PLAN · LOW INTENSITY',
    title: 'Gentle Balance Deficit',
    schedule: '10–15% deficit',
    description: 'Flexible meals and a gradual calorie reduction for sustainable fat loss.',
    color: '#DDF5E9',
    accent: '#286B57',
    category: 'diet',
  },
  {
    id: 'medium',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAba-aygcKSPDJOoKad28gMj4TULMd6JrGtX77j0tz929ECHtrWYRTi7IHnSCEw6vTw49Wob18IhACS0_xEcaHHeoy3pODi9wjR0rJPuAXrysqoPsirICiUvgwzCJHny_8thWmzac8LPA9RiMytBUpNzc6at3zBT3828qi0Db_lPdqH5uJA9O25gZ23qZd-oJXptVqOjVy1v1BmDsWdo5l9gzcEA4j4U8_nZHGLESycSWk6zrswwJwpNA',
    eyebrow: 'DIET PLAN · INTERMITTENT',
    title: '16:8 Fasting Rhythm',
    schedule: '16h fast · 8h eat',
    description: 'Structured 8-hour eating window with balanced macros and sharp focus.',
    color: '#DCEEF8',
    accent: '#3F7899',
    badge: 'POPULAR',
    category: 'diet',
  },
  {
    id: 'high',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZZgBD_YrG3yp01Lbu9JLg8XbtVfSZuJjmqgt2r6yZh9D7YEJJHVenLiW0Mlg-iR6mPMTQdBXKf9pjTeHcVyNCiX6Wx3gyTaNsIqgnK3SjLEnn6gliKc5rbss4rmNL2fiGI91T5KD9Amm98ZN75GNUTp4vFTWTRJNSPezL_J4nnLOJIXwCiV1f1ay4EUm_2azReFv7_DmoQo57zYT57bvwWzfQE7Do5z9t4eCCgnvq9WnWQusBFv5_EQ',
    eyebrow: 'DIET PLAN · ADVANCED',
    title: '18:6 Fat Loss Focus',
    schedule: '18h fast · 6h eat',
    description: 'Accelerated fat loss protocol with a compact 6-hour eating window.',
    color: '#FFE3D1',
    accent: '#9A5C37',
    category: 'diet',
  },
  {
    id: 'bulk',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAba-aygcKSPDJOoKad28gMj4TULMd6JrGtX77j0tz929ECHtrWYRTi7IHnSCEw6vTw49Wob18IhACS0_xEcaHHeoy3pODi9wjR0rJPuAXrysqoPsirICiUvgwzCJHny_8thWmzac8LPA9RiMytBUpNzc6at3zBT3828qi0Db_lPdqH5uJA9O25gZ23qZd-oJXptVqOjVy1v1BmDsWdo5l9gzcEA4j4U8_nZHGLESycSWk6zrswwJwpNA',
    eyebrow: 'BULK PLAN · MUSCLE HYPERTROPHY',
    title: 'Clean Bulk (3,000+ kcal)',
    schedule: 'Surplus + High Protein',
    description: 'High calorie & protein fuel for maximum muscle growth and strength.',
    color: '#FBF0D8',
    accent: '#8C6318',
    badge: 'BULK & MASS',
    category: 'bulk',
  },
];

export function calculateTargets(profile: Profile, planId: PlanId): NutritionTargets {
  const sexConstant = profile.gender === 'male' ? 5 : profile.gender === 'female' ? -161 : -78;
  const rawBmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexConstant;
  const factor = activityOptions.find((item) => item.id === profile.activity)?.factor ?? 1.375;
  const tdee = rawBmr * factor;

  let calories: number;
  if (profile.customDailyTarget && profile.customDailyTarget >= 1000) {
    calories = profile.customDailyTarget;
  } else if (planId === 'bulk' || profile.goal === 'gain') {
    // Bulk surplus: +500 to +700 kcal or ~3000 kcal baseline
    calories = Math.max(2800, Math.round((tdee * 1.22) / 50) * 50);
  } else {
    const goalMultiplier = profile.goal === 'lose' ? 0.85 : 1;
    const planMultiplier = planId === 'high' ? 0.92 : 1;
    calories = Math.max(1300, Math.round((tdee * goalMultiplier * planMultiplier) / 10) * 10);
  }

  const protein = Math.round(profile.weightKg * (planId === 'bulk' || profile.goal === 'gain' ? 2.0 : 1.6));
  const fats = Math.round((calories * 0.26) / 9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fats * 9) / 4));
  const dailyDelta = calories - tdee;

  return {
    bmr: Math.round(rawBmr),
    tdee: Math.round(tdee),
    calories,
    protein,
    carbs,
    fats,
    fiber: Math.round((calories / 1000) * 14),
    waterMl: Math.round(Math.max(2000, profile.weightKg * 35) / 100) * 100,
    monthlyCalories: calories * 30,
    projectedKgChange: Math.round(((dailyDelta * 30) / 7700) * 10) / 10,
  };
}

export function formatGoal(goal: Goal) {
  if (goal === 'lose') return 'Lose weight (Diet Cut)';
  if (goal === 'gain') return 'Build & Gain (Bulk)';
  return 'Maintain weight';
}

export const mealLabels: Record<MealType, { label: string; urdu: string; icon: string }> = {
  breakfast: { label: 'Breakfast', urdu: 'Breakfast', icon: 'sunny-outline' },
  lunch: { label: 'Lunch', urdu: 'Lunch', icon: 'restaurant-outline' },
  snack: { label: 'Snack', urdu: 'Snack', icon: 'cafe-outline' },
  dinner: { label: 'Dinner', urdu: 'Dinner', icon: 'moon-outline' },
};

const NUMBER_WORDS: Record<string, number> = {
  ek: 1,
  aik: 1,
  one: 1,
  do: 2,
  two: 2,
  teen: 3,
  three: 3,
  char: 4,
  chaar: 4,
  four: 4,
  paanch: 5,
  five: 5,
  che: 6,
  six: 6,
  aadha: 0.5,
  adha: 0.5,
  half: 0.5,
};

export interface ParsedMealResult {
  isManual: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  mealType: MealType;
  itemsSummary: string;
  explanation: string;
  matchedFoods: Array<{ food: Food; quantity: number; calories: number }>;
}

export function findFoodMatch(queryToken: string): Food | null {
  const clean = queryToken.toLowerCase().trim();
  if (!clean) return null;

  // Direct keyword match first
  for (const item of foods) {
    if (item.name.toLowerCase().includes(clean)) return item;
    if (item.keywords?.some((kw) => kw.toLowerCase().includes(clean) || clean.includes(kw.toLowerCase()))) {
      return item;
    }
  }

  // Token fuzzy score
  const queryWords = clean.split(/\s+/).filter((w) => w.length > 2);
  if (!queryWords.length) return null;

  let bestFood: Food | null = null;
  let highestScore = 0;

  for (const item of foods) {
    const haystack = `${item.name} ${item.keywords?.join(' ') ?? ''} ${item.brand}`.toLowerCase();
    const score = queryWords.filter((w) => haystack.includes(w)).length;
    if (score > highestScore) {
      highestScore = score;
      bestFood = item;
    }
  }

  return highestScore > 0 ? bestFood : null;
}

export function parseMealWithAiOrManual(
  rawInput: string,
  dailyTarget: number,
  consumedCaloriesSoFar: number,
  fallbackMealType: MealType = 'breakfast',
): ParsedMealResult {
  const normalized = rawInput.toLowerCase().trim();

  // 1. Detect Meal Type from keywords
  let detectedMealType: MealType = fallbackMealType;
  if (normalized.includes('nashta') || normalized.includes('breakfast') || normalized.includes('subah')) {
    detectedMealType = 'breakfast';
  } else if (normalized.includes('dopahar') || normalized.includes('lunch') || normalized.includes('din')) {
    detectedMealType = 'lunch';
  } else if (normalized.includes('shaam') || normalized.includes('snack') || normalized.includes('tea') || normalized.includes('chai time')) {
    detectedMealType = 'snack';
  } else if (normalized.includes('raat') || normalized.includes('dinner') || normalized.includes('night')) {
    detectedMealType = 'dinner';
  }

  // 2. Check for explicit manual calories in the input (e.g. "nashta 700", "700 cal", "dinner 850 kcal")
  // Exclude numbers like 250g or 100ml
  const directCalMatch = Array.from(rawInput.matchAll(/\b(\d{2,4})\b(?!\s*(?:g|gram|grams|ml|kg)\b)/gi))
    .map((m) => Number(m[1]))
    .find((val) => val >= 40 && val <= 5000);

  // If the user specified explicit calorie amount (e.g., 700 calories)
  if (directCalMatch && (normalized.includes('cal') || normalized.includes('kcal') || rawInput.trim().split(/\s+/).length <= 4)) {
    const manualCal = directCalMatch;
    const newTotal = consumedCaloriesSoFar + manualCal;
    const remaining = dailyTarget - newTotal;
    const mealName = mealLabels[detectedMealType].urdu;

    const remainingText =
      remaining >= 0
        ? `${remaining.toLocaleString()} kcal remaining.`
        : `${Math.abs(remaining).toLocaleString()} kcal above the target.`;

    return {
      isManual: true,
      calories: manualCal,
      protein: Math.round((manualCal * 0.25) / 4),
      carbs: Math.round((manualCal * 0.45) / 4),
      fats: Math.round((manualCal * 0.3) / 9),
      fiber: Math.max(1, Math.round(manualCal / 120)),
      mealType: detectedMealType,
      itemsSummary: rawInput.trim(),
      explanation: `🎯 ${manualCal} kcal logged for ${mealName}. ${newTotal.toLocaleString()} of the ${dailyTarget.toLocaleString()} kcal allowance has been consumed; ${remainingText}`,
      matchedFoods: [],
    };
  }

  // 3. AI Food Parsing & Calorie Estimation
  // Split segments by: 'aur', 'and', '+', ',', ';', 'with'
  const segments = normalized
    .replace(/\b(maine|khaya|khayi|aj|aaj|mein|me|ko|tha|thi|plate|bowl|cup|glass)\b/g, ' ')
    .split(/,|;|\band\b|\baur\b|\bplus\b|\+|\bwith\b/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const matchedItems: Array<{ food: Food; quantity: number; calories: number }> = [];

  for (const seg of segments) {
    // Extract quantity e.g. "2 anday" or "do parathay" or "1"
    let qty = 1;
    const digitMatch = seg.match(/\b(\d+(\.\d+)?)\b/);
    if (digitMatch) {
      qty = Math.min(10, Math.max(0.5, Number(digitMatch[1])));
    } else {
      for (const [word, num] of Object.entries(NUMBER_WORDS)) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(seg)) {
          qty = num;
          break;
        }
      }
    }

    const cleanSeg = seg.replace(/\b(\d+|ek|aik|one|do|two|teen|three|char|four|paanch|five|aadha|half)\b/gi, '').trim();
    const foodItem = findFoodMatch(cleanSeg || seg);
    if (foodItem) {
      matchedItems.push({
        food: foodItem,
        quantity: qty,
        calories: Math.round(foodItem.calories * qty),
      });
    }
  }

  if (matchedItems.length > 0) {
    const totalCal = matchedItems.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein = matchedItems.reduce((sum, item) => sum + Math.round(item.food.protein * item.quantity), 0);
    const totalCarbs = matchedItems.reduce((sum, item) => sum + Math.round(item.food.carbs * item.quantity), 0);
    const totalFats = matchedItems.reduce((sum, item) => sum + Math.round(item.food.fats * item.quantity), 0);
    const totalFiber = matchedItems.reduce((sum, item) => sum + Math.round(item.food.fiber * item.quantity), 0);

    const summaryParts = matchedItems.map((m) => `${m.quantity}× ${m.food.name} (${m.calories} kcal)`);
    const newTotal = consumedCaloriesSoFar + totalCal;
    const remaining = dailyTarget - newTotal;
    const mealName = mealLabels[detectedMealType].urdu;

    const remainingText =
      remaining >= 0
        ? `${remaining.toLocaleString()} kcal remaining.`
        : `${Math.abs(remaining).toLocaleString()} kcal above the target.`;

    return {
      isManual: false,
      calories: totalCal,
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
      fiber: totalFiber,
      mealType: detectedMealType,
      itemsSummary: summaryParts.join(' + '),
      explanation: `✨ AI estimate for ${mealName}: ${summaryParts.join(' + ')} = ${totalCal} kcal. From the ${dailyTarget.toLocaleString()} kcal allowance, ${remainingText}`,
      matchedFoods: matchedItems,
    };
  }

  // 4. Fallback Average Estimate
  const fallbackCal = 450;
  const newTotal = consumedCaloriesSoFar + fallbackCal;
  const remaining = dailyTarget - newTotal;
  const remainingText =
    remaining >= 0
      ? `${remaining.toLocaleString()} kcal remaining.`
      : `${Math.abs(remaining).toLocaleString()} kcal above the target.`;

  return {
    isManual: false,
    calories: fallbackCal,
    protein: 20,
    carbs: 45,
    fats: 15,
    fiber: 4,
    mealType: detectedMealType,
    itemsSummary: rawInput.trim(),
    explanation: `✨ Standard AI serving estimate (~${fallbackCal} kcal). From the ${dailyTarget.toLocaleString()} kcal allowance, ${remainingText}`,
    matchedFoods: [],
  };
}

export interface CameraAdjustment {
  label: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export function calculateCameraTextRefinement(baseFood: Food, textNote: string) {
  const lower = textNote.toLowerCase().trim();
  const adjustments: CameraAdjustment[] = [];

  const rules: Array<{
    terms: string[];
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    label: string;
  }> = [
    {
      terms: ['desi ghee', 'ghee', 'asli ghee', 'desighee'],
      name: 'Desi Ghee',
      calories: 200,
      protein: 0,
      carbs: 0,
      fats: 22,
      label: 'Desi Ghee (+200 kcal)',
    },
    {
      terms: ['extra oil', 'oily', 'zyada tail', 'oil', 'tail', 'extra tel'],
      name: 'Extra Oil',
      calories: 100,
      protein: 0,
      carbs: 0,
      fats: 11,
      label: 'Extra Oil (+100 kcal)',
    },
    {
      terms: ['butter', 'makhan', 'makkhan', 'maska'],
      name: 'Butter / Makhan',
      calories: 100,
      protein: 0.5,
      carbs: 0,
      fats: 11,
      label: 'Butter (+100 kcal)',
    },
    {
      terms: ['fried', 'deep fry', 'deep-fried', 'tala hua', 'tala', 'fry'],
      name: 'Fried Preparation',
      calories: 140,
      protein: 2,
      carbs: 8,
      fats: 12,
      label: 'Fried (+140 kcal)',
    },
    {
      terms: ['cream', 'creamy', 'malai'],
      name: 'Cream / Malai',
      calories: 90,
      protein: 1,
      carbs: 2,
      fats: 9,
      label: 'Cream (+90 kcal)',
    },
    {
      terms: ['cheese', 'paneer', 'cheddar', 'mozzarella'],
      name: 'Cheese',
      calories: 110,
      protein: 7,
      carbs: 1,
      fats: 9,
      label: 'Cheese (+110 kcal)',
    },
    {
      terms: ['sugar', 'cheeni', 'syrup', 'meetha', 'shakkar'],
      name: 'Added Sugar',
      calories: 70,
      protein: 0,
      carbs: 18,
      fats: 0,
      label: 'Added Sugar (+70 kcal)',
    },
    {
      terms: ['naan', 'roti', 'chapati', 'kulcha', 'khamiri'],
      name: 'Naan / Roti',
      calories: 130,
      protein: 4,
      carbs: 26,
      fats: 2,
      label: 'Naan/Roti (+130 kcal)',
    },
    {
      terms: ['paratha', 'parathay', 'parathe'],
      name: 'Paratha',
      calories: 280,
      protein: 6,
      carbs: 36,
      fats: 13,
      label: 'Paratha (+280 kcal)',
    },
  ];

  for (const rule of rules) {
    if (rule.terms.some((term) => lower.includes(term))) {
      adjustments.push({
        label: rule.label,
        name: rule.name,
        calories: rule.calories,
        protein: rule.protein,
        carbs: rule.carbs,
        fats: rule.fats,
      });
    }
  }

  // Check if user specified a manual numeric modifier like "+150 cal" or "extra 250"
  const directExtraMatch = lower.match(/(?:\+|\bextra\s+|\bplus\s+|\badd\s+)?(\d{2,4})\s*(?:cal|kcal|calories)?/);
  if (directExtraMatch && adjustments.length === 0) {
    const num = Number(directExtraMatch[1]);
    if (num >= 30 && num <= 1500) {
      adjustments.push({
        label: `Custom Addition (+${num} kcal)`,
        name: 'Custom Details',
        calories: num,
        protein: Math.round((num * 0.2) / 4),
        carbs: Math.round((num * 0.4) / 4),
        fats: Math.round((num * 0.4) / 9),
      });
    }
  }

  const extraCalories = adjustments.reduce((sum, a) => sum + a.calories, 0);
  const extraProtein = adjustments.reduce((sum, a) => sum + a.protein, 0);
  const extraCarbs = adjustments.reduce((sum, a) => sum + a.carbs, 0);
  const extraFats = adjustments.reduce((sum, a) => sum + a.fats, 0);

  const finalFood: Food = {
    ...baseFood,
    id: `camera-refined-${baseFood.id}-${extraCalories}-${Date.now()}`,
    name:
      adjustments.length > 0
        ? `${baseFood.name} (+ ${adjustments.map((a) => a.name).join(', ')})`
        : baseFood.name,
    calories: baseFood.calories + extraCalories,
    protein: baseFood.protein + extraProtein,
    carbs: baseFood.carbs + extraCarbs,
    fats: baseFood.fats + extraFats,
    brand: 'Calo AI Camera + Text Scan',
    accessTier: 'pro',
  };

  const explanation =
    extraCalories > 0
      ? `Base ${baseFood.name} (${baseFood.calories} kcal) + ${adjustments.map((a) => a.label).join(' + ')} = ${finalFood.calories} kcal.`
      : `Base camera scan: ${baseFood.calories} kcal (${baseFood.name}). Add preparation details to refine.`;

  return {
    food: finalFood,
    baseCalories: baseFood.calories,
    extraCalories,
    adjustments,
    explanation,
  };
}

