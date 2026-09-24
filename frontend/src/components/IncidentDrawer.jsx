import { useEffect, useState } from 'react'
import { Box, Button, CircularProgress, Divider, Drawer, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { CATEGORIES, PRIORITIES, REASON_REQUIRED, STATUS_LABELS } from '../constants'
import { incidentService } from '../services/incidentService'
import { fonts } from '../theme'
import { allowedTransitions, formatWhen, isActive, timeAgo, ticketId } from '../utils/incidents'
import { CategoryTag, EscalatedFlag, PriorityTag, StatusPill, UserAvatar } from './Badges'
import Banner from './Banner'
import ConfirmDialog from './ConfirmDialog'
import FormDialog from './FormDialog'
import WorkflowSteps from './WorkflowSteps'

const sectionLabel = { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontWeight: 700 }
const linkButton = { minWidth: 0, px: 0.75, py: 0, fontSize: 12, fontWeight: 600 }

const EDIT_FIELDS = [
  { name: 'title', label: 'Title', required: true },
  { name: 'category', label: 'Category', type: 'select', required: true, half: true, options: Object.entries(CATEGORIES).map(([value, label]) => ({ value, label })) },
  { name: 'priority', label: 'Priority', type: 'select', required: true, half: true, options: PRIORITIES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) })) },
  { name: 'description', label: 'Details', required: true },
  { name: 'asset_tag', label: 'Asset tag', helperText: 'Optional' },
]
const NOTE_FIELDS = [{ name: 'body', label: 'Note', required: true }]

/** Notes and status events in time order. Note owners get Edit/Delete links (admins can delete any note). */
function Timeline({ items, canEdit, canDelete, onEdit, onDelete }) {
  return (
    <Stack spacing={1.5}>
      {items.map((item) => item.kind === 'event'
        ? (
          <Box key={item.key} sx={{ ml: '38px', border: '1px dashed', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.9, fontSize: 12.5, color: 'text.secondary' }}>
            {item.text} · {formatWhen(item.at)} · {item.authorName}
          </Box>
        )
        : (
          <Box key={item.key} sx={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 1.25 }}>
            <UserAvatar id={item.authorId} name={item.authorName} />
            <Box sx={(t) => ({ bgcolor: t.palette.fixline.surface2, borderRadius: '4px 12px 12px 12px', px: 1.5, py: 1.1 })}>
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', fontSize: 12, color: 'text.disabled', mb: 0.4 }}>
                <Box component="b" sx={{ color: 'text.primary' }}>{item.authorName}</Box>
                <Box component="span" sx={{ fontFamily: fonts.data }}>{formatWhen(item.at)}</Box>
              </Stack>
              <Typography sx={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{item.text}</Typography>
              {(canEdit(item) || canDelete(item)) && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, ml: -0.75, alignItems: 'center' }}>
                  {item.edited && <Typography sx={{ fontSize: 11, color: 'text.disabled', px: 0.75 }}>Edited</Typography>}
                  {canEdit(item) && <Button size="small" sx={linkButton} onClick={() => onEdit(item)}>Edit</Button>}
                  {canDelete(item) && <Button size="small" color="error" sx={linkButton} onClick={() => onDelete(item)}>Delete</Button>}
                </Stack>
              )}
            </Box>
          </Box>
        ))}
    </Stack>
  )
}

/**
 * Ticket detail: loads the full incident (notes + history), shows role-aware actions, and saves through the API.
 * Mount with key={incidentId} so local form state resets per ticket.
 */
