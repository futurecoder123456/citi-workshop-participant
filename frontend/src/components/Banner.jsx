import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'

/** Tinted callout with a colored left edge. `status` picks the color from the status palette. */
export default function Banner({ status, title, children }) {
  return (
    <Box sx={(t) => {
      const c = t.palette.fixline.status[status]
      return { borderRadius: 2.5, px: 1.5, py: 1.25, fontSize: 13, bgcolor: alpha(c, 0.12), borderLeft: `3px solid ${c}` }
    }}>
      <Typography sx={(t) => ({ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.palette.fixline.status[status], mb: 0.25 })}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}
