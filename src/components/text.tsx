import {
  Text as NativeText,
  type TextProps as NativeTextProps,
  type TextStyle,
} from 'react-native';

import { useTheme, type Theme } from '@/theme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label'
  | 'eyebrow'
  | 'mono'
  | 'monoSmall';

type TextProps = NativeTextProps & {
  variant?: TextVariant;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'success' | 'warning' | 'danger';
  align?: TextStyle['textAlign'];
};

function variantStyle(theme: Theme, variant: TextVariant): TextStyle {
  const { colors, fonts } = theme;
  switch (variant) {
    case 'display':
      return {
        fontFamily: fonts.extrabold,
        fontSize: 46,
        lineHeight: 49,
        letterSpacing: -1.8,
        color: colors.text,
      };
    case 'title':
      return {
        fontFamily: fonts.bold,
        fontSize: 28,
        lineHeight: 34,
        letterSpacing: -0.7,
        color: colors.text,
      };
    case 'heading':
      return {
        fontFamily: fonts.bold,
        fontSize: 21,
        lineHeight: 27,
        letterSpacing: -0.35,
        color: colors.text,
      };
    case 'subheading':
      return {
        fontFamily: fonts.semibold,
        fontSize: 17,
        lineHeight: 23,
        letterSpacing: -0.15,
        color: colors.text,
      };
    case 'body':
      return {
        fontFamily: fonts.regular,
        fontSize: 15,
        lineHeight: 23,
        color: colors.textSecondary,
      };
    case 'bodyStrong':
      return {
        fontFamily: fonts.semibold,
        fontSize: 15,
        lineHeight: 23,
        color: colors.text,
      };
    case 'caption':
      return {
        fontFamily: fonts.regular,
        fontSize: 13,
        lineHeight: 19,
        color: colors.textTertiary,
      };
    case 'label':
      return {
        fontFamily: fonts.semibold,
        fontSize: 13,
        lineHeight: 18,
        letterSpacing: 0.1,
        color: colors.textSecondary,
      };
    case 'eyebrow':
      return {
        fontFamily: fonts.bold,
        fontSize: 11,
        lineHeight: 15,
        letterSpacing: 1.7,
        textTransform: 'uppercase',
        color: colors.textTertiary,
      };
    case 'mono':
      return {
        fontFamily: 'monospace',
        fontSize: 13,
        lineHeight: 19,
        letterSpacing: -0.1,
        color: colors.textSecondary,
      };
    case 'monoSmall':
      return {
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 16,
        color: colors.textTertiary,
      };
  }
}

const toneColor = (theme: Theme, tone: NonNullable<TextProps['tone']>) => {
  switch (tone) {
    case 'primary':
      return theme.colors.text;
    case 'secondary':
      return theme.colors.textSecondary;
    case 'tertiary':
      return theme.colors.textTertiary;
    case 'accent':
      return theme.colors.accent;
    case 'success':
      return theme.colors.success;
    case 'warning':
      return theme.colors.warning;
    case 'danger':
      return theme.colors.danger;
  }
};

export function Text({ variant = 'body', tone, align, style, ...rest }: TextProps) {
  const theme = useTheme();
  const base = variantStyle(theme, variant);
  const color = tone ? toneColor(theme, tone) : base.color;

  return (
    <NativeText
      {...rest}
      style={[base, { color }, align ? { textAlign: align } : null, style]}
    />
  );
}
