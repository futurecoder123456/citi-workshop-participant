import { Avatar, Box, Chip, Tooltip } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { CATEGORIES, STATUS_LABELS } from '../constants'

/** Solid colored pill for an incident status. */
export function StatusPill({ status, size = 'small' }) {
  return (
    <Chip
      size={size}
      label={STATUS_LABELS[status]}
      sx={(t) => ({ bgcolor: t.palette.fixline.status[status], color: '#fff', height: 22, fontSize: 11.5, fontWeight: 700 })}
    />
  )
}

const tagSx = (color) => (t) => ({
  display: 'inline-flex', alignItems: 'center', gap: 0.6,
  fontSize: 11, fontWeight: 600, borderRadius: '6px', px: 0.9, py: 0.2,
  bgcolor: alpha(typeof color === 'function' ? color(t) : color, 0.14),
  color: 'text.primary', textTransform: 'capitalize', lineHeight: 1.6,
})

export function PriorityTag({ priority }) {
  return (
    <Box component="span" sx={tagSx((t) => t.palette.fixline.priority[priority])}>
      <Box component="span" sx={(t) => ({ width: 6, height: 6, borderRadius: '50%', bgcolor: t.palette.fixline.priority[priority] })} />
      {priority}
    </Box>
  )
}

export function CategoryTag({ category }) {
  return <Box component="span" sx={tagSx((t) => t.palette.primary.main)}>{CATEGORIES[category]}</Box>
}

export function EscalatedFlag() {
  return (
    <Box component="span" sx={(t) => ({ fontSize: 11, fontWeight: 700, color: t.palette.fixline.status.blocked, whiteSpace: 'nowrap' })}>
      ▲ Escalated
    </Box>
  )
}

const AVATAR_COLORS = ['#6B4EF5', '#2F6BEA', '#16A36F', '#E4A11B', '#E3455A', '#0E9AA7', '#C2410C']

/** Initials avatar colored by user id; a dashed "?" circle when there's no user (unassigned). */
export function UserAvatar({ id, name, size = 28 }) {
  const initials = name?.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
  return (
    <Tooltip title={name ?? 'Unassigned'}>
      <Avatar
        sx={{
          width: size, height: size, fontSize: size * 0.38, fontWeight: 700,
          ...(name
            ? { bgcolor: AVATAR_COLORS[(id ?? 0) % AVATAR_COLORS.length], color: '#fff' }
            : { bgcolor: 'transparent', color: 'text.disabled', border: '1.5px dashed', borderColor: 'divider' }),
        }}
      >
        {name ? initials : '?'}
      </Avatar>
    </Tooltip>
  )
}
