import { useEffect, useState } from 'react'
import AvailabilityChip from '../components/AvailabilityChip'
import FilterBar from '../components/FilterBar'
import KanbanBoard from '../components/KanbanBoard'
import KpiRow from '../components/KpiRow'
import PageHeader from '../components/PageHeader'
import { CATEGORIES } from '../constants'
import { engineerService } from '../services/directoryService'
import { formatDuration, formatHour, isActive } from '../utils/incidents'

/** Engineer: board limited to tickets assigned to them. */
export default function EngineerQueue({ user, incidents, visible, summary, filters, onFiltersChange, onOpen }) {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    engineerService.get(user.id).then(setProfile).catch(() => setProfile(null))
  }, [user.id, summary])

  const mine = incidents.filter((i) => i.assigneeId === user.id)
  const acknowledge = formatDuration(summary?.averageMinutes.acknowledge)

  return (
    <>
      <PageHeader
        eyebrow={profile
          ? `${CATEGORIES[profile.specialty]} engineer · shift ${formatHour(profile.shift[0])}–${formatHour(profile.shift[1])}`
          : 'Engineer'}
        title="My queue"
        action={profile && (
          <AvailabilityChip large availability={{ ...profile.availability, label: `${profile.availability.label} · lunch ${formatHour(profile.lunch[0])}` }} />
        )}
      />
      <KpiRow items={[
        { label: 'Assigned to me', value: mine.filter(isActive).length, note: 'active tickets' },
        { label: 'Blocked', value: mine.filter((i) => i.status === 'blocked').length, note: 'need an external fix', alert: true },
        { label: 'Waiting on reporter', value: mine.filter((i) => i.status === 'resolved').length, note: 'resolved, not yet closed' },
        { label: 'My avg. acknowledge', ...acknowledge, note: `last ${summary?.windowDays ?? 90} days` },
      ]} />
      <FilterBar filters={filters} onChange={onFiltersChange} incidents={incidents} />
      <KanbanBoard incidents={visible} onOpen={onOpen} />
    </>
  )
}
