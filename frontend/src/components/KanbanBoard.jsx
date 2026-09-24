import { Box, Stack, Typography } from '@mui/material'
import { STATUS_LABELS, STATUS_ORDER } from '../constants'
import { fonts } from '../theme'
import IncidentCard from './IncidentCard'

/** One column per workflow status. Scrolls sideways in its own container on small screens. */
export default function KanbanBoard({ incidents, onOpen }) {
  return (
    <Box sx={{ overflowX: 'auto', pb: 0.75 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(190px, 1fr))', gap: 1.5, minWidth: 990 }}>
        {STATUS_ORDER.map((status) => {
          const items = incidents.filter((i) => i.status === status)
          return (
            <Stack key={status} component="section" aria-label={STATUS_LABELS[status]} spacing={1.25}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 0.25 }}>
                <Box sx={(t) => ({ width: 7, height: 7, borderRadius: '50%', bgcolor: t.palette.fixline.status[status] })} />
                <Typography sx={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {STATUS_LABELS[status]}
                </Typography>
                <Typography sx={(t) => ({ ml: 'auto !important', fontFamily: fonts.data, fontSize: 11, fontWeight: 700, color: t.palette.fixline.rust })}>
                  {items.length}
                </Typography>
              </Stack>
              {items.length
                ? items.map((i) => <IncidentCard key={i.id} incident={i} onOpen={onOpen} />)
                : (
                  <Box sx={(t) => ({ border: `1px dashed ${t.palette.fixline.line}`, borderRadius: 1, py: 2, textAlign: 'center' })}>
                    <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>Nothing here</Typography>
                  </Box>
                )}
            </Stack>
          )
        })}
      </Box>
    </Box>
  )
}
