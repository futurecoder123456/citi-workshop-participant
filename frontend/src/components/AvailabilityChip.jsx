import { Box } from '@mui/material'
import { alpha } from '@mui/material/styles'

const stateColor = {
  available: (t) => t.palette.fixline.status.resolved,
  lunch: (t) => t.palette.fixline.lunchInk,
  off: (t) => t.palette.text.disabled,
}

/** "Available" / "Lunch until 13:00" / "Off shift" pill. */
export default function AvailabilityChip({ availability, large = false }) {
  return (
    <Box
      component="span"
      sx={(t) => {
        const c = stateColor[availability.state](t)
        return {
          display: 'inline-flex', alignItems: 'center', gap: 0.6, whiteSpace: 'nowrap',
          fontSize: large ? 13 : 11, fontWeight: 700, borderRadius: 999,
          px: large ? 1.5 : 1, py: large ? 0.75 : 0.4,
          color: c,
          bgcolor: availability.state === 'off' ? t.palette.fixline.surface2 : alpha(availability.state === 'lunch' ? t.palette.fixline.lunch : c, availability.state === 'lunch' ? 0.22 : 0.13),
          '&::before': { content: '""', width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' },
        }
      }}
    >
      {availability.label}
    </Box>
  )
}
