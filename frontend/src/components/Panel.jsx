import { Paper, Stack, Typography } from '@mui/material'

/** Raised surface with a heading row; the building block for dashboard panels. */
export default function Panel({ title, subtitle, action, children, sx }) {
  return (
    <Paper
      elevation={0}
      sx={[(t) => ({ p: 2, borderRadius: 1.25, boxShadow: t.palette.fixline.shadow, display: 'flex', flexDirection: 'column', gap: 1.5 }), ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {(title || action) && (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="h2">{title}</Typography>
          {action ?? (subtitle && <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{subtitle}</Typography>)}
        </Stack>
      )}
      {children}
    </Paper>
  )
}
