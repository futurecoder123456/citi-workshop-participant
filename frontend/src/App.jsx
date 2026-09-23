import { useEffect, useMemo, useState } from 'react'
import { Box, CssBaseline, Snackbar } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import IncidentDrawer from './components/IncidentDrawer'
import Sidebar from './components/Sidebar'
import { STATUS_LABELS } from './constants'
import { USERS } from './data/mockData'
import { useBreakpoints } from './hooks/useBreakpoints'
import AdminDashboard from './pages/AdminDashboard'
import EmployeeHome from './pages/EmployeeHome'
import EngineerQueue from './pages/EngineerQueue'
import { incidentService } from './services/incidentService'
import { buildTheme } from './theme'
import { filterIncidents } from './utils/incidents'

const NO_FILTERS = { query: '', category: null, priority: null, escalatedOnly: false }

export default function App() {
  const { prefersDark, isMobile } = useBreakpoints()
  const theme = useMemo(() => buildTheme(prefersDark ? 'dark' : 'light'), [prefersDark])

  const [personaId, setPersonaId] = useState(1)
  const [incidents, setIncidents] = useState([])
  const [filters, setFilters] = useState(NO_FILTERS)
  const [openId, setOpenId] = useState(null)
  const [toast, setToast] = useState('')

  const user = USERS[personaId]
  const visible = useMemo(() => filterIncidents(incidents, user, filters), [incidents, user, filters])
  const openIncident = incidents.find((i) => i.id === openId)

  useEffect(() => {
    incidentService.list().then(setIncidents)
  }, [])

  const refresh = async () => setIncidents(await incidentService.list())

  const switchPersona = (id) => {
    setPersonaId(id)
    setFilters(NO_FILTERS)
    setOpenId(null)
  }

  // Each action throws on validation errors so the drawer/form can show them inline.
  const actions = {
    onStatus: async (to, reason) => {
      await incidentService.changeStatus(user, openId, to, reason)
      await refresh()
      setToast(`INC-${openId} moved to ${STATUS_LABELS[to]}`)
    },
    onAssign: async (engineerId) => {
      await incidentService.assign(user, openId, engineerId)
      await refresh()
      setToast(`INC-${openId} assigned to ${USERS[engineerId].name}`)
    },
    onEscalate: async (reason) => {
      await incidentService.escalate(user, openId, reason)
      await refresh()
      setToast(`Escalation requested for INC-${openId}`)
    },
    onNote: async (body) => {
      await incidentService.addNote(user, openId, body)
      await refresh()
      setToast('Note posted')
    },
  }

  const createIncident = async (form) => {
    const created = await incidentService.create(user, form)
    await refresh()
    setToast(`Reported INC-${created.id}${created.escalationReason ? ' — escalated' : ''}`)
  }

  const pageProps = { user, incidents, visible, filters, onFiltersChange: setFilters, onOpen: setOpenId }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '232px 1fr', minHeight: '100vh' }}>
        <Sidebar personaId={personaId} onPersonaChange={switchPersona} />
        <Box component="main" sx={{ px: isMobile ? 2 : 3.5, pt: isMobile ? 2.25 : 2.75, pb: 5, display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 0 }}>
          {user.role === 'admin' && <AdminDashboard {...pageProps} onToast={setToast} />}
          {user.role === 'engineer' && <EngineerQueue {...pageProps} />}
          {user.role === 'employee' && <EmployeeHome {...pageProps} onCreate={createIncident} />}
        </Box>
      </Box>

      {openIncident && (
        <IncidentDrawer key={openIncident.id} incident={openIncident} user={user} onClose={() => setOpenId(null)} {...actions} />
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2600}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ content: { sx: { fontWeight: 600, borderRadius: 3 } } }}
      />
    </ThemeProvider>
  )
}
