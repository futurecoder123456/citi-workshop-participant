import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, CircularProgress, CssBaseline, Snackbar } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import IncidentDrawer from './components/IncidentDrawer'
import Sidebar from './components/Sidebar'
import { useBreakpoints } from './hooks/useBreakpoints'
import AdminDashboard from './pages/AdminDashboard'
import EmployeeHome from './pages/EmployeeHome'
import EngineerQueue from './pages/EngineerQueue'
import EngineersAdmin from './pages/EngineersAdmin'
import FacilitiesAdmin from './pages/FacilitiesAdmin'
import SignIn from './pages/SignIn'
import { getToken, onUnauthorized } from './services/apiClient'
import { authService } from './services/authService'
import { dashboardService, engineerService } from './services/directoryService'
import { incidentService } from './services/incidentService'
import { buildTheme } from './theme'
import { filterIncidents } from './utils/incidents'

const NO_FILTERS = { query: '', category: null, priority: null, escalatedOnly: false }
const REFRESH_MS = 30_000
const ADMIN_NAV = [
  { id: 'board', label: 'Incident board' },
  { id: 'locations', label: 'Locations' },
  { id: 'engineers', label: 'Engineers' },
]

export default function App() {
  const { prefersDark, isMobile } = useBreakpoints()
  const theme = useMemo(() => buildTheme(prefersDark ? 'dark' : 'light'), [prefersDark])

  // undefined = still checking a saved session, null = signed out
  const [user, setUser] = useState(getToken() ? undefined : null)
  const [incidents, setIncidents] = useState([])
  const [summary, setSummary] = useState(null)
  const [engineers, setEngineers] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [filters, setFilters] = useState(NO_FILTERS)
  const [openId, setOpenId] = useState(null)
  const [view, setView] = useState('board')
  const [toast, setToast] = useState('')

  const signOut = useCallback(() => {
    authService.logout()
    setUser(null)
    setIncidents([])
    setSummary(null)
    setOpenId(null)
    setFilters(NO_FILTERS)
    setView('board')
  }, [])

  useEffect(() => {
    onUnauthorized(() => {
      signOut()
      setToast('Your session ended. Sign in again.')
    })
    if (getToken()) authService.me().then(setUser).catch(() => setUser(null))
  }, [signOut])

  // Bumping reloadKey re-runs the loading effect below; refresh() is what the rest of the app calls.
  const [reloadKey, setReloadKey] = useState(0)
  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  // Load the signed-in user's data. `cancelled` drops a slow response that a newer load has replaced.
  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    Promise.all([
      incidentService.list(),
      dashboardService.summary(),
      user.role === 'admin' ? engineerService.list() : Promise.resolve([]),
    ])
      .then(([list, dash, roster]) => {
        if (cancelled) return
        setIncidents(list)
        setSummary(dash)
        setEngineers(roster)
        setLastUpdated(new Date())
      })
      .catch((e) => { if (!cancelled && e.status !== 401) setToast(e.message) })
    return () => { cancelled = true }
  }, [user, reloadKey])

  // Keep the board current: poll, and refresh when the tab regains focus.
  useEffect(() => {
    if (!user) return undefined
    const timer = setInterval(refresh, REFRESH_MS)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [user, refresh])

  const visible = useMemo(() => filterIncidents(incidents, filters), [incidents, filters])

  const createIncident = async (form) => {
    const created = await incidentService.create(form)
    refresh()
    setToast(`Reported INC-${created.id}${created.escalationReason ? ' — escalated' : ''}`)
  }

  // Leaving an admin screen may have changed engineers or locations, so refresh the board data.
  const navigate = (next) => {
    setView(next)
    if (next === 'board') refresh()
  }

  const handleChanged = (message) => {
    setToast(message)
    refresh()
  }

  let content
  if (user === undefined) {
    content = <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  } else if (user === null) {
    content = <SignIn onSignedIn={setUser} />
  } else {
    const pageProps = { user, incidents, visible, summary, filters, onFiltersChange: setFilters, onOpen: setOpenId }
    content = (
      <>
        <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '232px 1fr', minHeight: '100vh' }}>
          <Sidebar user={user} onSignOut={signOut} lastUpdated={lastUpdated}
            nav={user.role === 'admin' ? ADMIN_NAV : []} view={view} onNavigate={navigate} />
          <Box component="main" sx={{ px: isMobile ? 2 : 3.5, pt: isMobile ? 2.25 : 2.75, pb: 5, display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 0 }}>
            {user.role === 'admin' && view === 'board' && <AdminDashboard {...pageProps} />}
            {user.role === 'admin' && view === 'locations' && <FacilitiesAdmin onToast={setToast} />}
            {user.role === 'admin' && view === 'engineers' && <EngineersAdmin onToast={setToast} />}
            {user.role === 'engineer' && <EngineerQueue {...pageProps} />}
            {user.role === 'employee' && <EmployeeHome {...pageProps} onCreate={createIncident} />}
          </Box>
        </Box>
        {openId && (
          <IncidentDrawer
            key={openId}
            incidentId={openId}
            summary={incidents.find((i) => i.id === openId)}
            user={user}
            engineers={engineers}
            onClose={() => setOpenId(null)}
            onChanged={handleChanged}
          />
        )}
      </>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {content}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ content: { sx: { fontWeight: 600, borderRadius: 3 } } }}
      />
    </ThemeProvider>
  )
}
