import { Box, Typography } from '@mui/material'

const toneColor = {
  good: (t) => t.palette.fixline.status.resolved,
  bad: (t) => t.palette.fixline.status.blocked,
  neutral: (t) => t.palette.text.disabled,
}

/**
 * Flat stats strip: small uppercase label over a large figure, separated by hairlines.
 * Each item: { label, value, unit?, note?, tone?: 'good'|'bad'|'neutral', alert? }.
 */
export default function KpiRow({ items }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: `repeat(${items.length}, minmax(0, 1fr))` }, rowGap: 2 }}>
      {items.map((k, i) => (
        <Box key={k.label} sx={(t) => ({
          pl: { xs: i % 2 ? 2.5 : 0, md: i ? 2.5 : 0 },
          borderLeft: { xs: i % 2 ? `1px solid ${t.palette.fixline.line}` : 'none', md: i ? `1px solid ${t.palette.fixline.line}` : 'none' },
        })}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>{k.label}</Typography>
          <Typography component="p" sx={(t) => ({
            fontSize: 24, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.02em', mt: 0.25,
            color: k.alert && Number(k.value) > 0 ? t.palette.fixline.status.blocked : 'text.primary',
          })}>
            {k.value}
            {k.unit && <Box component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}>{k.unit === 'min' ? 'm' : k.unit}</Box>}
          </Typography>
          {k.note && <Typography sx={(t) => ({ fontSize: 11.5, mt: 0.25, color: toneColor[k.tone ?? 'neutral'](t) })}>{k.note}</Typography>}
        </Box>
      ))}
    </Box>
  )
}
