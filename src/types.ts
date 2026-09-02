export type Gender = 'male' | 'female' | 'other';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Tier = 'free' | 'plus' | 'pro';
export type PlanId = 'low' | 'medium' | 'high' | 'bulk';
export type TabId = 'home' | 'foods' | 'scan' | 'plans' | 'profile';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type ActivityId =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'athlete';

export interface Profile {
  name: string;
  email: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityId;
  goal: Goal;
  customDailyTarget?: number;
}

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  waterMl: number;
  monthlyCalories: number;
  projectedKgChange: number;
}

export interface Food {
  id: string;
  name: string;
  region: string;
  brand: string;
  isBranded: boolean;
  portionSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  processingLevel: 'Minimally Processed' | 'Processed' | 'Ultra-Processed' | 'Not assessed';
  accessTier: Tier;
  image: string;
  keywords?: string[];
}

export interface FoodLog {
  id: string;
  food: Food;
  loggedAt: string;
  mealType?: MealType;
  note?: string;
}

export interface AppSession {
  stage: 'auth' | 'onboarding' | 'summary' | 'main';
  profile: Profile | null;
  tier: Tier;
  activePlan: PlanId;
  customDailyTarget?: number;
  aiChecksUsed: number;
  scansUsed: number;
  trialStartedAt: string;
  planStartedAt?: string;
  waterMl: number;
  logs: FoodLog[];
}
