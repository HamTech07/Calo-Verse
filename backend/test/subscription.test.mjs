import test from 'node:test';
import assert from 'node:assert/strict';
import { promoMatches, buildPromoChange, activeTier } from '../subscriptions.mjs';

test('promo code 1519 matches securely', () => {
  assert.equal(promoMatches('1519', '1519'), true);
  assert.equal(promoMatches(' 1519 ', '1519'), true);
  assert.equal(promoMatches('wrong', '1519'), false);
  assert.equal(promoMatches('', '1519'), false);
  assert.equal(promoMatches(null, '1519'), false);
});

test('buildPromoChange activates 30-day 100% discount Pro plan', () => {
  const now = Date.now();
  const sub = buildPromoChange({
    uid: 'user_123',
    email: 'hamdanamir2005@gmail.com',
    tier: 'pro',
    previous: null,
    redemption: null,
    now,
  });

  assert.equal(sub.tier, 'pro');
  assert.equal(sub.status, 'active');
  assert.equal(sub.source, 'promo');
  assert.equal(sub.discountPercent, 100);
  assert.equal(sub.amountPaidCents, 0);
  assert.equal(sub.autoRenew, false);
  assert.equal(activeTier(sub, now), 'pro');
});

test('activeTier returns free for expired subscriptions', () => {
  const now = Date.now();
  const expiredSub = {
    tier: 'pro',
    status: 'active',
    startsAt: new Date(now - 40 * 86400000).toISOString(),
    endsAt: new Date(now - 10 * 86400000).toISOString(),
  };

  assert.equal(activeTier(expiredSub, now), 'free');
});
