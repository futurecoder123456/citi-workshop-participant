import { createTheme } from '@mui/material/styles'

export const fonts = {
  display: '"Bricolage Grotesque", "Avenir Next", "Segoe UI", system-ui, sans-serif',
  body: '"Figtree", "Segoe UI", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
}

const tokens = {
  light: {
    ground: '#F3F5FB', surface: '#FFFFFF', surface2: '#EAEDF7', line: '#DCE1EF',
    ink: '#11162E', ink2: '#4A5275', muted: '#7C84A3',
    accent: '#6B4EF5', accentInk: '#FFFFFF', accentSoft: '#ECE8FF',
    status: { open: '#2F6BEA', in_progress: '#E4A11B', blocked: '#E3455A', resolved: '#16A36F', closed: '#7A819C' },
    priority: { critical: '#E3455A', high: '#EE7A2B', medium: '#2F6BEA', low: '#7A819C' },
    lunch: '#F4C35A', lunchInk: '#A8740A', shift: '#C9D3F2', now: '#E3455A',
    rail: { bg: '#11162E', ink: '#C7CCE4', active: '#FFFFFF' },
    shadow: '0 1px 2px rgba(17,22,46,.06), 0 8px 24px -12px rgba(17,22,46,.18)',
  },
  dark: {
    ground: '#0C0F1D', surface: '#151A2D', surface2: '#1D2339', line: '#2A3150',
    ink: '#EAEDF8', ink2: '#B3BAD6', muted: '#8088A8',
    accent: '#8C76FF', accentInk: '#0C0F1D', accentSoft: '#272150',
    status: { open: '#5C8DF5', in_progress: '#F0B94A', blocked: '#F2697B', resolved: '#3CC48F', closed: '#8E95B0' },
    priority: { critical: '#F2697B', high: '#F59A57', medium: '#5C8DF5', low: '#8E95B0' },
    lunch: '#C9962E', lunchInk: '#F0C25E', shift: '#34406A', now: '#F2697B',
    rail: { bg: '#080A15', ink: '#9AA2C4', active: '#FFFFFF' },
    shadow: '0 1px 2px rgba(0,0,0,.3), 0 10px 28px -14px rgba(0,0,0,.7)',
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
      info: { main: t.status.open },
      background: { default: t.ground, paper: t.surface },
      text: { primary: t.ink, secondary: t.ink2, disabled: t.muted },
      divider: t.line,
      fixline: t,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: fonts.body,
      fontSize: 14,
      h1: { fontFamily: fonts.display, fontWeight: 800, fontSize: 'clamp(1.65rem, 3vw, 2.15rem)', letterSpacing: '-0.03em', lineHeight: 1.15 },
      h2: { fontFamily: fonts.display, fontWeight: 700, fontSize: '1.07rem', letterSpacing: '-0.01em' },
      h3: { fontFamily: fonts.display, fontWeight: 700, fontSize: '1.35rem', letterSpacing: '-0.02em', lineHeight: 1.2 },
      overline: { fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', lineHeight: 1.6 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { WebkitFontSmoothing: 'antialiased' },
          'h1, h2, h3': { textWrap: 'balance' },
        },
      },
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 10 } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    },
  })
}
