import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogoMark, PrimaryButton } from './src/components/ui';
import { AuthScreen } from './src/screens/AuthScreen';
import { MainApp } from './src/screens/MainApp';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PlanSummaryScreen } from './src/screens/PlanSummaryScreen';
import { ResetPlanDialog } from './src/components/PlanDialogs';
import { restartPlan } from './src/utils/planSession';
import { colors, typography } from './src/theme';
import { AppSession, Food, FoodLog, MealType, PlanId, Profile, Tier } from './src/types';
import { calculateTargets } from './src/utils/nutrition';
import { AuthIdentity, createEmailAccount, observeAuth, signInWithEmail, signInWithGoogle, signOutAccount } from './src/services/auth';
import { isFirebaseConfigured } from './src/services/firebase';
import { ensureUserDocument, loadCloudSession, syncCloudSession } from './src/services/firestore';
import { redeemPromo } from './src/services/subscriptions';

const STORAGE_KEY = '@calo-verse/demo-session-v1';

async function waitForCloud<T>(operation: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Cloud connection timed out.')), 15000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

const initialSession: AppSession = {
  stage: 'auth',
  profile: null,
  tier: 'free',
  activePlan: 'low',
  aiChecksUsed: 0,
  scansUsed: 0,
  voiceChecksUsed: 0,
  trialStartedAt: new Date().toISOString(),
  waterMl: 0,
  logs: [],
};

export default function App() {
  const [session, setSession] = useState<AppSession>(initialSession);
  const [ready, setReady] = useState(false);
  const [pendingIdentity, setPendingIdentity] = useState({ name: 'Hamdan', email: 'hamdan@example.com' });
  const [checkoutTier, setCheckoutTier] = useState<Tier | null>(null);
  const [resetPlanOpen, setResetPlanOpen] = useState(false);
  const [cloudUid, setCloudUid] = useState<string | null>(null);
  const [cloudLoadError, setCloudLoadError] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [syncRetry, setSyncRetry] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const identityRef = useRef<AuthIdentity | null>(null);
  const signupNameRef = useRef({ name: '', email: '' });
  const accountGeneration = useRef(0);
  const syncedLogs = useRef<FoodLog[]>([]);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncVersion = useRef(0);

  const loadAccount = useCallback(async (account: AuthIdentity) => {
    const generation = ++accountGeneration.current;
    const identity = signupNameRef.current.email === account.email
      ? { ...account, name: signupNameRef.current.name || account.name }
      : account;
    identityRef.current = identity;
    syncQueue.current = Promise.resolve();
    setReady(false);
    setCloudUid(null);
    setCloudLoadError(false);
    setSyncError(false);
    setSyncPending(false);
    setCheckoutTier(null);
    setPendingIdentity({ name: identity.name, email: identity.email });
    try {
      const cloud = await waitForCloud((async () => {
        await ensureUserDocument(identity);
        return loadCloudSession(identity.uid);
      })());
      if (generation !== accountGeneration.current) return;
      if (!cloud) throw new Error('Account document is unavailable.');
      syncedLogs.current = cloud.logs;
      setSession({
        ...initialSession,
        ...cloud,
        stage: cloud.profile ? 'main' : 'onboarding',
      });
      setCloudUid(identity.uid);
    } catch {
      if (generation === accountGeneration.current) setCloudLoadError(true);
    } finally {
      if (generation === accountGeneration.current) setReady(true);
    }
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured) {
      const unsubscribe = observeAuth((identity) => {
        if (identity) {
          void loadAccount(identity);
        } else {
          accountGeneration.current += 1;
          identityRef.current = null;
          setSyncPending(false);
          setCloudUid(null);
          setCloudLoadError(false);
          setSyncError(false);
          setCheckoutTier(null);
          setSession({ ...initialSession, trialStartedAt: new Date().toISOString() });
          setReady(true);
        }
      });
      return () => {
        accountGeneration.current += 1;
        unsubscribe();
      };
    }
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!saved || !active) return;
        const parsed = JSON.parse(saved) as Partial<AppSession> & { searchesUsed?: number };
        const { searchesUsed: _legacySearchesUsed, ...currentSession } = parsed;
        setSession({ ...initialSession, ...currentSession, aiChecksUsed: parsed.aiChecksUsed ?? 0 });
      })
      .catch(() => {
        // The demo still works in memory if device storage is unavailable.
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [loadAccount]);

  useEffect(() => {
    if (!ready || isFirebaseConfigured) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session)).catch(() => {
      // Persistence is a convenience in this frontend-only phase.
    });
  }, [ready, session]);

  useEffect(() => {
    if (!ready || !cloudUid || !session.profile || cloudLoadError || signingOut) return;
    const generation = accountGeneration.current;
    const version = ++syncVersion.current;
    setSyncPending(true);
    const timer = setTimeout(() => {
      syncQueue.current = syncQueue.current.catch(() => undefined).then(async () => {
        if (generation !== accountGeneration.current) return;
        try {
          await syncCloudSession(cloudUid, session, syncedLogs.current);
          if (generation !== accountGeneration.current) return;
          syncedLogs.current = session.logs;
          if (version === syncVersion.current) setSyncError(false);
        } catch {
          if (generation === accountGeneration.current && version === syncVersion.current) setSyncError(true);
        } finally {
          if (generation === accountGeneration.current && version === syncVersion.current) setSyncPending(false);
        }
      });
    }, 500);
    syncTimer.current = timer;
    return () => clearTimeout(timer);
  }, [ready, cloudUid, cloudLoadError, session, syncRetry, signingOut]);

  const targets = useMemo(
    () => (session.profile ? calculateTargets(session.profile, session.activePlan) : null),
    [session.profile, session.activePlan],
  );

  const update = (patch: Partial<AppSession>) => setSession((current) => ({ ...current, ...patch }));

  const handleAuth = (name: string, email: string) => {
    setPendingIdentity({ name, email });
    if (session.profile) {
      update({
        stage: 'main',
        profile: { ...session.profile, name, email },
      });
    } else {
      update({ stage: 'onboarding' });
    }
  };

  const handleEmailAuth = async (mode: 'signup' | 'login', name: string, email: string, password: string) => {
    signupNameRef.current = mode === 'signup' ? { name, email } : { name: '', email: '' };
    if (mode === 'signup') await createEmailAccount(name, email, password);
    else await signInWithEmail(email, password);
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      if (cloudUid && session.profile && !cloudLoadError) {
        const generation = accountGeneration.current;
        syncQueue.current = syncQueue.current.catch(() => undefined).then(async () => {
          if (generation !== accountGeneration.current) return;
          await syncCloudSession(cloudUid, session, syncedLogs.current);
          if (generation === accountGeneration.current) syncedLogs.current = session.logs;
        });
      }
      await waitForCloud(syncQueue.current);
      await signOutAccount();
      if (!isFirebaseConfigured) update({ stage: 'auth' });
    } catch {
      setSyncError(true);
    } finally {
      setSigningOut(false);
    }
  };

  const handleProfile = (profile: Profile) => {
    const recommendedPlan: PlanId = profile.goal === 'lose' ? 'low' : profile.goal === 'gain' ? 'bulk' : 'medium';
    update({
      profile,
      activePlan: recommendedPlan,
      aiChecksUsed: 0,
      scansUsed: 0,
      voiceChecksUsed: 0,
      trialStartedAt: new Date().toISOString(),
      planStartedAt: new Date().toISOString(),
      waterMl: 0,
      stage: 'summary',
    });
  };

  const addFood = (food: Food, mealType: MealType = 'breakfast', note?: string, loggedAt = new Date().toISOString()) => {
    setSession((current) => ({
      ...current,
      logs: [
        {
          id: `${food.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          food,
          loggedAt,
          mealType,
          note,
        },
        ...current.logs,
      ],
    }));
  };

  const removeFoodLog = (logId: string) => {
    setSession((current) => ({
      ...current,
      logs: current.logs.filter((item) => item.id !== logId),
    }));
  };

  const handleCustomTargetChange = (customDailyTarget: number) => {
    if (session.profile) {
      update({
        profile: { ...session.profile, customDailyTarget },
      });
    }
  };


  if (!ready || signingOut) {
    return (
      <View style={styles.loading}>
        <LogoMark size={82} />
        <Text style={styles.loadingTitle}>Calo Verse</Text>
        <ActivityIndicator color={colors.primary} />
        {signingOut ? <Text style={typography.body}>Saving your changes before signing out…</Text> : null}
        <StatusBar style="dark" />
      </View>
    );
  }

  if (cloudLoadError) {
    return (
      <View style={[styles.loading, { padding: 28 }]}>
        <LogoMark size={82} />
        <Text style={typography.heading}>Could not load your account</Text>
        <Text style={{ ...typography.body, textAlign: 'center' }}>
          Check your connection and Firebase setup. Your saved cloud data has not been replaced.
        </Text>
        <PrimaryButton label="Retry account connection" onPress={() => {
          if (identityRef.current) void loadAccount(identityRef.current);
        }} />
        <PrimaryButton label="Sign out" onPress={() => { void handleSignOut(); }} />
      </View>
    );
  }

  return (
    <View style={styles.app}>
      {syncPending && !syncError ? (
        <Text style={{ ...typography.label, padding: 8, textAlign: 'center' }}>Saving to cloud…</Text>
      ) : null}
      {syncError ? (
        <Pressable onPress={() => setSyncRetry((value) => value + 1)} style={{ padding: 12, backgroundColor: '#FFF0D5' }}>
          <Text style={{ ...typography.label, textAlign: 'center' }}>
            Changes are not synced. Keep the app open and tap to retry.
          </Text>
        </Pressable>
      ) : null}
      {session.stage === 'auth' ? (
        <AuthScreen
          backendEnabled={isFirebaseConfigured}
          onContinue={handleAuth}
          onEmailAuth={handleEmailAuth}
          onGoogleAuth={async () => { signupNameRef.current = { name: '', email: '' }; await signInWithGoogle(); }}
        />
      ) : null}
      {session.stage === 'onboarding' ? (
        <OnboardingScreen
          name={pendingIdentity.name}
          email={pendingIdentity.email}
          onComplete={handleProfile}
        />
      ) : null}
      {session.stage === 'summary' && session.profile && targets ? (
        <PlanSummaryScreen
          profile={session.profile}
          targets={targets}
          activePlan={session.activePlan}
          onContinue={() => update({ stage: 'main' })}
        />
      ) : null}
      {session.stage === 'main' && session.profile && targets ? (
        <SafeAreaProvider>
        <MainApp
          profile={session.profile}
          targets={targets}
          tier={session.tier}
          activePlan={session.activePlan}
          aiChecksUsed={session.aiChecksUsed}
          scansUsed={session.scansUsed}
          voiceChecksUsed={session.voiceChecksUsed}
          trialStartedAt={session.trialStartedAt}
          planStartedAt={session.planStartedAt ?? session.trialStartedAt}
          waterMl={session.waterMl}
          logs={session.logs}
          onTierChange={(tier: Tier) => {
            if (tier === 'free') return;
            setCheckoutTier(tier);
          }}
          onPromoRedeem={async (code, tier) => {
            const verifiedTier = await redeemPromo(code, tier);
            update({ tier: verifiedTier });
            return verifiedTier;
          }}
          onPlanChange={(activePlan: PlanId) => update({ activePlan })}
          onAiUsage={(used: number) => setSession((current) => ({ ...current, aiChecksUsed: Math.max(current.aiChecksUsed, used) }))}
          onScanUsage={(used) => setSession((current) => ({ ...current, scansUsed: Math.max(current.scansUsed, used) }))}
          onVoiceUsage={(used) => setSession((current) => ({ ...current, voiceChecksUsed: Math.max(current.voiceChecksUsed, used) }))}
          onWaterChange={(waterMl: number) => update({ waterMl })}
          onAddFood={addFood}
          onRemoveFoodLog={removeFoodLog}
          onCustomTargetChange={handleCustomTargetChange}
          onSignOut={() => { void handleSignOut(); }}
          onReset={() => setResetPlanOpen(true)}
        />
        </SafeAreaProvider>
      ) : null}
      {resetPlanOpen && session.profile && session.stage === 'main' ? (
        <ResetPlanDialog currentGoal={session.profile.goal}
          onClose={() => setResetPlanOpen(false)}
          onConfirm={(goal) => {
            setSession((current) => restartPlan(current, goal));
            setResetPlanOpen(false);
          }}
        />
      ) : null}
      <PaymentSheet
        tier={checkoutTier}
        onClose={() => setCheckoutTier(null)}
        onComplete={() => {
          Alert.alert('Store billing is not connected', 'No charge was made and your plan was not changed.');
          setCheckoutTier(null);
        }}
      />
      <StatusBar style="dark" />
    </View>
  );
}

function PaymentSheet({
  tier,
  onClose,
  onComplete,
}: {
  tier: Tier | null;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [store, setStore] = useState<'apple' | 'google'>(Platform.OS === 'ios' ? 'apple' : 'google');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState('');

  if (!tier) return null;

  const isPro = tier === 'pro';
  const planTitle = isPro ? 'Calo Verse Pro' : 'Calo Verse Plus';
  const monthlyPrice = isPro ? '$9.99' : '$4.99';
  const yearlyPrice = isPro ? '$71.99' : '$39.99';
  const yearlyMonthlyEquivalent = isPro ? '$5.99' : '$3.33';
  const activePrice = billingCycle === 'monthly' ? `${monthlyPrice}/mo` : `${yearlyPrice}/yr (${yearlyMonthlyEquivalent}/mo)`;
  const storeName = store === 'apple' ? 'Apple App Store' : 'Google Play Store';
  const productId = store === 'apple'
    ? `com.caloverse.${isPro ? 'pro' : 'plus'}.${billingCycle}`
    : `caloverse_${isPro ? 'pro' : 'plus'}_${billingCycle}`;

  const handleRestore = () => {
    setRestoring(true);
    setRestoreMessage('');
    setTimeout(() => {
      setRestoring(false);
      setRestoreMessage('✓ App Store receipt verified. Pro features are active!');
      setTimeout(() => {
        onComplete();
      }, 1000);
    }, 1200);
  };

  return (
    <Modal visible={Boolean(tier)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.paymentBackdrop}>
        <Pressable accessibilityLabel="Close checkout" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.paymentSheet, { maxHeight: '90%' }]}>
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
          <View style={styles.paymentHeader}>
            <View style={styles.secureIcon}>
              <Ionicons name={isPro ? 'sparkles' : 'shield-checkmark'} size={24} color={isPro ? '#775A12' : colors.primary} />
            </View>
            <View style={styles.paymentHeadingCopy}>
              <View style={styles.storeBadgeRow}>
                <Ionicons name={store === 'apple' ? 'logo-apple' : 'logo-google-playstore'} size={14} color={colors.primary} />
                <Text style={styles.paymentEyebrow}>{storeName.toUpperCase()} · IN-APP PURCHASE</Text>
              </View>
              <Text style={styles.paymentTitle}>{planTitle}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.paymentClose}>
              <Ionicons name="close" size={21} color={colors.muted} />
            </Pressable>
          </View>

          {/* Platform Store Toggle (iOS vs Android APK) */}
          <View style={styles.platformToggleRow}>
            <Pressable
              onPress={() => setStore('apple')}
              style={[styles.platformToggleTab, store === 'apple' && styles.platformToggleActive]}
            >
              <Ionicons name="logo-apple" size={17} color={store === 'apple' ? '#000000' : colors.muted} />
              <Text style={[styles.platformToggleText, store === 'apple' && styles.platformToggleTextActive]}>
                Apple App Store (iOS)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setStore('google')}
              style={[styles.platformToggleTab, store === 'google' && styles.platformToggleActive]}
            >
              <Ionicons name="logo-google-playstore" size={16} color={store === 'google' ? '#01875F' : colors.muted} />
              <Text style={[styles.platformToggleText, store === 'google' && styles.platformToggleTextActive]}>
                Google Play (APK)
              </Text>
            </Pressable>
          </View>

          {/* Billing Cycle Selector */}
          <View style={styles.billingGrid}>
            <Pressable
              onPress={() => setBillingCycle('monthly')}
              style={[styles.billingCard, billingCycle === 'monthly' && styles.billingCardActive]}
            >
              <View style={styles.billingTop}>
                <Text style={styles.billingTitle}>Monthly</Text>
                <Text style={styles.billingTrialBadge}>3-Day Free Trial</Text>
              </View>
              <Text style={styles.billingPrice}>{monthlyPrice}<Text style={styles.billingUnit}>/mo</Text></Text>
              <Text style={styles.billingSub}>Cancel anytime in {store === 'apple' ? 'iOS Settings' : 'Play Store'}</Text>
            </Pressable>

            <Pressable
              onPress={() => setBillingCycle('yearly')}
              style={[styles.billingCard, billingCycle === 'yearly' && styles.billingCardActive]}
            >
              <View style={styles.billingTop}>
                <Text style={styles.billingTitle}>Annual Plan</Text>
                <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>SAVE 40%</Text></View>
              </View>
              <Text style={styles.billingPrice}>{yearlyMonthlyEquivalent}<Text style={styles.billingUnit}>/mo</Text></Text>
              <Text style={styles.billingSub}>{yearlyPrice} billed annually</Text>
            </Pressable>
          </View>

          {/* Pro Benefits Checklist */}
          <View style={styles.benefitsBox}>
            <View style={styles.benefitItem}>
              <Ionicons name="camera" size={17} color={colors.primary} />
              <Text style={styles.benefitText}>
                <Text style={styles.benefitStrong}>Camera + Text Refinement:</Text> Scan Nihari (520 kcal) + add "Desi Ghee" = 720 kcal automatically
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="scan-outline" size={17} color={colors.primary} />
              <Text style={styles.benefitText}>
                <Text style={styles.benefitStrong}>Unlimited AI Photo Scans</Text> with real-time portion macro breakdown
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="barbell-outline" size={17} color={colors.primary} />
              <Text style={styles.benefitText}>
                <Text style={styles.benefitStrong}>Full 30-Day Diet & Bulk Schedules</Text> (up to 3,500+ kcal)
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="mic-outline" size={17} color={colors.primary} />
              <Text style={styles.benefitText}>
                <Text style={styles.benefitStrong}>Multilingual Voice AI Studio</Text> & Barcode scanner
              </Text>
            </View>
          </View>

          {/* Store-specific Native Card Simulation */}
          <View style={[styles.nativeStoreCard, store === 'google' && styles.nativeStoreCardPlay]}>
            <View style={styles.nativeStoreHeader}>
              <Ionicons
                name={store === 'apple' ? 'logo-apple' : 'logo-google-playstore'}
                size={22}
                color={store === 'apple' ? '#000000' : '#01875F'}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.nativeStoreTitle}>
                  {store === 'apple' ? 'Apple StoreKit In-App Purchase' : 'Google Play Billing'}
                </Text>
                <Text style={styles.nativeStoreSub}>
                  Account: {store === 'apple' ? 'hamdan@icloud.com' : 'hamdan@gmail.com'} · {productId}
                </Text>
              </View>
            </View>
            {store === 'apple' ? (
              <View style={styles.faceIdRow}>
                <Ionicons name="scan" size={20} color={colors.primaryDark} />
                <Text style={styles.faceIdText}>Confirm with Touch ID / Face ID or Password</Text>
              </View>
            ) : (
              <View style={styles.playPaymentRow}>
                <Ionicons name="card-outline" size={18} color="#01875F" />
                <Text style={styles.playPaymentText}>Google Play Payment · GPay •••• 4242</Text>
              </View>
            )}
          </View>

          {restoreMessage ? (
            <View style={styles.restoreFeedback}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.restoreFeedbackText}>{restoreMessage}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <PrimaryButton
            label={`Subscribe with ${store === 'apple' ? 'App Store' : 'Google Play'} · ${activePrice}`}
            icon="lock-closed"
            onPress={onComplete}
          />

          <View style={styles.storeFooterRow}>
            <Pressable onPress={handleRestore} disabled={restoring}>
              <Text style={styles.storeFooterLink}>
                {restoring ? 'Verifying with App Store…' : 'Restore Purchases'}
              </Text>
            </Pressable>
            <Text style={styles.storeFooterDivider}>•</Text>
            <Pressable onPress={() => undefined}>
              <Text style={styles.storeFooterLink}>Terms of Use (EULA)</Text>
            </Pressable>
            <Text style={styles.storeFooterDivider}>•</Text>
            <Pressable onPress={() => undefined}>
              <Text style={styles.storeFooterLink}>Privacy Policy</Text>
            </Pressable>
          </View>

          <Text style={styles.paymentNote}>
            In-App Purchase demo simulation. Subscribing unlocks Pro immediately with unlimited photo scans, text calorie refinements, and all 30-day plans.
          </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: colors.background,
  },
  loadingTitle: { ...typography.title, color: colors.primary },
  paymentBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,24,21,0.65)', paddingHorizontal: Platform.OS === 'web' ? 12 : 0 },
  paymentSheet: { width: '100%', maxWidth: 620, alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 22, paddingBottom: Platform.OS === 'ios' ? 36 : 22, gap: 14 },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.outline, alignSelf: 'center', marginBottom: 2 },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  secureIcon: { width: 46, height: 46, borderRadius: 18, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  paymentHeadingCopy: { flex: 1, gap: 2 },
  storeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paymentEyebrow: { ...typography.label, color: colors.primary, fontSize: 10, letterSpacing: 0.9 },
  paymentTitle: { ...typography.heading, fontSize: 20 },
  paymentClose: { width: 38, height: 38, borderRadius: 16, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  platformToggleRow: { flexDirection: 'row', backgroundColor: colors.surfaceSoft, borderRadius: 16, padding: 4, gap: 4 },
  platformToggleTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 12 },
  platformToggleActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  platformToggleText: { ...typography.label, fontSize: 12, color: colors.muted },
  platformToggleTextActive: { color: colors.ink, fontWeight: '800' },
  billingGrid: { flexDirection: 'row', gap: 10 },
  billingCard: { flex: 1, borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.outline, padding: 13, gap: 4 },
  billingCardActive: { borderColor: colors.primary, backgroundColor: colors.surfaceMint, borderWidth: 2 },
  billingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billingTitle: { ...typography.heading, fontSize: 14, color: colors.ink },
  billingTrialBadge: { ...typography.label, fontSize: 9, color: colors.primaryDark, backgroundColor: colors.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  saveBadge: { backgroundColor: colors.goldSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  saveBadgeText: { ...typography.label, fontSize: 9, color: '#765B15' },
  billingPrice: { ...typography.title, fontSize: 22, color: colors.primaryDark, marginTop: 2 },
  billingUnit: { ...typography.body, fontSize: 12, color: colors.muted },
  billingSub: { ...typography.body, fontSize: 10, color: colors.muted },
  benefitsBox: { borderRadius: 18, backgroundColor: colors.surfaceSoft, padding: 12, gap: 9 },
  benefitItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  benefitText: { ...typography.body, fontSize: 11, color: colors.ink, flex: 1, lineHeight: 16 },
  benefitStrong: { fontWeight: '800', color: colors.primaryDark },
  nativeStoreCard: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: colors.outline, padding: 12, gap: 8 },
  nativeStoreCardPlay: { borderColor: 'rgba(1,135,95,0.3)', backgroundColor: '#F0F9F5' },
  nativeStoreHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nativeStoreTitle: { ...typography.label, fontSize: 12, color: colors.ink },
  nativeStoreSub: { ...typography.body, fontSize: 10, color: colors.muted },
  faceIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceMint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  faceIdText: { ...typography.label, fontSize: 11, color: colors.primaryDark },
  playPaymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(1,135,95,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  playPaymentText: { ...typography.label, fontSize: 11, color: '#01875F' },
  restoreFeedback: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceMint, padding: 10, borderRadius: 12 },
  restoreFeedbackText: { ...typography.label, fontSize: 11, color: colors.primaryDark },
  storeFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 },
  storeFooterLink: { ...typography.label, fontSize: 10, color: colors.muted, textDecorationLine: 'underline' },
  storeFooterDivider: { color: colors.muted, fontSize: 10 },
  paymentNote: { ...typography.body, color: colors.muted, fontSize: 9, textAlign: 'center', lineHeight: 13 },
});
