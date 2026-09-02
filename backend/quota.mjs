import { DatabaseSync } from 'node:sqlite';
import { ApiError } from './gemini.mjs';

// Local single-instance ledger. Keep this file across restarts; do not deploy it to ephemeral hosting.
export class QuotaLedger {
  constructor(filename) {
    this.db = new DatabaseSync(filename);
    this.db.exec('CREATE TABLE IF NOT EXISTS usage (uid TEXT PRIMARY KEY, used INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS attempts (day TEXT PRIMARY KEY, count INTEGER NOT NULL);');
    this.db.exec('CREATE TABLE IF NOT EXISTS scan_usage (uid TEXT PRIMARY KEY, used INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS scanned_images (uid TEXT NOT NULL, hash TEXT NOT NULL, PRIMARY KEY(uid, hash));');
    this.busy = new Set();
    this.db.exec('CREATE TABLE IF NOT EXISTS scan_estimates (uid TEXT NOT NULL, hash TEXT NOT NULL, estimate TEXT NOT NULL, PRIMARY KEY(uid, hash));');
    this.lastAttempt = new Map();
  }
  begin(uid, tier, cloudUsed = 0, now = Date.now(), photo = null) {
    if (this.busy.has(uid)) throw new ApiError(429, 'IN_PROGRESS', 'An AI estimate is already running. Please wait.');
    if (now - (this.lastAttempt.get(uid) ?? 0) < 4000) throw new ApiError(429, 'RATE_LIMIT', 'Please wait a few seconds before asking again.');
    const table = photo ? 'scan_usage' : 'usage';
    const used = Math.max(this.db.prepare('SELECT used FROM ' + table + ' WHERE uid = ?').get(uid)?.used ?? 0, Number.isFinite(cloudUsed) ? Math.max(0, Math.floor(cloudUsed)) : 0);
    const knownPhoto = photo && Boolean(this.db.prepare('SELECT 1 FROM scanned_images WHERE uid = ? AND hash = ?').get(uid, photo.hash));
    if (photo) {
      if (photo.surface === 'daily' && tier !== 'pro') throw new ApiError(402, 'PRO_REQUIRED', 'Camera meal logging requires Pro. Trial scans are available on the Scan tab.');
      const started = Date.parse(photo.trialStartedAt);
      if (tier !== 'pro' && (!Number.isFinite(started) || started > now || now - started >= 3 * 86400000)) throw new ApiError(402, 'SCAN_TRIAL_EXPIRED', 'Your 3-day photo trial has ended. Upgrade to Pro for camera scans.');
      if (tier !== 'pro' && used >= 3 && !knownPhoto) throw new ApiError(402, 'SCAN_LIMIT', 'Your 3 photo scans are used. You can still refine the same photo during your trial.');
    }
    if (!photo && tier === 'free' && used >= 3) throw new ApiError(402, 'FREE_LIMIT', 'Your 3 free AI estimates are used. Manual calorie logging and food search remain available.');
    const day = new Date(now).toISOString().slice(0, 10);
    const attempts = this.db.prepare('SELECT count FROM attempts WHERE day = ?').get(day)?.count ?? 0;
    if (attempts >= 100) throw new ApiError(429, 'DAILY_SAFETY_LIMIT', 'The local AI testing limit has been reached for today.');
    this.db.prepare('INSERT INTO attempts VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1').run(day);
    this.db.prepare('INSERT INTO ' + table + ' VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET used = excluded.used').run(uid, used);
    this.lastAttempt.set(uid, now);
    this.busy.add(uid);
    let finished = false;
    let finalUsed = used;
    return {
      finish: (success, estimate) => {
        if (finished) return finalUsed;
        finished = true;
        this.busy.delete(uid);
        const next = used + (success && (photo ? tier !== 'pro' && !knownPhoto : tier === 'free') ? 1 : 0);
        this.db.exec('BEGIN IMMEDIATE');
        try {
          this.db.prepare('UPDATE ' + table + ' SET used = ? WHERE uid = ?').run(next, uid);
          if (success && photo) this.db.prepare('INSERT OR IGNORE INTO scanned_images VALUES (?, ?)').run(uid, photo.hash);
          if (success && photo && estimate) this.db.prepare('INSERT INTO scan_estimates VALUES (?, ?, ?) ON CONFLICT(uid, hash) DO UPDATE SET estimate = excluded.estimate').run(uid, photo.hash, JSON.stringify(estimate));
          this.db.exec('COMMIT');
        } catch (error) { this.db.exec('ROLLBACK'); throw error; }
        finalUsed = next;
        return next;
      },
    };
  }
  previousPhotoEstimate(uid, hash) {
    const row = this.db.prepare('SELECT estimate FROM scan_estimates WHERE uid = ? AND hash = ?').get(uid, hash);
    if (!row) return undefined;
    try { return JSON.parse(row.estimate); } catch { return undefined; }
  }
  close() { this.db.close(); }
}
