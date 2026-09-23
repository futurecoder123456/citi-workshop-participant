import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { STATUS_LABELS, STATUS_ORDER } from '../constants'
import { fonts } from '../theme'
import IncidentCard from './IncidentCard'

/** One column per workflow status. Scrolls sideways in its own container on small screens. */
export default function KanbanBoard({ incidents, onOpen }) {
  return (
    <Box sx={{ overflowX: 'auto', pb: 0.75 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))', gap: 1.5, minWidth: 1040 }}>
        {STATUS_ORDER.map((status) => {
          const items = incidents.filter((i) => i.status === status)
          return (
            <Stack
              key={status}
              component="section"
              aria-label={STATUS_LABELS[status]}
              spacing={1}
              sx={(t) => ({ bgcolor: t.palette.fixline.surface2, borderRadius: 3.5, p: 1.25, minHeight: 180 })}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 0.5, pt: 0.5, pb: 0.25 }}>
                <Box sx={(t) => {
                  const c = t.palette.fixline.status[status]
                  return { width: 10, height: 10, borderRadius: '50%', bgcolor: c, boxShadow: `0 0 0 3px ${alpha(c, 0.22)}` }
                }} />
                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{STATUS_LABELS[status]}</Typography>
                <Typography sx={{ ml: 'auto !important', fontFamily: fonts.mono, fontSize: 12, color: 'text.disabled', fontWeight: 600 }}>
                  {items.length}
                </Typography>
              </Stack>
              {items.length
                ? items.map((i) => <IncidentCard key={i.id} incident={i} onOpen={onOpen} />)
                : <Typography sx={{ fontSize: 12, color: 'text.disabled', textAlign: 'center', py: 2 }}>Nothing here</Typography>}
            </Stack>
          )
        })}
      </Box>
    </Box>
  )
}
