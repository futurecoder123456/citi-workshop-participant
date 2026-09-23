import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { STATUS_LABELS } from '../constants'

const PATH = ['open', 'in_progress', 'resolved', 'closed']

/** Four-step progress track; a blocked ticket shows red in the "In progress" slot. */
export default function WorkflowSteps({ status }) {
  const blocked = status === 'blocked'
  const current = blocked ? 1 : PATH.indexOf(status)
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5 }}>
      {PATH.map((step, i) => {
        const key = blocked && i === 1 ? 'blocked' : step
        const reached = i <= current
        return (
          <Box key={step} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box sx={(t) => {
              const c = t.palette.fixline.status[key]
              return {
                height: 6, borderRadius: '3px',
                bgcolor: reached ? c : t.palette.fixline.surface2,
                boxShadow: i === current ? `0 0 0 3px ${alpha(c, 0.25)}` : 'none',
              }
            }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: reached ? 'text.primary' : 'text.disabled' }}>{STATUS_LABELS[key]}</Typography>
          </Box>
        )
      })}
    </Box>
  )
}
