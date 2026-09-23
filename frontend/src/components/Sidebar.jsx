import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material'
import { useBreakpoints } from '../hooks/useBreakpoints'
import { fonts } from '../theme'
import { UserAvatar } from './Badges'

const ROLE_TITLES = { admin: 'Facility Admin', engineer: 'Engineer', employee: 'Employee' }

export function BrandMark({ ground }) {
  return (
    <Box sx={{ width: 34, height: 34, borderRadius: '10px', display: 'grid', placeItems: 'center', flex: 'none',
      background: 'conic-gradient(from 200deg, #2F6BEA, #6B4EF5, #E3455A, #E4A11B, #16A36F, #2F6BEA)' }}>
      <Box sx={(t) => ({ width: 14, height: 14, borderRadius: '4px', bgcolor: ground ?? t.palette.fixline.rail.bg })} />
    </Box>
  )
}

/** Dark left rail with brand, optional screen menu, and the signed-in user; collapses to a top bar on mobile. */
export default function Sidebar({ user, onSignOut, lastUpdated, nav = [], view, onNavigate }) {
  const { isMobile } = useBreakpoints()
  return (
    <Box
      component="aside"
      sx={(t) => ({
        bgcolor: t.palette.fixline.rail.bg,
        color: t.palette.fixline.rail.ink,
        display: 'flex',
        ...(isMobile
          ? { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, px: 2, py: 1.5 }
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

      {nav.length > 0 && (
        <Stack component="nav" aria-label="Screens" direction={isMobile ? 'row' : 'column'} spacing={0.5}
          sx={{ order: isMobile ? 3 : 0, flex: isMobile ? '1 1 100%' : 'none', overflowX: 'auto' }}>
          {nav.map((item) => {
            const current = item.id === view
            return (
              <ButtonBase
                key={item.id}
                id={`nav-${item.id}`}
                aria-current={current ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                sx={(t) => ({
                  justifyContent: 'flex-start', borderRadius: 2.5, px: 1.5, py: 1.1, fontSize: 14, flex: 'none',
                  fontWeight: current ? 600 : 500,
                  color: current ? t.palette.fixline.rail.active : t.palette.fixline.rail.ink,
                  bgcolor: current ? 'rgba(255,255,255,.1)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,.06)' },
                  '&.Mui-focusVisible': { outline: `2px solid ${t.palette.primary.main}` },
                })}
              >
                {item.label}
              </ButtonBase>
            )
          })}
        </Stack>
      )}

      <Stack direction={isMobile ? 'row' : 'column'} spacing={isMobile ? 1 : 1.5} sx={{ mt: isMobile ? 0 : 'auto', alignItems: isMobile ? 'center' : 'stretch' }}>
        {!isMobile && lastUpdated && (
          <Typography sx={{ fontSize: 12, opacity: 0.7 }}>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · refreshes every 30s
          </Typography>
        )}
        <Stack direction="row" spacing={1.25} sx={(t) => ({ alignItems: 'center', color: t.palette.fixline.rail.active, minWidth: 0 })}>
          <UserAvatar id={user.id} name={user.name} size={isMobile ? 28 : 34} />
          {!isMobile && (
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }} noWrap>{user.name}</Typography>
              <Typography sx={(t) => ({ fontSize: 11.5, color: t.palette.fixline.rail.ink })} noWrap>{ROLE_TITLES[user.role]}</Typography>
            </Box>
          )}
        </Stack>
        <Button id="sign-out" size="small" onClick={onSignOut}
          sx={(t) => ({ color: t.palette.fixline.rail.ink, border: '1px solid rgba(255,255,255,.18)', '&:hover': { bgcolor: 'rgba(255,255,255,.06)' } })}>
          Sign out
        </Button>
      </Stack>
    </Box>
  )
}
