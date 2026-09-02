import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { ApiError } from './gemini.mjs';

export const PROMO_CAMPAIGN = 'launch-complimentary-v1';
const DAY = 86400000;
export function activeTier(subscription, now = Date.now()) {
  return subscription?.status === 'active' && ['plus', 'pro'].includes(subscription.tier)
    && Number.isFinite(Date.parse(subscription.startsAt)) && Date.parse(subscription.startsAt) <= now
    && Date.parse(subscription.endsAt) > now ? subscription.tier : 'free';
}
export function promoMatches(input, configured) {
  if (typeof input !== 'string' || input.length > 64 || !configured) return false;
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(input.trim()), digest(configured));
}
export function buildPromoChange({ uid, email, tier, previous, redemption, now = Date.now() }) {
  if (!['plus', 'pro'].includes(tier)) throw new ApiError(400, 'INVALID_PLAN', 'Choose Plus or Pro.');
  if (redemption && Date.parse(redemption.endsAt) <= now) throw new ApiError(409, 'PROMO_USED', 'This account has already used its 30-day promotion.');
  if (previous && activeTier(previous, now) !== 'free' && previous.campaignId !== PROMO_CAMPAIGN) {
    throw new ApiError(409, 'PLAN_CONFLICT', 'An existing subscription cannot be replaced by this promotion.');
  }
  const startsAt = redemption?.startsAt || new Date(now).toISOString();
  const endsAt = redemption?.endsAt || new Date(now + 30 * DAY).toISOString();
  return {
    uid, email: email || '', tier, status: 'active', source: 'promo', campaignId: PROMO_CAMPAIGN,
    discountPercent: 100, amountPaidCents: 0, currency: 'USD', autoRenew: false,
    startsAt, endsAt, updatedAt: new Date(now).toISOString(),
  };
}

// Persist limits across restarts; do not store attempted codes.
export class PromoAttempts {
  constructor(sqlite) {
    this.db = sqlite;
    sqlite.exec('CREATE TABLE IF NOT EXISTS promo_attempts (key TEXT PRIMARY KEY, started INTEGER NOT NULL, count INTEGER NOT NULL)');
  }
  check(uid, now = Date.now()) {
    const keys = [[uid, 5, 15 * 60000], ['*global*', 100, DAY]];
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const [key, max, window] of keys) {
        const row = this.db.prepare('SELECT started, count FROM promo_attempts WHERE key = ?').get(key);
        if (row && now - row.started < window && row.count >= max) throw new ApiError(429, 'PROMO_RATE_LIMIT', 'Too many promotion attempts. Please try later.');
        if (!row || now - row.started >= window) this.db.prepare('INSERT OR REPLACE INTO promo_attempts VALUES (?, ?, 1)').run(key, now);
        else this.db.prepare('UPDATE promo_attempts SET count = count + 1 WHERE key = ?').run(key);
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}

export class SubscriptionService {
  constructor({ db, code = '1519', enabled = true, attempts }) {
    this.db = db; this.code = code; this.enabled = enabled; this.attempts = attempts;
  }
  requireDb() {
    if (!this.db) throw new ApiError(503, 'SUBSCRIPTIONS_NOT_CONFIGURED', 'Secure subscription setup is pending. Ask the app owner to configure Firebase Admin credentials.');
    return this.db;
  }
  async current(uid) {
    const doc = await this.requireDb().collection('subscriptions').doc(uid).get();
    return doc.exists ? doc.data() : null;
  }
  async report() {
    const db = this.requireDb();
    const subscriptions = db.collection('subscriptions');
    const active = subscriptions.where('status', '==', 'active').where('endsAt', '>', new Date().toISOString());
    const count = async query => (await query.count().get()).data().count;
    const [totalUsers, totalSubscriptions, activePlus, activePro, activePromo, activePaid, recent] = await Promise.all([
      count(db.collection('users')), count(subscriptions),
      count(active.where('tier', '==', 'plus')), count(active.where('tier', '==', 'pro')),
      count(active.where('source', '==', 'promo')),
      count(active.where('source', 'in', ['app_store', 'google_play']).where('paymentVerified', '==', true)),
      subscriptions.orderBy('updatedAt', 'desc').limit(50).get(),
    ]);
    return { totalUsers, totalSubscriptions, activePlus, activePro, activePromo, activePaid,
      generatedAt: new Date().toISOString(), records: recent.docs.map(doc => publicSubscription(doc.data())) };
  }
  async redeem(account, body) {
    const db = this.requireDb();
    this.attempts.check(account.uid);
    if (!this.enabled || !promoMatches(body?.code, this.code)) throw new ApiError(400, 'INVALID_PROMO', 'This promo code is invalid or unavailable.');
    const userRef = db.collection('users').doc(account.uid);
    const subscriptionRef = db.collection('subscriptions').doc(account.uid);
    const redemptionRef = db.collection('promoRedemptions').doc(PROMO_CAMPAIGN + '_' + account.uid);
    const eventRef = db.collection('subscriptionEvents').doc(randomUUID());
    return db.runTransaction(async tx => {
      const [user, old, redeemed] = await tx.getAll(userRef, subscriptionRef, redemptionRef);
      if (!user.exists) throw new ApiError(409, 'PROFILE_UNAVAILABLE', 'Create your account profile before redeeming.');
      const next = buildPromoChange({ uid: account.uid, email: account.email, tier: body.tier,
        previous: old.data(), redemption: redeemed.data() });
      // Retries and repeated clicks never extend the original expiry or create duplicate events.
      if (old.exists && old.data().tier === next.tier && old.data().campaignId === PROMO_CAMPAIGN
          && old.data().status === 'active' && old.data().endsAt === next.endsAt) return old.data();
      if (redeemed.exists && old.exists && old.data().status === 'revoked') throw new ApiError(409, 'PROMO_REVOKED', 'This promotion has been revoked.');
      tx.set(subscriptionRef, next);
      if (!redeemed.exists) tx.create(redemptionRef, { uid: account.uid, campaignId: PROMO_CAMPAIGN, startsAt: next.startsAt, endsAt: next.endsAt });
      tx.create(eventRef, { ...next, event: redeemed.exists ? 'promo_plan_changed' : 'promo_redeemed' });
      // Cache only; backend authorization always checks the canonical subscription and expiry.
      tx.update(userRef, { tier: next.tier });
      return next;
    });
  }
}

export function publicSubscription(value) {
  if (!value) return null;
  const fields = ['uid', 'email', 'tier', 'status', 'source', 'discountPercent', 'amountPaidCents', 'currency', 'autoRenew', 'startsAt', 'endsAt', 'updatedAt'];
  return Object.fromEntries(fields.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
}
