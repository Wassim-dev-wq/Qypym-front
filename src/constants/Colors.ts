export const COLORS = {
  primary: {
    main: '#111111',
    light: '#1A1A1A',
    dark: '#0A0A0A',
    accent: '#FFB800',
    hover: '#FFC833',
    pressed: '#E6A600',
  },
  neutral: {
    50: '#FFFFFF',
    100: '#FAFAFA',
    200: '#EAEAEA',
    300: '#A1A1A1',
    400: '#737373',
    500: '#525252',
    600: '#404040',
    700: '#2E2E2E',
    800: '#1F1F1F',
    900: '#141414',
  },
  secondary: {
    error: '#FF4444',
    errorLight: '#FFE5E5',
    errorDark: '#CC3636',
    success: '#22C55E',
    successLight: '#DCFCE7',
    successDark: '#15803D',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    infoDark: '#1D4ED8',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    warningDark: '#B45309',
  },
  validation: {
    errorText: '#FF4444',
    errorBorder: '#FF4444',
    errorBackground: 'rgba(255, 68, 68, 0.08)',
    errorIcon: '#FF4444',
    successText: '#22C55E',
    successBorder: '#22C55E',
    successBackground: 'rgba(34, 197, 94, 0.08)',
    successIcon: '#22C55E',
  },
  background: {
    card: '#141414',
    cardHover: '#1A1A1A',
    cardPressed: '#111111',
    input: 'rgba(255, 255, 255, 0.03)',
    inputFocused: 'rgba(255, 255, 255, 0.05)',
    overlay: 'rgba(0, 0, 0, 0.75)',
    main: '#0A0A0A',
  },
  gradients: {
    primary: ['#111111', '#1A1A1A', '#1F1F1F'],
    accent: ['#FFB800', '#E6A600'],
    error: ['#FF4444', '#FF6666'],
    success: ['#22C55E', '#15803D'],
  },
  divider: '#1A1A1A',
  card: '#141414',
  cardAccent: '#1A1A1A',
  playerRatingBg: '#141414',
};

export const THEME_COLORS = {
  neutral: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    300: '#A1A1AA',
    400: '#52525B',
    600: '#27272A',
  },
  primary: COLORS.primary.accent,
  primaryDark: COLORS.primary.pressed,
  background: COLORS.background.main,
  card: COLORS.background.card,
  cardAccent: COLORS.cardAccent,
  textPrimary: COLORS.neutral[50],
  textSecondary: COLORS.neutral[300],
  textPlaceholder: COLORS.neutral[500],
  error: COLORS.secondary.error,
  success: COLORS.secondary.success,
  errorLight: COLORS.secondary.errorLight,
  successLight: COLORS.secondary.successLight,
  divider: COLORS.divider,
  statusColors: {
    draft: [
      'rgba(99, 102, 241, 0.25)',
      'rgba(99, 102, 241, 0.15)'
    ],
    open: [
      'rgba(34, 197, 94, 0.25)',
      'rgba(34, 197, 94, 0.15)'
    ] as const,
    inProgress: [
      'rgba(255, 184, 0, 0.35)',
      'rgba(255, 184, 0, 0.25)'
    ],
    completed: [
      'rgba(6, 182, 212, 0.25)',
      'rgba(6, 182, 212, 0.15)'
    ],
    cancelled: [
      'rgba(239, 68, 68, 0.25)',
      'rgba(239, 68, 68, 0.15)'
    ]
  },
  timeContainerGradient: [COLORS.primary.accent, COLORS.primary.pressed] as const,
  requestsBarGradient: ['rgba(255,184,0,0.1)', 'rgba(230,166,0,0.1)'] as const,
}