import { Box, Card, CardActionArea, Divider, Stack, Typography } from '@mui/material'
import { CATEGORIES } from '../constants'
import { fonts } from '../theme'
import { ticketId, timeAgo } from '../utils/incidents'
import { PriorityTag, UserAvatar } from './Badges'

const meta = { fontSize: 11.5, color: 'text.secondary', lineHeight: 1.45 }

/** "a · b · c" with visible spacing around the dots (this font's space is narrow). */
function Dotted({ parts }) {
  return parts.filter(Boolean).map((part, i) => (
    <span key={i}>{i > 0 && <Box component="span" sx={{ mx: 0.6, opacity: 0.7 }}>·</Box>}{part}</span>
  ))
}

/** Board card: ID + priority, title, location and asset lines, a status note, assignee footer. */
export default function IncidentCard({ incident, onOpen }) {
  const { building, floor, seat } = incident.location
  const firstName = incident.assigneeName?.split(' ')[0]
  return (
    <Card elevation={0} sx={(t) => ({
      borderRadius: 1, boxShadow: t.palette.fixline.shadow, transition: 'box-shadow .15s',
      '&:hover': { boxShadow: `0 0 0 1px ${t.palette.primary.main}` },
    })}>
      <CardActionArea id={`incident-card-${incident.id}`} onClick={() => onOpen(incident.id)} sx={{ px: 1.5, pt: 1.25, pb: 1 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
          <Typography sx={(t) => ({ fontFamily: fonts.data, fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', color: t.palette.fixline.rust })}>
            {ticketId(incident.id)}
          </Typography>
          <PriorityTag priority={incident.priority} />
        </Stack>

        <Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.3, mb: 0.75 }}>{incident.title}</Typography>

        <Typography sx={meta}><Dotted parts={[building, floor, seat]} /></Typography>
        <Typography sx={meta}><Dotted parts={[incident.assetTag, CATEGORIES[incident.category]]} /></Typography>

        {incident.escalationReason && incident.status !== 'closed' && (
          <Stack direction="row" spacing={0.75} sx={(t) => ({ mt: 1, alignItems: 'center', fontSize: 11.5, fontWeight: 600, color: t.palette.fixline.status.in_progress })}>
            <Box component="span" aria-hidden sx={{ fontSize: 12 }}>⚠</Box>
            <span>Escalated</span>
          </Stack>
        )}
        {incident.status === 'blocked' && incident.blockedReason && (
          <Typography sx={(t) => ({ mt: 1, fontSize: 11.5, color: t.palette.fixline.rust, lineHeight: 1.4 })}>{incident.blockedReason}</Typography>
        )}
        {incident.status === 'resolved' && (
          <Typography sx={{ mt: 1, fontSize: 11.5, color: 'text.secondary' }}>Waiting for reporter to confirm</Typography>
        )}

        <Divider sx={{ my: 1 }} />
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {firstName ? (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
              <UserAvatar name={incident.assigneeName} size={20} />
              <Typography sx={{ fontSize: 12, fontWeight: 500 }} noWrap>{firstName}</Typography>
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Unassigned</Typography>
          )}
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>{timeAgo(incident.createdAt)}</Typography>
        </Stack>
      </CardActionArea>
    </Card>
  )
}
