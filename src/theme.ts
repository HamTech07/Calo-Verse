import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#F1F0EB',
  surface: '#FCFBF8',
  surfaceSoft: '#E9E8E2',
  surfaceMint: '#DFE9E4',
  primary: '#18524D',
  primaryDark: '#103B38',
  primarySoft: '#B7D1C8',
  secondary: '#59625B',
  secondarySoft: '#D9DDD6',
  coral: '#9A735E',
  coralSoft: '#E7D8CF',
  gold: '#B18A49',
  goldSoft: '#E9DFC9',
  ink: '#1C2421',
  muted: '#66706B',
  outline: '#D2D4CF',
  danger: '#B94A48',
  dangerSoft: '#FFE0DE',
  blue: '#527177',
  blueSoft: '#D9E1E0',
};

export const fonts = {
  display: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', web: 'system-ui' }),
  body: Platform.select({ ios: 'Avenir', android: 'sans-serif', web: 'system-ui' }),
};

export const clayShadow: ViewStyle = Platform.select({
  web: {
    boxShadow: '0 14px 34px rgba(25,48,42,0.13), 0 2px 5px rgba(25,48,42,0.06)',
  } as ViewStyle,
  default: {
    shadowColor: '#193C35',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 7,
  },
}) as ViewStyle;

export const softShadow: ViewStyle = Platform.select({
  web: {
    boxShadow: '0 8px 24px rgba(24,75,61,0.10)',
  } as ViewStyle,
  default: {
    shadowColor: '#184B3D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
}) as ViewStyle;

export const typography = {
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.6,
  } as TextStyle,
  heading: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  } as TextStyle,
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  } as TextStyle,
  label: {
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.ink,
  } as TextStyle,
};
