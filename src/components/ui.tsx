import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  ImageStyle,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { clayShadow, colors, fonts, softShadow, typography } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function LogoMark({ size = 72 }: { size?: number }) {
  return (
    <View style={[styles.logoOuter, clayShadow, { width: size, height: size, borderRadius: Math.max(16, size * 0.24) }]}>
      <Image
        source={require('../../assets/caloverse-mark.png')}
        resizeMode="contain"
        style={[styles.logoImage, { borderRadius: Math.max(16, size * 0.24) }]}
      />
    </View>
  );
}

export function ClayCard({
  children,
  style,
  tone = 'white',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'white' | 'mint' | 'blue' | 'peach' | 'gold';
}) {
  const backgroundColor = {
    white: colors.surface,
    mint: colors.surfaceMint,
    blue: colors.blueSoft,
    peach: colors.coralSoft,
    gold: colors.goldSoft,
  }[tone];
  return <View style={[styles.card, clayShadow, { backgroundColor }, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled,
  loading,
  compact,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        softShadow,
        compact && styles.buttonCompact,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.surface} /> : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={colors.surface} /> : null}
          <Text style={styles.primaryButtonText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
  compact,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, compact && styles.buttonCompact, pressed && styles.buttonPressed, style]}
    >
      {icon === 'logo-google' ? (
        <Image source={require('../../assets/google-g.png')} style={styles.googleLogo} resizeMode="contain" />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={colors.primary} />
      ) : null}
      <Text style={[styles.secondaryButtonText, icon === 'logo-google' && styles.googleButtonText]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  icon,
  suffix,
  ...props
}: TextInputProps & { label: string; icon?: IconName; suffix?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldShell}>
        {icon ? <Ionicons name={icon} size={19} color={colors.muted} /> : null}
        <TextInput
          placeholderTextColor="#909A95"
          style={styles.fieldInput}
          selectionColor={colors.primary}
          {...props}
        />
        {suffix ? <Text style={styles.fieldSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Pill({
  label,
  selected,
  onPress,
  icon,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress || disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, selected && styles.pillSelected, disabled && styles.pillDisabled, pressed && { opacity: 0.82 }]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? colors.primaryDark : colors.muted} /> : null}
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  const safeValue = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${safeValue * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function ScreenTitle({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.screenTitleRow}>
      <View style={styles.screenTitleCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={typography.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function FoodImage({
  source,
  style,
  resizeMode = 'cover',
}: {
  source: string | ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
}) {
  const [failed, setFailed] = useState(false);
  const defaultMark = require('../../assets/caloverse-mark.png');
  const isDefaultOrFailed = failed || !source;
  const imgSource = isDefaultOrFailed ? defaultMark : typeof source === 'string' ? { uri: source } : source;

  return (
    <Image
      source={imgSource}
      resizeMode={isDefaultOrFailed ? 'contain' : resizeMode}
      onError={() => setFailed(true)}
      style={[
        styles.foodImage,
        style,
        isDefaultOrFailed && { backgroundColor: '#1C2322' },
      ]}
    />
  );
}

export function Metric({
  label,
  value,
  suffix,
  inverted = false,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  inverted?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, inverted && styles.metricLabelInverted]}>{label}</Text>
      <Text style={[styles.metricValue, inverted && styles.metricValueInverted]}>
        {value}
        {suffix ? <Text style={[styles.metricSuffix, inverted && styles.metricSuffixInverted]}> {suffix}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoOuter: { backgroundColor: '#202726', padding: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  card: { borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
  primaryButton: {
    minHeight: 54,
    borderRadius: 28,
    paddingHorizontal: 22,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonCompact: { minHeight: 42, paddingHorizontal: 16 },
  buttonDisabled: { opacity: 0.48 },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  primaryButtonText: { fontFamily: fonts.display, color: colors.surface, fontSize: 15, fontWeight: '800' },
  secondaryButtonText: { fontFamily: fonts.display, color: colors.primary, fontSize: 14, fontWeight: '800' },
  googleLogo: { width: 20, height: 20 },
  googleButtonText: { color: '#1F1F1F', fontWeight: '600' },
  fieldWrap: { gap: 7, flex: 1 },
  fieldLabel: { ...typography.label, color: colors.muted, marginLeft: 5 },
  fieldShell: {
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.outline,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  fieldInput: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 15, color: colors.ink, paddingVertical: 12 },
  fieldSuffix: { ...typography.body, color: colors.muted },
  pill: {
    minHeight: 38,
    borderRadius: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  pillDisabled: { opacity: 0.48 },
  pillText: { ...typography.label, color: colors.muted },
  pillTextSelected: { color: colors.primaryDark },
  progressTrack: { height: 12, borderRadius: 8, overflow: 'hidden', backgroundColor: '#DDE5DF' },
  progressFill: { height: '100%', borderRadius: 8 },
  screenTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  screenTitleCopy: { flex: 1, gap: 4 },
  eyebrow: { ...typography.label, color: colors.primary, fontSize: 11, letterSpacing: 1.3 },
  subtitle: { ...typography.body, color: colors.muted, marginTop: 2 },
  foodImage: { width: '100%', backgroundColor: colors.surfaceSoft },
  metric: { gap: 3 },
  metricLabel: { ...typography.label, color: colors.muted, fontSize: 11 },
  metricValue: { ...typography.heading, color: colors.ink, fontSize: 19 },
  metricSuffix: { ...typography.body, color: colors.muted, fontSize: 12 },
  metricLabelInverted: { color: 'rgba(255,255,255,0.78)' },
  metricValueInverted: { color: colors.surface },
  metricSuffixInverted: { color: 'rgba(255,255,255,0.78)' },
});
