import { Box, Stack, Typography } from '@mui/material'

export default function PageHeader({ eyebrow, title, action }) {
  return (
    <Stack direction="row" useFlexGap spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <Box>
        <Typography variant="overline" component="div" sx={{ color: 'text.disabled' }}>{eyebrow}</Typography>
        <Typography variant="h1">{title}</Typography>
      </Box>
      {action}
    </Stack>
  )
}
