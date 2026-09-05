import { Platform } from 'react-native';
import { firebaseAuth } from './authClient';
import type { Tier } from '../types';

export async function redeemPromo(code: string, tier: 'plus' | 'pro'): Promise<Tier> {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new Error('Please sign in before applying a promo code.');
  const baseUrl = process.env.EXPO_PUBLIC_AI_API_URL || (__DEV__ && Platform.OS === 'web' ? 'http://127.0.0.1:3001' : '');
  if (!baseUrl) throw new Error('The secure subscription server is not configured in this build.');
  const token = await user.getIdToken();
  const response = await fetch(baseUrl.replace(/\/$/, '') + '/v1/subscription/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ code: code.trim(), tier }),
  });
  const result = await response.json();
  if (!response.ok || !['plus', 'pro'].includes(result.tier)) {
    throw new Error(result.error || 'This promo code could not be redeemed.');
  }
  return result.tier as Tier;
}
