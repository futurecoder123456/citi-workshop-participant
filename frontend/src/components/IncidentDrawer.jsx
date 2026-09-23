import { useState } from 'react'
import { Box, Button, Divider, Drawer, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { CATEGORIES, REASON_REQUIRED, STATUS_LABELS } from '../constants'
import { ENGINEERS, LOCATIONS, USERS } from '../data/mockData'
import { fonts } from '../theme'
import { allowedTransitions, engineerAvailability, isActive } from '../utils/incidents'
import { CategoryTag, EscalatedFlag, PriorityTag, StatusPill, UserAvatar } from './Badges'
import Banner from './Banner'
import WorkflowSteps from './WorkflowSteps'

const sectionLabel = { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', fontWeight: 700 }

function NotesThread({ incident }) {
  return (
    <Stack spacing={1.5}>
      <SystemNote text={`Reported by ${USERS[incident.reporterId].name} · ${incident.age} ago`} />
      {incident.notes.map((n, idx) => n.system
        ? <SystemNote key={idx} text={`${n.system} · ${n.time}${n.authorId ? ` · ${USERS[n.authorId].name}` : ''}`} />
        : (
          <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 1.25 }}>
            <UserAvatar userId={n.authorId} />
            <Box sx={(t) => ({ bgcolor: t.palette.fixline.surface2, borderRadius: '4px 12px 12px 12px', px: 1.5, py: 1.1 })}>
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', fontSize: 12, color: 'text.disabled', mb: 0.4 }}>
                <Box component="b" sx={{ color: 'text.primary' }}>{USERS[n.authorId].name}</Box>
                <Box component="span" sx={{ fontFamily: fonts.mono }}>{n.time}</Box>
              </Stack>
              <Typography sx={{ fontSize: 13.5 }}>{n.body}</Typography>
            </Box>
          </Box>
        ))}
    </Stack>
  )
}

function SystemNote({ text }) {
  return (
    <Box sx={{ ml: '38px', border: '1px dashed', borderColor: 'divider', borderRadius: 2, px: 1.5, py: 0.9, fontSize: 12.5, color: 'text.secondary' }}>
      {text}
    </Box>
  )
}

/**
 * Ticket detail: workflow progress, reasons, role-aware actions, notes.
 * Mount with key={incident.id} so local form state resets per ticket.
 */
export default function IncidentDrawer({ incident, user, onClose, onStatus, onAssign, onEscalate, onNote }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [assignee, setAssignee] = useState(incident.assigneeId ?? '')
  const [error, setError] = useState('')

  const transitions = allowedTransitions(incident, user)
  const isAdmin = user.role === 'admin'
  const canEscalate = incident.reporterId === user.id && !incident.escalationReason && isActive(incident)
  const needsReasonField = transitions.some(([s]) => REASON_REQUIRED.has(s)) || canEscalate
  const canNote = incident.status !== 'closed'
    && (isAdmin || incident.assigneeId === user.id || incident.reporterId === user.id)
  const showActions = transitions.length > 0 || isAdmin || canEscalate
  const [building, floor, seat] = LOCATIONS[incident.seat]

  const run = async (action) => {
    setError('')
    try {
      await action()
      setReason('')
    } catch (e) {
      setError(e.message)
    }
  }

  const postNote = async () => {
    try {
      await onNote(note)
      setNote('')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 520 }, pt: 'env(safe-area-inset-top, 0px)', pb: 'env(safe-area-inset-bottom, 0px)' } } }}
    >
      <Stack spacing={1} sx={{ px: 2.75, pt: 2.25, pb: 1.75 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontFamily: fonts.mono, fontSize: 12, color: 'text.disabled' }}>
            INC-{incident.id} · reported {incident.age} ago by {USERS[incident.reporterId].name}
          </Typography>
          <IconButton id="drawer-close" onClick={onClose} aria-label="Close" size="small" sx={(t) => ({ bgcolor: t.palette.fixline.surface2, borderRadius: 2 })}>
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
      </Stack>
      <Divider />

      <Stack spacing={2.25} sx={{ px: 2.75, py: 2.25, overflowY: 'auto' }}>
        <WorkflowSteps status={incident.status} />
        {incident.escalationReason && <Banner status="blocked" title="Escalated">{incident.escalationReason}</Banner>}
        {incident.status === 'blocked' && <Banner status="blocked" title="Blocked because">{incident.blockedReason}</Banner>}

        <Typography sx={{ fontSize: 14, maxWidth: '62ch' }}>{incident.description}</Typography>

        <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 1, columnGap: 1.5, fontSize: 13, m: 0, '& dt': { color: 'text.disabled' }, '& dd': { m: 0 } }}>
          <dt>Location</dt>
          <dd>{building} › {floor} › {seat}</dd>
          <dt>Category</dt>
          <dd>{CATEGORIES[incident.category]}</dd>
          <dt>Asset tag</dt>
          <Box component="dd" sx={{ fontFamily: fonts.mono, fontSize: 12.5 }}>{incident.assetTag ?? '—'}</Box>
          <dt>Assignee</dt>
          <Box component="dd" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserAvatar userId={incident.assigneeId} size={22} />
            {incident.assigneeId ? USERS[incident.assigneeId].name : 'Unassigned'}
          </Box>
        </Box>

        {showActions && (
          <Stack spacing={1.25} sx={(t) => ({ bgcolor: t.palette.fixline.surface2, borderRadius: 3, p: 1.5 })}>
            <Typography sx={sectionLabel}>Next step</Typography>
            {isAdmin && (
              <Stack direction="row" spacing={1}>
                <TextField
                  id="drawer-assignee"
                  select
                  size="small"
                  label="Assign engineer"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                >
                  {ENGINEERS.map((e) => (
                    <MenuItem key={e.userId} value={e.userId}>
                      {USERS[e.userId].name} — {CATEGORIES[e.specialty]} · {engineerAvailability(e).label}
                    </MenuItem>
                  ))}
                </TextField>
                <Button id="drawer-assign" variant="contained" color="inherit" onClick={() => run(() => onAssign(Number(assignee) || null))}>Assign</Button>
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
                  onClick={() => run(() => onStatus(to, reason))}
                  sx={(t) => ({ bgcolor: t.palette.fixline.status[to], color: '#fff', '&:hover': { bgcolor: t.palette.fixline.status[to], filter: 'brightness(.95)' } })}
                >
                  {label}
                </Button>
              ))}
              {canEscalate && (
                <Button id="drawer-escalate" variant="outlined" color="inherit" onClick={() => run(() => onEscalate(reason))}>
                  Request escalation
                </Button>
              )}
            </Stack>
            {error && <Typography role="alert" sx={(t) => ({ color: t.palette.fixline.status.blocked, fontSize: 12.5, fontWeight: 600 })}>{error}</Typography>}
          </Stack>
        )}

        <Typography sx={sectionLabel}>Notes &amp; history</Typography>
        <NotesThread incident={incident} />

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
            <Button id="drawer-post-note" variant="contained" onClick={postNote} disabled={!note.trim()} sx={{ alignSelf: 'flex-end' }}>
              Post note
            </Button>
          </Stack>
        )}
        {!showActions && incident.status === 'closed' && (
          <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>This ticket is {STATUS_LABELS.closed.toLowerCase()}. No further changes can be made.</Typography>
        )}
      </Stack>
    </Drawer>
  )
}
