import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { CATEGORIES } from '../constants'
import { DEMO_NOW, ENGINEERS, USERS } from '../data/mockData'
import { fonts } from '../theme'
import { engineerAvailability, formatHour, isActive } from '../utils/incidents'
import AvailabilityChip from './AvailabilityChip'
import { UserAvatar } from './Badges'
import Panel from './Panel'

const DAY_START = 6
const DAY_END = 22
const pct = (h) => `${(((h - DAY_START) / (DAY_END - DAY_START)) * 100).toFixed(2)}%`
const span = ([from, to]) => ({ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` })

/** Who is on shift now, their lunch window, and how many active tickets each holds. */
export default function EngineerPanel({ incidents }) {
  return (
    <Panel
      title="Engineers today"
      action={
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
          shift · <Box component="span" sx={(t) => ({ color: t.palette.fixline.lunch })}>■</Box> lunch
        </Typography>
      }
    >
      {ENGINEERS.map((e) => {
        const load = incidents.filter((i) => i.assigneeId === e.userId && isActive(i)).length
        return (
          <Box key={e.userId} sx={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', columnGap: 1.25, rowGap: 0.6, alignItems: 'center' }}>
            <UserAvatar userId={e.userId} />
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{USERS[e.userId].name}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                {CATEGORIES[e.specialty]} · <Box component="b" sx={{ color: 'text.primary' }}>{load}</Box> active
              </Typography>
            </Box>
            <AvailabilityChip availability={engineerAvailability(e)} />
            <Tooltip title={`Shift ${formatHour(e.shift[0])}–${formatHour(e.shift[1])}, lunch ${formatHour(e.lunch[0])}–${formatHour(e.lunch[1])}`}>
              <Box sx={(t) => ({ gridColumn: '2 / 4', position: 'relative', height: 10, borderRadius: '5px', bgcolor: t.palette.fixline.surface2 })}>
                <Box sx={(t) => ({ position: 'absolute', top: 0, bottom: 0, borderRadius: '5px', bgcolor: t.palette.fixline.shift, ...span(e.shift) })} />
                <Box sx={(t) => ({ position: 'absolute', top: 0, bottom: 0, borderRadius: '2px', bgcolor: t.palette.fixline.lunch, ...span(e.lunch) })} />
                <Box sx={(t) => ({ position: 'absolute', top: -4, bottom: -4, width: 2, borderRadius: 1, bgcolor: t.palette.fixline.now, left: pct(DEMO_NOW) })} />
              </Box>
            </Tooltip>
          </Box>
        )
      })}
      <Stack direction="row" sx={{ justifyContent: 'space-between', pl: '38px', fontFamily: fonts.mono, fontSize: 10, color: 'text.disabled' }}>
        {[6, 10, 14, 18, 22].map((h) => <span key={h}>{String(h).padStart(2, '0')}</span>)}
      </Stack>
    </Panel>
  )
}
