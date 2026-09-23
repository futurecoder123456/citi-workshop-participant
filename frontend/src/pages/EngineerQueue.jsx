import AvailabilityChip from '../components/AvailabilityChip'
import FilterBar from '../components/FilterBar'
import KanbanBoard from '../components/KanbanBoard'
import KpiRow from '../components/KpiRow'
import PageHeader from '../components/PageHeader'
import { CATEGORIES } from '../constants'
import { ENGINEERS } from '../data/mockData'
import { engineerAvailability, formatHour, isActive } from '../utils/incidents'

/** Engineer: board limited to tickets assigned to them. */
export default function EngineerQueue({ user, incidents, visible, filters, onFiltersChange, onOpen }) {
  const profile = ENGINEERS.find((e) => e.userId === user.id)
  const availability = engineerAvailability(profile)
  const mine = incidents.filter((i) => i.assigneeId === user.id)

  return (
    <>
      <PageHeader
        eyebrow={`${CATEGORIES[profile.specialty]} engineer · shift ${formatHour(profile.shift[0])}–${formatHour(profile.shift[1])}`}
        title="My queue"
        action={<AvailabilityChip large availability={{ ...availability, label: `${availability.label} · lunch ${formatHour(profile.lunch[0])}` }} />}
      />
      <KpiRow items={[
        { label: 'Assigned to me', value: mine.filter(isActive).length, note: 'active tickets' },
        { label: 'Blocked', value: mine.filter((i) => i.status === 'blocked').length, note: 'need an external fix', alert: true },
        { label: 'Resolved this week', value: mine.filter((i) => i.status === 'resolved').length + 6, note: '▲ 2 vs last week', tone: 'good' },
        { label: 'My avg. acknowledge', value: 11, unit: 'min', note: 'Team: 18 min', tone: 'good' },
      ]} />
      <FilterBar filters={filters} onChange={onFiltersChange} />
      <KanbanBoard incidents={visible} onOpen={onOpen} />
    </>
  )
}
