import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { fonts } from '../theme'
import Panel from './Panel'

/** Ranked horizontal bars. rows: [{ label, detail?, value }] */
export default function BarListPanel({ title, subtitle, rows, emptyText = 'No data yet.' }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <Panel title={title} subtitle={subtitle}>
      {rows.length === 0 && <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>{emptyText}</Typography>}
      <Stack spacing={1.1}>
        {rows.map((r) => (
          <Tooltip key={`${r.label}-${r.detail ?? ''}`} title={`${r.label}${r.detail ? ` · ${r.detail}` : ''}: ${r.value} incidents`} placement="left">
            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', fontSize: 12.5, mb: 0.5 }}>
                <span>
                  {r.label}{' '}
                  {r.detail && <Box component="small" sx={{ color: 'text.disabled' }}>{r.detail}</Box>}
                </span>
                <Typography sx={{ fontFamily: fonts.data, fontWeight: 600, fontSize: 12 }}>{r.value}</Typography>
              </Stack>
              <Box sx={(t) => ({ height: 8, borderRadius: '4px', bgcolor: t.palette.fixline.surface2, overflow: 'hidden' })}>
                <Box sx={{ height: '100%', width: `${(r.value / max) * 100}%`, bgcolor: 'primary.main', borderRadius: '0 4px 4px 0' }} />
              </Box>
            </Box>
          </Tooltip>
        ))}
      </Stack>
    </Panel>
  )
}
