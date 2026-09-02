import { Platform } from 'react-native';
import { firebaseAuth } from './authClient';
import type { MealType } from '../types';
import type { ParsedMealResult } from '../utils/nutrition';
import { detectMealType, explicitCalories } from '../utils/manualCalories';

export class NutritionAiError extends Error {
  constructor(message: string, public code: string) { super(message); }
}

export interface LiveEstimate {
  name: string; englishText: string; portion: string; explanation: string;
  calories: number; protein: number; carbs: number; fats: number; fiber: number;
  confidence: 'low' | 'medium' | 'high'; source: 'gemini';
}

export type FoodPhoto = { mimeType: 'image/jpeg'; data: string };

export async function askNutritionAi(text: string): Promise<{ estimate: LiveEstimate; aiChecksUsed: number }> {
  return requestEstimate(text);
}
export async function askPhotoNutrition(text: string, image: FoodPhoto, surface: 'daily' | 'scan'): Promise<{ estimate: LiveEstimate; scansUsed: number }> {
  return requestEstimate(text, image, surface);
}
export type VoiceAudio = { mimeType: 'audio/wav' | 'audio/m4a'; data: string };
export async function askVoiceNutrition(audio: VoiceAudio): Promise<{ estimate: LiveEstimate; aiChecksUsed: number }> {
  return requestEstimate('', undefined, undefined, audio);
}
async function requestEstimate(text: string, image?: FoodPhoto, surface?: 'daily' | 'scan', audio?: VoiceAudio) {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new NutritionAiError('Please sign in to use live AI.', 'SIGN_IN_REQUIRED');
  const baseUrl = process.env.EXPO_PUBLIC_AI_API_URL || (__DEV__ && Platform.OS === 'web' ? 'http://127.0.0.1:3001' : '');
  if (!baseUrl) throw new NutritionAiError('The AI backend address is not configured for this build.', 'AI_NOT_CONFIGURED');
  if ((!image && !audio && !text.trim()) || text.length > 2000) throw new NutritionAiError('Enter a food description of up to 2,000 characters.', 'INVALID_INPUT');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const token = await user.getIdToken();
    const response = await fetch(baseUrl.replace(/\/$/, '') + (image ? '/v1/nutrition/photo' : audio ? '/v1/nutrition/voice' : '/v1/nutrition/estimate'), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ text, ...(image ? { image, surface } : {}), ...(audio ? { audio } : {}) }), signal: controller.signal,
    });
    const result = await response.json();
    if (firebaseAuth?.currentUser?.uid !== user.uid) throw new NutritionAiError('Your account changed. Please try again.', 'ACCOUNT_CHANGED');
    if (!response.ok) throw new NutritionAiError(result.error || 'AI is unavailable. Please try again.', result.code || 'AI_UNAVAILABLE');
    if (!result.estimate || result.estimate.source !== 'gemini' || typeof result.estimate.name !== 'string' || !Number.isFinite(image ? result.scansUsed : result.aiChecksUsed)) throw new NutritionAiError('AI returned an incomplete estimate.', 'INVALID_AI_RESPONSE');
    for (const key of ['calories', 'protein', 'carbs', 'fats', 'fiber']) {
      if (!Number.isFinite(result.estimate[key]) || result.estimate[key] < 0) throw new NutritionAiError('AI returned invalid nutrients.', 'INVALID_AI_RESPONSE');
    }
    return result;
  } catch (error) {
    if (error instanceof NutritionAiError) throw error;
    throw new NutritionAiError('Cannot reach the AI backend. Keep the backend running and try again. You can still log calories manually.', 'CONNECTION_FAILED');
  } finally { clearTimeout(timeout); }
}

export async function resolveMealInput(text: string, fallbackMeal: MealType, onUsage: (used: number) => void): Promise<ParsedMealResult & { portion: string }> {
  const calories = explicitCalories(text);
  if (calories !== null) {
    const mealType = detectMealType(text, fallbackMeal);
    return {
      isManual: true, calories, protein: 0, carbs: 0, fats: 0, fiber: 0, mealType,
      itemsSummary: mealType[0].toUpperCase() + mealType.slice(1) + ' (' + calories + ' kcal)',
      portion: 'Manual calorie entry',
      explanation: 'User-entered calories. Protein, carbs, fats and fiber are not estimated from calories alone.',
      matchedFoods: [],
    };
  }
  const result = await askNutritionAi(text);
  onUsage(result.aiChecksUsed);
  const e = result.estimate;
  return {
    ...e, isManual: false, mealType: detectMealType(e.englishText, fallbackMeal),
    itemsSummary: e.name, matchedFoods: [],
    explanation: 'AI estimate · ' + e.portion + '. ' + e.explanation + ' Portion and recipe variations apply.',
  };
}
