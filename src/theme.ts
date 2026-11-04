// Dark, matte palette. No glow, no neon: depth comes from layered surfaces and hairlines.
export const colors = {
  bg: '#0D0E10',
  surface: '#16171A',
  surfaceHigh: '#1F2024',
  surfaceHigher: '#2A2B30',
  hairline: 'rgba(255,255,255,0.07)',
  text: '#F3F1EC',
  textDim: '#A3A29D',
  textFaint: '#6B6A66',

  // Brand accent: warm amber (calories / primary actions)
  accent: '#F2994A',
  accentSoft: 'rgba(242,153,74,0.14)',
  onAccent: '#1A1006',

  // Macros (muted, distinguishable on dark)
  protein: '#E8776A',
  carbs: '#D9B86C',
  fat: '#7FB59A',

  success: '#7FB59A',
  danger: '#E5675C',
} as const;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const type = {
  hero: { fontSize: 64, fontWeight: '700' as const, letterSpacing: -2, fontVariant: ['tabular-nums' as const] },
  title: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.6 },
  h2: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.3 },
  body: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  caption: { fontSize: 12, fontWeight: '500' as const },
  num: { fontVariant: ['tabular-nums' as const] },
};

export const spring = { damping: 18, stiffness: 180, mass: 0.9 } as const;
