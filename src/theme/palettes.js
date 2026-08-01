// Semantic colour tokens for light and dark themes. Components read these via
// useTheme()/useThemedStyles() — never hard-code hex in a component so both
// themes stay in sync. The accent stays cobalt to match the Velodar icon.

export const lightPalette = {
  isDark: false,

  bg: '#e5e7eb', // map fallback / screen ground
  surface: '#ffffff', // cards, bars, menu
  surfaceAlt: '#f8fafc', // subtle inset panels (stat block)
  chipBg: '#f3f4f6', // ghost buttons / chips

  text: '#111827',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',

  border: '#e5e7eb',
  borderFaint: '#f1f5f9',

  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primarySoft: '#eff6ff',
  onPrimary: '#ffffff',

  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  success: '#16a34a',
  successSoft: '#f0fdf4',

  switchOff: '#e5e7eb',
  backdrop: 'rgba(0,0,0,0.4)',
};

export const darkPalette = {
  isDark: true,

  bg: '#0a1120',
  surface: '#121c31', // cards, bars, menu
  surfaceAlt: '#0e1728', // subtle inset panels
  chipBg: '#1c2740', // ghost buttons / chips

  text: '#eef2fb',
  textMuted: '#9aa7c4',
  textFaint: '#6b7791',

  border: '#26324b',
  borderFaint: '#1b2740',

  primary: '#3b82f6',
  primaryDark: '#2563eb',
  primarySoft: 'rgba(59,130,246,0.18)',
  onPrimary: '#ffffff',

  danger: '#f87171',
  dangerSoft: 'rgba(248,113,113,0.15)',
  success: '#4ade80',
  successSoft: 'rgba(74,222,128,0.15)',

  switchOff: '#374151',
  backdrop: 'rgba(0,0,0,0.62)',
};
