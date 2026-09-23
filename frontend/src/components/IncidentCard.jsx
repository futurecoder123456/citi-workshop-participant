import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { fonts } from '../theme'
import { timeAgo } from '../utils/incidents'
import { CategoryTag, EscalatedFlag, PriorityTag, UserAvatar } from './Badges'

export default function IncidentCard({ incident, onOpen }) {
  const escalated = Boolean(incident.escalationReason)
  return (
    <Card
      elevation={0}
      sx={(t) => ({
        border: '1px solid transparent',
        boxShadow: '0 1px 2px rgba(17,22,46,.06)',
        transition: 'transform .15s, border-color .15s',
        '&:hover': { transform: 'translateY(-1px)', borderColor: alpha(t.palette.primary.main, 0.45) },
        ...(escalated && {
          background: `linear-gradient(180deg, ${alpha(t.palette.fixline.status.blocked, 0.09)}, ${t.palette.background.paper} 60%)`,
        }),
      })}
    >
      <CardActionArea id={`incident-card-${incident.id}`} onClick={() => onOpen(incident.id)} sx={{ p: 1.4 }}>
        <Stack spacing={0.9}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontFamily: fonts.mono, fontSize: 11.5, color: 'text.disabled' }}>INC-{incident.id}</Typography>
            {escalated ? <EscalatedFlag /> : <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{timeAgo(incident.createdAt)} ago</Typography>}
          </Stack>
          <Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.3 }}>{incident.title}</Typography>
          <Stack direction="row" spacing={0.6}>
            <PriorityTag priority={incident.priority} />
            <CategoryTag category={incident.category} />
          </Stack>
          {incident.status === 'blocked' && incident.blockedReason && (
            <Typography sx={(t) => ({ fontSize: 12, color: t.palette.fixline.status.blocked })}>⏸ {incident.blockedReason}</Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 12, color: 'text.disabled', minWidth: 0 }}>
              {incident.location.building} · <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 11 }}>{incident.location.seat}</Box>
            </Typography>
            <UserAvatar id={incident.assigneeId} name={incident.assigneeName} size={22} />
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  )
}
