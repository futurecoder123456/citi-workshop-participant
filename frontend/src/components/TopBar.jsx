import { useState } from 'react'
import { Box, Button, ButtonBase, Divider, Menu, MenuItem, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useBreakpoints } from '../hooks/useBreakpoints'
import { fonts } from '../theme'
import { UserAvatar } from './Badges'

const ROLE_TITLES = { admin: 'Facility Admin', engineer: 'Engineer', employee: 'Employee' }

/** "ACME FACILITIES" wordmark: serif name, small rust capitals. */
export function Wordmark({ size = 18 }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', flex: 'none' }}>
      <Typography component="span" sx={{ fontFamily: fonts.brand, fontWeight: 700, fontSize: size, letterSpacing: '0.01em', lineHeight: 1 }}>
        ACME
      </Typography>
      <Typography component="span" sx={(t) => ({ fontSize: size * 0.5, fontWeight: 600, letterSpacing: '0.14em', color: t.palette.fixline.rust })}>
        FACILITIES
      </Typography>
    </Stack>
  )
}

/**
 * White top bar: wordmark, screen tabs, "New incident", and the signed-in user (menu with sign out).
 * On phones the tabs drop to a second, horizontally scrolling row.
 */
export default function TopBar({ user, nav, view, onNavigate, onNewIncident, onSignOut, lastUpdated }) {
  const { isMobile } = useBreakpoints()
  const [menuAnchor, setMenuAnchor] = useState(null)

  const tabs = (
    <Tabs
      value={view}
      onChange={(_, v) => onNavigate(v)}
      variant={isMobile ? 'scrollable' : 'standard'}
      scrollButtons={false}
      aria-label="Screens"
      sx={(t) => ({
        minHeight: 0,
        '& .MuiTabs-indicator': { height: 2, bgcolor: t.palette.primary.main },
        '& .MuiTab-root': {
          minHeight: 0, minWidth: 0, px: 1.25, py: isMobile ? 1.25 : 2.25, fontSize: 13, fontWeight: 500, textTransform: 'none',
          color: t.palette.fixline.link,
        },
        '& .MuiTab-root.Mui-selected': { color: t.palette.text.primary, fontWeight: 600 },
      })}
    >
      {nav.map((item) => <Tab key={item.id} id={`nav-${item.id}`} value={item.id} label={item.label} disableRipple />)}
    </Tabs>
  )

  return (
    <Box component="header" sx={(t) => ({
      position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 10,
      bgcolor: 'background.paper', borderBottom: `1px solid ${t.palette.fixline.line}`,
    })}>
      <Stack direction="row" spacing={3} sx={{ alignItems: 'center', px: { xs: 2, md: 3.5 }, minHeight: isMobile ? 56 : 0 }}>
        <Wordmark />
        {!isMobile && tabs}
        <Box sx={{ flex: 1 }} />
        {onNewIncident && (
          <Button id="new-incident" variant="contained" size={isMobile ? 'small' : 'medium'} onClick={onNewIncident} sx={{ flex: 'none' }}>
            New incident
          </Button>
        )}
        <ButtonBase
          id="user-menu"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={Boolean(menuAnchor)}
          sx={{ borderRadius: 1, gap: 1, px: 0.5, py: 0.5, textAlign: 'left', flex: 'none' }}
        >
          <UserAvatar name={user.name} size={30} />
          {!isMobile && (
            <Box sx={{ lineHeight: 1.2 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{user.name}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{ROLE_TITLES[user.role]}</Typography>
            </Box>
          )}
        </ButtonBase>
      </Stack>
      {isMobile && <Box sx={{ px: 1 }}>{tabs}</Box>}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{user.name}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{user.email}</Typography>
          {lastUpdated && (
            <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · refreshes every 30s
            </Typography>
          )}
        </Box>
        <Divider />
        <MenuItem id="sign-out" onClick={() => { setMenuAnchor(null); onSignOut() }}>Sign out</MenuItem>
      </Menu>
    </Box>
  )
}
