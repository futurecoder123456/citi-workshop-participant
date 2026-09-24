import { createTheme } from '@mui/material/styles'

export const fonts = {
  // Wordmark only ("ACME")
  brand: '"Fraunces", "Iowan Old Style", Georgia, serif',
  body: '"Instrument Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
  // Ticket IDs, asset tags, times: same family with tabular figures so digits line up
  data: '"Instrument Sans", "Segoe UI", system-ui, sans-serif',
}

// Palette taken from the Fixline admin board mockup: warm off-white ground, hairline borders,
// deep teal primary, rust accent for IDs and counts.
const tokens = {
  light: {
    ground: '#F8F7F4', surface: '#FFFFFF', surface2: '#F2F0EB', line: '#E3E0D9',
    ink: '#1C2024', ink2: '#4F565E', muted: '#868C93',
    accent: '#1F4E5F', accentInk: '#FFFFFF', accentSoft: '#E3EEF1', link: '#2B6A80',
    rust: '#B5532A',
    status: { open: '#9AA1A8', in_progress: '#D4891A', blocked: '#C9423A', resolved: '#2E8B57', closed: '#8C9197' },
    priority: {
      critical: { bg: '#F6D5D1', fg: '#8F1D15' },
      high: { bg: '#FBE3E0', fg: '#B42318' },
      medium: { bg: '#FBEAD9', fg: '#B45A1B' },
      low: { bg: '#EEF0F1', fg: '#5B6168' },
    },
    avatar: { bg: '#EFECE6', ink: '#4F565E' },
    lunch: '#E9B949', lunchInk: '#8A5F00', shift: '#D5DEE2', now: '#C9423A',
    shadow: '0 0 0 1px #E3E0D9',
    popShadow: '0 8px 28px -12px rgba(28,32,36,.25)',
  },
  dark: {
    ground: '#141719', surface: '#1C2023', surface2: '#24292D', line: '#32383D',
    ink: '#ECEEF0', ink2: '#B8BEC4', muted: '#8B9197',
    accent: '#7DBDD0', accentInk: '#0E1A1E', accentSoft: '#1D3540', link: '#8CC7D8',
    rust: '#E3936A',
    status: { open: '#A3AAB1', in_progress: '#E8A63F', blocked: '#E4675F', resolved: '#4DB57F', closed: '#8C9197' },
    priority: {
      critical: { bg: '#4A1D1A', fg: '#F7B4AD' },
      high: { bg: '#3F1F1C', fg: '#F2A59D' },
      medium: { bg: '#3D2A1A', fg: '#F0B886' },
      low: { bg: '#2A2F33', fg: '#B8BEC4' },
    },
    avatar: { bg: '#2C3236', ink: '#C9CED3' },
    lunch: '#B98F2E', lunchInk: '#E9C26A', shift: '#35444B', now: '#E4675F',
    shadow: '0 0 0 1px #32383D',
    popShadow: '0 10px 30px -12px rgba(0,0,0,.7)',
  },
}

/** Build the Fixline MUI theme; custom tokens live under palette.fixline. */
export function buildTheme(mode) {
  const t = tokens[mode]
  return createTheme({
    palette: {
      mode,
      primary: { main: t.accent, contrastText: t.accentInk },
      error: { main: t.status.blocked },
      success: { main: t.status.resolved },
      warning: { main: t.status.in_progress },
      info: { main: t.link },
      background: { default: t.ground, paper: t.surface },
      text: { primary: t.ink, secondary: t.ink2, disabled: t.muted },
      divider: t.line,
      fixline: t,
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: fonts.body,
      fontSize: 14,
      h1: { fontWeight: 600, fontSize: 'clamp(1.35rem, 2.4vw, 1.6rem)', letterSpacing: '-0.015em', lineHeight: 1.2 },
      h2: { fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.005em' },
      h3: { fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.015em', lineHeight: 1.25 },
      overline: { fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', lineHeight: 1.6 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { WebkitFontSmoothing: 'antialiased', fontVariantNumeric: 'tabular-nums' },
          // Clickable cards render as <button>, which doesn't inherit the page font by default.
          'button, input, select, textarea': { fontFamily: 'inherit' },
          'h1, h2, h3': { textWrap: 'balance' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 8 }, sizeMedium: { padding: '6px 14px', fontSize: 13 } },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiInputBase: { styleOverrides: { root: { fontSize: 14 } } },
      MuiInputLabel: { styleOverrides: { root: { fontSize: 14 } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { backgroundColor: t.surface, '& .MuiOutlinedInput-notchedOutline': { borderColor: t.line } },
        },
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 12, boxShadow: t.popShadow } } },
      MuiTooltip: { styleOverrides: { tooltip: { fontSize: 12 } } },
    },
  })
}
