import { useEffect, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { SearchField } from '../components/FilterBar'
import MyTicketCard from '../components/MyTicketCard'
import PageHeader from '../components/PageHeader'
import ReportForm from '../components/ReportForm'
import { facilityService } from '../services/directoryService'

/** Employee: report an issue and follow their own tickets. */
export default function EmployeeHome({ user, visible, filters, onFiltersChange, onOpen, onCreate }) {
  const [seats, setSeats] = useState([])

  useEffect(() => {
    facilityService.seatOptions().then(setSeats).catch(() => setSeats([]))
  }, [])

  return (
    <>
      <PageHeader eyebrow={user.email} title={`Hi ${user.name.split(' ')[0]} — what needs fixing?`} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.05fr) minmax(0, 1fr)' }, gap: 2.5, alignItems: 'start' }}>
        <ReportForm seats={seats} onSubmit={onCreate} />
        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="h2">My tickets</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{visible.length} total</Typography>
          </Stack>
          <SearchField fullWidth value={filters.query} onChange={(query) => onFiltersChange({ ...filters, query })} placeholder="Search my tickets" />
          {visible.length
            ? visible.map((i) => <MyTicketCard key={i.id} incident={i} onOpen={onOpen} />)
            : <Typography sx={{ fontSize: 13, color: 'text.disabled', textAlign: 'center', py: 3 }}>
                {filters.query ? 'No tickets match.' : "You haven't reported anything yet."}
              </Typography>}
        </Stack>
      </Box>
    </>
  )
}
