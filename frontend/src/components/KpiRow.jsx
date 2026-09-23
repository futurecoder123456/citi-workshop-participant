import { Box, Paper, Typography } from '@mui/material'

const toneColor = {
  good: (t) => t.palette.fixline.status.resolved,
  bad: (t) => t.palette.fixline.status.blocked,
  neutral: (t) => t.palette.text.disabled,
}

/**
 * Headline figures. Each item: { label, value, unit?, note, tone?: 'good'|'bad'|'neutral', alert? }.
 */
export default function KpiRow({ items }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
      {items.map((k) => (
        <Paper key={k.label} elevation={0} sx={(t) => ({ p: '14px 16px', borderRadius: 3.5, boxShadow: t.palette.fixline.shadow })}>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 500 }}>{k.label}</Typography>
          <Typography
            variant="h3"
            component="p"
            sx={(t) => ({ fontSize: 30, fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums', color: k.alert ? t.palette.fixline.status.blocked : 'text.primary' })}
          >
            {k.value}
            {k.unit && <Box component="small" sx={{ fontSize: 15, fontWeight: 600, color: 'text.disabled', ml: 0.3 }}>{k.unit}</Box>}
          </Typography>
          <Typography sx={(t) => ({ fontSize: 12, fontWeight: 600, color: toneColor[k.tone ?? 'neutral'](t) })}>{k.note}</Typography>
        </Paper>
      ))}
    </Box>
  )
}
