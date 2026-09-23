import { Box, ButtonBase, Stack, Typography } from '@mui/material'
import { DEMO_TIME_LABEL, PERSONAS, USERS } from '../data/mockData'
import { useBreakpoints } from '../hooks/useBreakpoints'
import { fonts } from '../theme'
import { UserAvatar } from './Badges'

function BrandMark() {
  return (
    <Box sx={{ width: 34, height: 34, borderRadius: '10px', display: 'grid', placeItems: 'center', flex: 'none',
      background: 'conic-gradient(from 200deg, #2F6BEA, #6B4EF5, #E3455A, #E4A11B, #16A36F, #2F6BEA)' }}>
      <Box sx={(t) => ({ width: 14, height: 14, borderRadius: '4px', bgcolor: t.palette.fixline.rail.bg })} />
    </Box>
  )
}

/**
 * Dark left rail with brand and persona switcher; collapses to a top bar on mobile.
 * The persona switcher stands in for login until the auth service exists.
 */
export default function Sidebar({ personaId, onPersonaChange }) {
  const { isMobile } = useBreakpoints()
  return (
    <Box
      component="aside"
      sx={(t) => ({
        bgcolor: t.palette.fixline.rail.bg,
        color: t.palette.fixline.rail.ink,
        display: 'flex',
        ...(isMobile
          ? { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }
          : { flexDirection: 'column', gap: 2.75, px: 2, py: 2.5, position: 'sticky', top: 'env(safe-area-inset-top, 0px)', height: '100vh' }),
      })}
    >
      <Stack direction="row" spacing={1.25} sx={(t) => ({ alignItems: 'center', color: t.palette.fixline.rail.active })}>
        <BrandMark />
        <Box>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Fixline</Typography>
          <Typography sx={(t) => ({ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.palette.fixline.rail.ink })}>ACME Facilities</Typography>
        </Box>
      </Stack>

      <Box sx={{ flex: isMobile ? '1 1 100%' : 'none', minWidth: 0 }}>
        {!isMobile && <Typography sx={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, mb: 1 }}>Viewing as</Typography>}
        <Stack direction={isMobile ? 'row' : 'column'} spacing={0.5} sx={{ overflowX: 'auto' }}>
          {PERSONAS.map((p) => {
            const selected = p.userId === personaId
            return (
              <ButtonBase
                key={p.userId}
                id={`persona-${p.userId}`}
                aria-pressed={selected}
                onClick={() => onPersonaChange(p.userId)}
                sx={(t) => ({
                  justifyContent: 'flex-start', gap: 1.25, borderRadius: 2.5, px: 1.25, py: 1.1, textAlign: 'left', flex: 'none',
                  color: selected ? t.palette.fixline.rail.active : t.palette.fixline.rail.ink,
                  bgcolor: selected ? 'rgba(255,255,255,.1)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,.06)' },
                  '&.Mui-focusVisible': { outline: `2px solid ${t.palette.primary.main}` },
                })}
              >
                <UserAvatar userId={p.userId} />
                <Box sx={{ lineHeight: 1.2 }}>
                  <Typography sx={{ fontSize: 14 }}>{USERS[p.userId].name}</Typography>
                  {!isMobile && <Typography sx={{ fontSize: 11, opacity: 0.75 }}>{p.title}</Typography>}
                </Box>
              </ButtonBase>
            )
          })}
        </Stack>
      </Box>

      {!isMobile && (
        <Stack spacing={0.5} sx={{ mt: 'auto', fontSize: 12 }}>
          <span>Demo clock</span>
          <Typography sx={(t) => ({ fontFamily: fonts.mono, fontSize: 13, color: t.palette.fixline.rail.active })}>{DEMO_TIME_LABEL}</Typography>
          <Box component="span" sx={{ opacity: 0.7 }}>Sample data. Switch persona to see each role's view.</Box>
        </Stack>
      )}
    </Box>
  )
}
