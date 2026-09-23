import { Avatar, Box, Chip, Tooltip } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { CATEGORIES, STATUS_LABELS } from '../constants'
import { USERS } from '../data/mockData'

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

/** Initials avatar; a dashed "?" circle when unassigned. */
export function UserAvatar({ userId, size = 28 }) {
  const user = userId ? USERS[userId] : null
  const initials = user?.name.split(' ').map((p) => p[0]).join('')
  return (
    <Tooltip title={user ? user.name : 'Unassigned'}>
      <Avatar
        sx={{
          width: size, height: size, fontSize: size * 0.38, fontWeight: 700,
          ...(user
            ? { bgcolor: user.color, color: '#fff' }
            : { bgcolor: 'transparent', color: 'text.disabled', border: '1.5px dashed', borderColor: 'divider' }),
        }}
      >
        {user ? initials : '?'}
      </Avatar>
    </Tooltip>
  )
}
