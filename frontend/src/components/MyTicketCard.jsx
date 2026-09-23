import { Card, CardActionArea, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { fonts } from '../theme'
import { timeAgo } from '../utils/incidents'
import { StatusPill, UserAvatar } from './Badges'
import Banner from './Banner'
import WorkflowSteps from './WorkflowSteps'

/** Employee-facing ticket summary with progress track. */
export default function MyTicketCard({ incident, onOpen }) {
  const { building, floor, seat } = incident.location
  return (
    <Card elevation={0} sx={(t) => ({ borderRadius: 3.5, boxShadow: t.palette.fixline.shadow, border: '1px solid transparent', '&:hover': { borderColor: alpha(t.palette.primary.main, 0.4) } })}>
      <CardActionArea id={`my-ticket-${incident.id}`} onClick={() => onOpen(incident.id)} sx={{ p: 2 }}>
        <Stack spacing={1.25}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontFamily: fonts.mono, fontSize: 12, color: 'text.disabled' }}>INC-{incident.id} · {timeAgo(incident.createdAt)} ago</Typography>
            <StatusPill status={incident.status} />
          </Stack>
          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{incident.title}</Typography>
          <WorkflowSteps status={incident.status} />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'text.disabled' }}>
            <span>{building} › {floor} › {seat}</span>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flex: 'none' }}>
              <span>{incident.assigneeName ?? 'Awaiting assignment'}</span>
              <UserAvatar id={incident.assigneeId} name={incident.assigneeName} size={22} />
            </Stack>
          </Stack>
          {incident.status === 'resolved' && (
            <Banner status="resolved" title="Needs your confirmation">The engineer marked this resolved. Open it to confirm or reopen.</Banner>
          )}
        </Stack>
      </CardActionArea>
    </Card>
  )
}