export default function IncidentDrawer({ incidentId, summary, user, engineers, onClose, onChanged }) {
  const [incident, setIncident] = useState(summary)
  const [loadError, setLoadError] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [assignee, setAssignee] = useState(summary?.assigneeId ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(null)        // FormDialog props, or null
  const [confirm, setConfirm] = useState(null)  // ConfirmDialog request, or null

  useEffect(() => {
    let cancelled = false
    incidentService.get(incidentId)
      .then((detail) => { if (!cancelled) setIncident(detail) })
      .catch((e) => { if (!cancelled) setLoadError(e.message) })
    return () => { cancelled = true }
  }, [incidentId])

  const run = async (action, toast, { clearReason = true } = {}) => {
    setError('')
    setBusy(true)
    try {
      const updated = await action()
      setIncident(updated)
      if (clearReason) setReason('')
      onChanged(toast(updated))
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const drawerProps = {
    anchor: 'right', open: true, onClose,
    slotProps: { paper: { sx: { width: { xs: '100%', sm: 520 }, pt: 'env(safe-area-inset-top, 0px)', pb: 'env(safe-area-inset-bottom, 0px)' } } },
  }

  if (!incident) {
    return (
      <Drawer {...drawerProps}>
        <Stack spacing={2} sx={{ p: 3, alignItems: 'center' }}>
          {loadError ? <Typography role="alert">{loadError}</Typography> : <CircularProgress size={28} />}
          <Button onClick={onClose}>Close</Button>
        </Stack>
      </Drawer>
    )
  }

  const transitions = allowedTransitions(incident, user)
  const isAdmin = user.role === 'admin'
  const canEscalate = incident.reporterId === user.id && !incident.escalationReason && isActive(incident)
  const needsReasonField = transitions.some(([s]) => REASON_REQUIRED.has(s)) || canEscalate
  const canNote = incident.status !== 'closed'
    && (isAdmin || incident.assigneeId === user.id || incident.reporterId === user.id)
  const showActions = transitions.length > 0 || (isAdmin && incident.status !== 'closed') || canEscalate
  const { building, floor, seat } = incident.location
  // Mirrors the backend rules; the API still enforces them.
  const canEditTicket = incident.status !== 'closed' && (isAdmin || (incident.reporterId === user.id && incident.status === 'open'))
  const noteIsOpen = incident.status !== 'closed'

  const editTicket = () => setForm({
    title: `Edit ${ticketId(incident.id)}`,
    fields: EDIT_FIELDS,
    submitLabel: 'Save changes',
    initialValues: { title: incident.title, category: incident.category, priority: incident.priority, description: incident.description, asset_tag: incident.assetTag ?? '' },
    onSubmit: async (body) => {
      const updated = await incidentService.update(incident.id, { asset_tag: null, ...body })
      setIncident(updated)
      onChanged(`${ticketId(updated.id)} updated`)
    },
  })

  const deleteTicket = () => setConfirm({
    title: `Delete ${ticketId(incident.id)}?`,
    message: 'This permanently removes the ticket with its notes and history. It no longer counts in reports.',
    action: async () => {
      await incidentService.remove(incident.id)
      onChanged(`${ticketId(incident.id)} deleted`)
      onClose()
    },
  })

  const editNote = (item) => setForm({
    title: 'Edit note',
    fields: NOTE_FIELDS,
    initialValues: { body: item.text },
    onSubmit: async ({ body }) => {
      setIncident(await incidentService.updateNote(incident.id, item.noteId, body))
      onChanged('Note updated')
    },
  })

  const deleteNote = (item) => setConfirm({
    title: 'Delete this note?',
    message: 'The reporter and engineer will no longer see it.',
    action: async () => {
      setIncident(await incidentService.deleteNote(incident.id, item.noteId))
      onChanged('Note deleted')
    },
  })

  return (
    <Drawer {...drawerProps}>
      <Stack spacing={1} sx={{ px: 2.75, pt: 2.25, pb: 1.75 }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontFamily: fonts.data, fontSize: 12, color: 'text.disabled' }}>
            {ticketId(incident.id)} · reported {timeAgo(incident.createdAt)} ago by {incident.reporterName}
          </Typography>
          <IconButton id="drawer-close" onClick={onClose} aria-label="Close" size="small" sx={(t) => ({ bgcolor: t.palette.fixline.surface2, borderRadius: 1 })}>
            <Box component="span" sx={{ fontSize: 18, lineHeight: 1, width: 18 }}>×</Box>
          </IconButton>
        </Stack>
        <Typography variant="h3" component="h2" id="drawer-title">{incident.title}</Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusPill status={incident.status} />
          <PriorityTag priority={incident.priority} />
          <CategoryTag category={incident.category} />
          {incident.escalationReason && <EscalatedFlag />}
        </Stack>
        {(canEditTicket || isAdmin) && (
          <Stack direction="row" spacing={0.5} sx={{ ml: -0.75 }}>
            {canEditTicket && <Button id="drawer-edit" size="small" sx={linkButton} onClick={editTicket}>Edit details</Button>}
            {isAdmin && <Button id="drawer-delete" size="small" color="error" sx={linkButton} onClick={deleteTicket}>Delete ticket</Button>}
          </Stack>
        )}
      </Stack>
      <Divider />

      <Stack spacing={2.25} sx={{ px: 2.75, py: 2.25, overflowY: 'auto' }}>
        <WorkflowSteps status={incident.status} />
        {incident.escalationReason && <Banner status="blocked" title="Escalated">{incident.escalationReason}</Banner>}
        {incident.status === 'blocked' && incident.blockedReason && <Banner status="blocked" title="Blocked because">{incident.blockedReason}</Banner>}

        <Typography sx={{ fontSize: 14, maxWidth: '62ch', whiteSpace: 'pre-wrap' }}>{incident.description}</Typography>

        <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 1, columnGap: 1.5, fontSize: 13, m: 0, '& dt': { color: 'text.disabled' }, '& dd': { m: 0 } }}>
          <dt>Location</dt>
          <dd>{building} › {floor} › {seat}</dd>
          <dt>Category</dt>
          <dd>{CATEGORIES[incident.category]}</dd>
          <dt>Asset tag</dt>
          <Box component="dd" sx={{ fontFamily: fonts.data, fontSize: 12.5 }}>{incident.assetTag ?? '—'}</Box>
          <dt>Assignee</dt>
          <Box component="dd" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserAvatar id={incident.assigneeId} name={incident.assigneeName} size={22} />
            {incident.assigneeName ?? 'Unassigned'}
          </Box>
        </Box>

        {showActions && (
          <Stack spacing={1.25} sx={(t) => ({ bgcolor: t.palette.fixline.surface2, borderRadius: 1.25, p: 1.5 })}>
            <Typography sx={sectionLabel}>Next step</Typography>
            {isAdmin && incident.status !== 'closed' && (
              <Stack direction="row" spacing={1}>
                <TextField
                  id="drawer-assignee"
                  select
                  size="small"
                  label="Assign engineer"
                  value={engineers.some((e) => e.id === assignee) ? assignee : ''}
                  onChange={(e) => setAssignee(e.target.value)}
                  disabled={engineers.length === 0}
                  helperText={engineers.length === 0 ? 'No active engineers yet' : undefined}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                >
                  {engineers.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.name} — {CATEGORIES[e.specialty]} · {e.availability.label}
                    </MenuItem>
                  ))}
                </TextField>
                <Button id="drawer-assign" variant="contained" color="inherit" disabled={busy}
                  onClick={() => run(() => incidentService.assign(incident.id, Number(assignee) || null), (u) => `${ticketId(u.id)} assigned to ${u.assigneeName}`)}>
                  Assign
                </Button>
              </Stack>
            )}
            {needsReasonField && (
              <TextField
                id="drawer-reason"
                label="Reason or resolution note"
                placeholder="Required when blocking, resolving, or escalating"
                multiline
                minRows={2}
                size="small"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
              />
            )}
            <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
              {transitions.map(([to, label]) => (
                <Button
                  key={to}
                  id={`drawer-go-${to}`}
                  variant="contained"
                  disabled={busy}
                  onClick={() => run(() => incidentService.changeStatus(incident.id, to, reason.trim()), (u) => `${ticketId(u.id)} moved to ${STATUS_LABELS[u.status]}`)}
                  sx={(t) => ({ bgcolor: t.palette.fixline.status[to], color: '#fff', '&:hover': { bgcolor: t.palette.fixline.status[to], filter: 'brightness(.95)' } })}
                >
                  {label}
                </Button>
              ))}
              {canEscalate && (
                <Button id="drawer-escalate" variant="outlined" color="inherit" disabled={busy}
                  onClick={() => run(() => incidentService.escalate(incident.id, reason.trim()), (u) => `Escalation requested for ${ticketId(u.id)}`)}>
                  Request escalation
                </Button>
              )}
            </Stack>
            {error && <Typography role="alert" sx={(t) => ({ color: t.palette.fixline.status.blocked, fontSize: 12.5, fontWeight: 600 })}>{error}</Typography>}
          </Stack>
        )}

        <Typography sx={sectionLabel}>Notes &amp; history</Typography>
        {incident.timeline
          ? (
            <Timeline
              items={incident.timeline}
              canEdit={(item) => noteIsOpen && item.authorId === user.id}
              canDelete={(item) => item.authorId === user.id || isAdmin}
              onEdit={editNote}
              onDelete={deleteNote}
            />
          )
          : <CircularProgress size={20} sx={{ alignSelf: 'center' }} />}

        {canNote && (
          <Stack spacing={1}>
            <TextField
              id="drawer-note"
              label="Add a note"
              placeholder="Visible to the reporter and the assigned engineer"
              multiline
              minRows={2}
              size="small"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button id="drawer-post-note" variant="contained" disabled={!note.trim() || busy} sx={{ alignSelf: 'flex-end' }}
              onClick={async () => {
                if (await run(() => incidentService.addNote(incident.id, note.trim()), () => 'Note posted', { clearReason: false })) setNote('')
              }}>
              Post note
            </Button>
          </Stack>
        )}
        {incident.status === 'closed' && (
          <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>This ticket is closed. No further changes can be made.</Typography>
        )}
      </Stack>
      <FormDialog open={Boolean(form)} {...form} onClose={() => setForm(null)} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </Drawer>
  )
}
