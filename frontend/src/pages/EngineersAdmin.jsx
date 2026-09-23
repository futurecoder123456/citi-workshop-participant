import { useEffect, useState } from 'react'
import { Box, Button, FormControlLabel, Paper, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import AvailabilityChip from '../components/AvailabilityChip'
import { UserAvatar } from '../components/Badges'
import ConfirmDialog from '../components/ConfirmDialog'
import FormDialog from '../components/FormDialog'
import PageHeader from '../components/PageHeader'
import { CATEGORIES } from '../constants'
import { engineerService } from '../services/directoryService'
import { fonts } from '../theme'
import { formatHour } from '../utils/incidents'

const SPECIALTY_OPTIONS = Object.entries(CATEGORIES).map(([value, label]) => ({ value, label }))

const HOUR_FIELDS = [
  { name: 'shift_start', label: 'Shift starts', type: 'time', half: true },
  { name: 'shift_end', label: 'Shift ends', type: 'time', half: true },
  { name: 'lunch_start', label: 'Lunch starts', type: 'time', half: true },
  { name: 'lunch_end', label: 'Lunch ends', type: 'time', half: true },
]

const CREATE_FIELDS = [
  { name: 'full_name', label: 'Full name', required: true, half: true },
  { name: 'specialty', label: 'Specialty', type: 'select', options: SPECIALTY_OPTIONS, required: true, half: true },
  { name: 'email', label: 'Work email', type: 'email', required: true, half: true, helperText: 'Must be @acme.inc' },
  { name: 'password', label: 'Initial password', type: 'password', required: true, half: true, helperText: 'At least 8 characters; share it privately' },
  ...HOUR_FIELDS,
]

const EDIT_FIELDS = [
  { name: 'full_name', label: 'Full name', required: true, half: true },
  { name: 'specialty', label: 'Specialty', type: 'select', options: SPECIALTY_OPTIONS, required: true, half: true },
  ...HOUR_FIELDS,
  { name: 'is_active', label: 'Active', type: 'select', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No (deactivated)' }], half: true },
]

const DEFAULT_HOURS = { shift_start: '09:00', shift_end: '17:00', lunch_start: '12:00', lunch_end: '13:00' }

/** Facility admin: create engineer accounts, set specialty and hours, deactivate. */
export default function EngineersAdmin({ onToast }) {
  const [engineers, setEngineers] = useState([])
  const [showInactive, setShowInactive] = useState(false)
  const [form, setForm] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [loadError, setLoadError] = useState('')

  // Bumping reloadKey re-fetches the roster (after create, edit, or deactivate).
  const [reloadKey, setReloadKey] = useState(0)
  const load = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let cancelled = false
    engineerService.list({ includeInactive: showInactive })
      .then((list) => { if (!cancelled) { setEngineers(list); setLoadError('') } })
      .catch((e) => { if (!cancelled) setLoadError(e.message) })
    return () => { cancelled = true }
  }, [showInactive, reloadKey])

  const openCreate = () => setForm({
    title: 'Add engineer',
    fields: CREATE_FIELDS,
    submitLabel: 'Create engineer',
    initialValues: DEFAULT_HOURS,
    onSubmit: async (body) => {
      const created = await engineerService.create(body)
      load()
      onToast(`${created.name} can now sign in as an engineer`)
    },
  })

  const openEdit = (e) => setForm({
    title: `Edit ${e.name}`,
    fields: EDIT_FIELDS,
    submitLabel: 'Save',
    initialValues: { full_name: e.name, specialty: e.specialty, ...e.hours, is_active: String(e.isActive) },
    onSubmit: async ({ is_active: active, ...body }) => {
      await engineerService.update(e.id, { ...body, ...(active && { is_active: active === 'true' }) })
      load()
      onToast(`${e.name} updated`)
    },
  })

  const askDeactivate = (e) => setConfirm({
    title: `Deactivate ${e.name}?`,
    message: `They'll stop appearing in the assign list, and their ${e.active} active ticket(s) will become unassigned. Their notes and history stay. You can reactivate them later.`,
    confirmLabel: 'Deactivate',
    action: async () => {
      await engineerService.deactivate(e.id)
      load()
      onToast(`${e.name} deactivated`)
    },
  })

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Engineers"
        action={<Button id="add-engineer" variant="contained" onClick={openCreate}>+ Add engineer</Button>}
      />
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Availability uses each engineer's shift and lunch hours in office time.
        </Typography>
        <FormControlLabel
          control={<Switch id="show-inactive" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
          label="Show inactive"
        />
      </Stack>
      {loadError && <Typography role="alert" color="error">{loadError}</Typography>}

      <Paper elevation={0} sx={(t) => ({ borderRadius: 3.5, boxShadow: t.palette.fixline.shadow, overflowX: 'auto' })}>
        <Table size="small" sx={{ minWidth: 760, '& th': { fontSize: 12, color: 'text.disabled', fontWeight: 600, whiteSpace: 'nowrap' } }}>
          <TableHead>
            <TableRow>
              <TableCell>Engineer</TableCell>
              <TableCell>Specialty</TableCell>
              <TableCell>Shift</TableCell>
              <TableCell>Lunch</TableCell>
              <TableCell>Right now</TableCell>
              <TableCell align="right">Active tickets</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {engineers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>No engineers yet. Add one to start assigning tickets.</TableCell>
              </TableRow>
            )}
            {engineers.map((e) => (
              <TableRow key={e.id} hover sx={{ opacity: e.isActive ? 1 : 0.55 }}>
                <TableCell>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                    <UserAvatar id={e.id} name={e.name} />
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{e.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{e.email}</Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>{CATEGORIES[e.specialty]}</TableCell>
                <TableCell sx={{ fontFamily: fonts.mono, fontSize: 12.5, whiteSpace: 'nowrap' }}>{formatHour(e.shift[0])}–{formatHour(e.shift[1])}</TableCell>
                <TableCell sx={{ fontFamily: fonts.mono, fontSize: 12.5, whiteSpace: 'nowrap' }}>{formatHour(e.lunch[0])}–{formatHour(e.lunch[1])}</TableCell>
                <TableCell><AvailabilityChip availability={e.availability} /></TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{e.active}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" color="inherit" id={`edit-engineer-${e.id}`} onClick={() => openEdit(e)}>Edit</Button>
                  {e.isActive && <Button size="small" color="error" id={`deactivate-engineer-${e.id}`} onClick={() => askDeactivate(e)}>Deactivate</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <FormDialog open={Boolean(form)} {...form} onClose={() => setForm(null)} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}
