import type { MealType } from '../types';

export function detectMealType(text: string, fallback: MealType): MealType {
  if (/\b(breakfast|nashta|subah)\b/i.test(text)) return 'breakfast';
  if (/\b(lunch|dopahar)\b/i.test(text)) return 'lunch';
  if (/\b(dinner|raat)\b/i.test(text)) return 'dinner';
  if (/\b(snack|shaam)\b/i.test(text)) return 'snack';
  return fallback;
}

// Food quantities (250 g, 100 ml, 12 eggs) are not calorie declarations.
export function explicitCalories(text: string): number | null {
  const input = text.trim();
  const match = input.match(/(?:^|\s)(\d{1,5}(?:\.\d+)?)\s*(?:kcal|calories|cal)\b/i)
    ?? input.match(/^(?:(?:breakfast|lunch|dinner|snack)\s+)?(\d{1,5}(?:\.\d+)?)$/i);
  if (!match) return null;
  const calories = Number(match[1]);
  return Number.isFinite(calories) && calories > 0 && calories <= 10000 ? Math.round(calories) : null;
}
