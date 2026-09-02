import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ClayCard, Field, LogoMark, PrimaryButton, SecondaryButton } from '../components/ui';
import { colors, fonts, typography } from '../theme';
import { readableAuthError } from '../services/auth';

interface AuthScreenProps {
  backendEnabled: boolean;
  onEmailAuth: (mode: 'signup' | 'login', name: string, email: string, password: string) => Promise<void>;
  onGoogleAuth: () => Promise<void>;
  onContinue: (name: string, email: string) => void;
}

export function AuthScreen({ backendEnabled, onEmailAuth, onGoogleAuth, onContinue }: AuthScreenProps) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  const runAuth = async (action: () => Promise<void>) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (authError) {
      setError(readableAuthError(authError));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const submit = () => {
    if (!backendEnabled) {
      setError('Sign-in is not connected yet. Use the local preview below.');
      return;
    }
    if (mode === 'signup' && name.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    void runAuth(() => onEmailAuth(mode, name.trim(), email.trim(), password));
  };

  return (
    <LinearGradient colors={['#F8FAF7', '#EDF7F1', '#FAF5E8']} style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <LogoMark size={88} />
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>Calo Verse</Text>
              <Text style={styles.tagline}>Your food. Your region. Your rhythm.</Text>
            </View>
          </View>

          <ClayCard style={styles.formCard}>
            <View style={styles.formHeading}>
              <Text style={typography.heading}>{mode === 'signup' ? 'Start your journey' : 'Welcome back'}</Text>
              <Text style={styles.formSubtitle}>
                {mode === 'signup'
                  ? 'Build a nutrition plan around your body and daily routine.'
                  : 'Continue tracking your meals, water and progress.'}
              </Text>
            </View>

            <SecondaryButton
              icon="logo-google"
              label={busy ? 'Connecting…' : 'Continue with Google'}
              onPress={() => {
                if (!backendEnabled) {
                  setError('Google sign-in is not connected yet. Use the local preview below.');
                  return;
                }
                void runAuth(onGoogleAuth);
              }}
            />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR USE EMAIL</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.fields}>
              {mode === 'signup' ? (
                <Field
                  label="Your name"
                  icon="person-outline"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Hamdan"
                  autoCapitalize="words"
                  editable={!busy}
                />
              ) : null}
              <Field
                label="Email address"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              <Field
                label="Password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 6 characters"
                secureTextEntry
                editable={!busy}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label={mode === 'signup' ? 'Create my plan' : 'Sign in'}
              icon="arrow-forward"
              onPress={submit}
              loading={busy}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchCopy}>
                {mode === 'signup' ? 'Already have an account?' : 'New to Calo Verse?'}
              </Text>
              <Text
                accessibilityRole="button"
                onPress={() => {
                  if (busy) return;
                  setMode(mode === 'signup' ? 'login' : 'signup');
                  setError('');
                }}
                style={styles.switchLink}
              >
                {mode === 'signup' ? ' Log in' : ' Sign up'}
              </Text>
            </View>
          </ClayCard>

          {!backendEnabled ? (
            <SecondaryButton
              label="Explore local preview"
              icon="play-outline"
              onPress={() => onContinue(name.trim() || 'Calo Explorer', email.trim() || 'preview@example.com')}
            />
          ) : null}
          <Text style={styles.demoNote}>
            {backendEnabled
              ? 'Account authentication powered by Firebase'
              : 'Local preview only · Firebase configuration is required for real accounts and cloud storage.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 32,
    gap: 30,
  },
  brand: { alignItems: 'center', gap: 20 },
  brandCopy: { alignItems: 'center', gap: 5 },
  brandName: {
    fontFamily: fonts.display,
    color: colors.primary,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  tagline: { ...typography.body, color: colors.muted, textAlign: 'center' },
  formCard: { padding: 24, gap: 18 },
  formHeading: { gap: 5 },
  formSubtitle: { ...typography.body, color: colors.muted },
  fields: { gap: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { height: 1, backgroundColor: colors.outline, flex: 1 },
  dividerText: {
    ...typography.label,
    color: '#8A948F',
    fontSize: 10,
    letterSpacing: 1.1,
  },
  error: { ...typography.label, color: colors.danger, textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  switchCopy: { ...typography.body, color: colors.muted },
  switchLink: { ...typography.body, color: colors.primary, fontWeight: '800' },
  demoNote: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
  },
});
