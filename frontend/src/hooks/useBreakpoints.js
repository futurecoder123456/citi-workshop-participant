import { useMediaQuery } from 'react-responsive'

/** Shared responsive breakpoints for layout decisions. */
export function useBreakpoints() {
  return {
    isPhone: useMediaQuery({ maxWidth: 480 }),
    isMobile: useMediaQuery({ maxWidth: 860 }),
    isNarrow: useMediaQuery({ maxWidth: 1180 }),
    prefersDark: useMediaQuery({ query: '(prefers-color-scheme: dark)' }),
    reducedMotion: useMediaQuery({ query: '(prefers-reduced-motion: reduce)' }),
  }
}
