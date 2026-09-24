import { Avatar, Box, Chip, Tooltip } from '@mui/material'
import { CATEGORIES, STATUS_LABELS } from '../constants'

/** Solid colored pill for an incident status. */
export function StatusPill({ status, size = 'small' }) {
  return (
    <Chip
      size={size}
      label={STATUS_LABELS[status]}
      sx={(t) => ({ bgcolor: t.palette.fixline.status[status], color: '#fff', height: 22, fontSize: 11.5, fontWeight: 600, borderRadius: '6px' })}
    />
  )
}

const PRIORITY_LABELS = { low: 'LOW', medium: 'MED', high: 'HIGH', critical: 'CRITICAL' }

/** Small uppercase badge, tinted by priority (LOW / MED / HIGH / CRITICAL). */
export function PriorityTag({ priority }) {
  return (
    <Box
      component="span"
      sx={(t) => ({
        display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1,
        borderRadius: '4px', px: 0.75, py: 0.5, whiteSpace: 'nowrap',
        bgcolor: t.palette.fixline.priority[priority].bg, color: t.palette.fixline.priority[priority].fg,
      })}
    >
      {PRIORITY_LABELS[priority]}
    </Box>
  )
}

export function CategoryTag({ category }) {
  return (
    <Box component="span" sx={(t) => ({
      display: 'inline-block', fontSize: 11, fontWeight: 600, borderRadius: '4px', px: 0.75, py: 0.25,
      bgcolor: t.palette.fixline.surface2, color: 'text.secondary',
    })}>
      {CATEGORIES[category]}
    </Box>
  )
}

export function EscalatedFlag() {
  return (
    <Box component="span" sx={(t) => ({ fontSize: 11, fontWeight: 700, color: t.palette.fixline.status.blocked, whiteSpace: 'nowrap' })}>
      ▲ Escalated
    </Box>
  )
}

/** Neutral initials avatar; a dashed "?" circle when there's no user (unassigned). */
export function UserAvatar({ name, size = 28 }) {
  const initials = name?.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
  return (
    <Tooltip title={name ?? 'Unassigned'}>
      <Avatar
        sx={(t) => ({
          width: size, height: size, fontSize: Math.max(9, size * 0.36), fontWeight: 700,
          ...(name
            ? { bgcolor: t.palette.fixline.avatar.bg, color: t.palette.fixline.avatar.ink, border: `1px solid ${t.palette.fixline.line}` }
            : { bgcolor: 'transparent', color: 'text.disabled', border: '1.5px dashed', borderColor: 'divider' }),
        })}
      >
        {name ? initials : '?'}
      </Avatar>
    </Tooltip>
  )
}
