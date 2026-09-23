import { useEffect, useState } from 'react'
import { Box, Button, ButtonBase, Chip, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import ConfirmDialog from '../components/ConfirmDialog'
import FormDialog from '../components/FormDialog'
import PageHeader from '../components/PageHeader'
import Panel from '../components/Panel'
import { facilityService } from '../services/directoryService'
import { fonts } from '../theme'

const BUILDING_FIELDS = [
  { name: 'code', label: 'Code', required: true, half: true, helperText: 'Short ID, e.g. HT' },
  { name: 'name', label: 'Name', required: true, half: true },
  { name: 'address', label: 'Address' },
]
const FLOOR_FIELDS = [
  { name: 'level', label: 'Level', type: 'number', required: true, half: true, helperText: 'Use negatives for basements' },
  { name: 'name', label: 'Name (optional)', half: true, helperText: 'e.g. Mezzanine' },
]
const SEAT_FIELDS = [{ name: 'code', label: 'Seat or room code', required: true, helperText: 'e.g. 4-112 or Room Orca' }]

const floorLabel = (f) => (f.name ? `${f.name} (level ${f.level})` : `Floor ${f.level}`)

/** Facility admin: create, rename, and remove buildings, floors, and seats. */
export default function FacilitiesAdmin({ onToast }) {
  const [buildings, setBuildings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [floors, setFloors] = useState([])
  const [form, setForm] = useState(null)        // props for FormDialog, or null
  const [confirm, setConfirm] = useState(null)  // request for ConfirmDialog, or null
  const [loadError, setLoadError] = useState('')

  // Bumping reloadKey re-runs both loading effects below.
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    facilityService.buildings()
      .then((list) => {
        if (cancelled) return
        setBuildings(list)
        // Keep the current selection if it still exists, otherwise pick the first building.
        setSelectedId((current) => (list.some((b) => b.id === current) ? current : list[0]?.id ?? null))
      })
      .catch((e) => { if (!cancelled) setLoadError(e.message) })
    return () => { cancelled = true }
  }, [reloadKey])

  useEffect(() => {
    if (!selectedId) return undefined
    let cancelled = false
    facilityService.floors(selectedId)
      // Fetch each floor's seats in parallel.
      .then((list) => Promise.all(list.map(async (f) => ({ ...f, seats: await facilityService.seats(f.id) }))))
      .then((withSeats) => { if (!cancelled) setFloors(withSeats) })
      .catch((e) => { if (!cancelled) setLoadError(e.message) })
    return () => { cancelled = true }
  }, [selectedId, reloadKey])

  // After any change, reload both levels so counts and lists stay accurate.
  const reload = (message) => {
    setReloadKey((k) => k + 1)
    onToast(message)
  }

  const openForm = (title, fields, submitLabel, save, initialValues) =>
    setForm({ title, fields, submitLabel, initialValues, onSubmit: save })

  const askDelete = (title, message, remove, done) =>
    setConfirm({ title, message, confirmLabel: 'Delete', action: async () => { await remove(); reload(done) } })

  const selected = buildings.find((b) => b.id === selectedId)

  return (
    <>
      <PageHeader
        eyebrow="Facilities"
        title="Locations"
        action={
          <Button id="add-building" variant="contained" onClick={() => openForm('Add building', BUILDING_FIELDS, 'Add building', async (body) => {
            const b = await facilityService.createBuilding(body)
            setSelectedId(b.id)
            reload(`Added ${b.name}`)
          })}>
            + Add building
          </Button>
        }
      />
      {loadError && <Typography role="alert" color="error">{loadError}</Typography>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px minmax(0, 1fr)' }, gap: 2.5, alignItems: 'start' }}>
        {/* Building list */}
        <Panel title="Buildings" subtitle={`${buildings.length} total`}>
          {buildings.length === 0 && <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>No buildings yet. Add one to get started.</Typography>}
          <Stack spacing={0.75}>
            {buildings.map((b) => {
              const active = b.id === selectedId
              return (
                <ButtonBase
                  key={b.id}
                  id={`building-${b.id}`}
                  onClick={() => setSelectedId(b.id)}
                  aria-pressed={active}
                  sx={(t) => ({
                    justifyContent: 'space-between', textAlign: 'left', borderRadius: 2.5, px: 1.5, py: 1.1, gap: 1,
                    border: '1px solid', borderColor: active ? 'primary.main' : 'divider',
                    bgcolor: active ? alpha(t.palette.primary.main, 0.08) : 'transparent',
                  })}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap>{b.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{b.floor_count} floors · {b.seat_count} seats</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: fonts.mono, fontSize: 12, color: 'text.secondary' }}>{b.code}</Typography>
                </ButtonBase>
              )
            })}
          </Stack>
        </Panel>

        {/* Selected building */}
        {selected && (
          <Stack spacing={2}>
            <Panel
              title={selected.name}
              action={
                <Stack direction="row" spacing={1}>
                  <Button id="edit-building" size="small" color="inherit" onClick={() => openForm('Edit building', BUILDING_FIELDS, 'Save', async (body) => {
                    await facilityService.updateBuilding(selected.id, body)
                    reload('Building updated')
                  }, selected)}>Edit</Button>
                  <Button id="delete-building" size="small" color="error" onClick={() => askDelete(
                    `Delete ${selected.name}?`,
                    'This removes the building with all its floors and seats. It fails if any ticket still points at one of its seats.',
                    () => facilityService.deleteBuilding(selected.id),
                    `Deleted ${selected.name}`,
                  )}>Delete</Button>
                </Stack>
              }
            >
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                <Box component="span" sx={{ fontFamily: fonts.mono }}>{selected.code}</Box>
                {selected.address ? ` · ${selected.address}` : ' · No address on file'}
              </Typography>
              <Button id="add-floor" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }}
                onClick={() => openForm(`Add floor to ${selected.name}`, FLOOR_FIELDS, 'Add floor', async (body) => {
                  await facilityService.createFloor(selected.id, body)
                  reload('Floor added')
                })}>
                + Add floor
              </Button>
            </Panel>

            {floors.length === 0 && (
              <Typography sx={{ fontSize: 13, color: 'text.disabled', px: 1 }}>No floors yet. Add a floor, then add seats to it.</Typography>
            )}
            {floors.map((f) => (
              <Panel
                key={f.id}
                title={floorLabel(f)}
                action={
                  <Stack direction="row" spacing={1}>
                    <Button size="small" color="inherit" onClick={() => openForm('Edit floor', FLOOR_FIELDS, 'Save', async (body) => {
                      await facilityService.updateFloor(f.id, body)
                      reload('Floor updated')
                    }, f)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => askDelete(
                      `Delete ${floorLabel(f)}?`,
                      `This removes the floor and its ${f.seats.length} seat(s). It fails if any ticket still points at one of them.`,
                      () => facilityService.deleteFloor(f.id),
                      'Floor deleted',
                    )}>Delete</Button>
                  </Stack>
                }
              >
                <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {f.seats.map((s) => (
                    <Chip
                      key={s.id}
                      label={s.code}
                      onClick={() => openForm('Rename seat', SEAT_FIELDS, 'Save', async (body) => {
                        await facilityService.updateSeat(s.id, body)
                        reload('Seat renamed')
                      }, s)}
                      onDelete={() => askDelete(`Delete seat ${s.code}?`, 'Tickets reported at this seat will block the delete.',
                        () => facilityService.deleteSeat(s.id), `Deleted seat ${s.code}`)}
                      sx={{ fontFamily: fonts.mono, fontWeight: 600 }}
                    />
                  ))}
                  <Chip
                    label="+ Add seat"
                    variant="outlined"
                    color="primary"
                    onClick={() => openForm(`Add seat to ${floorLabel(f)}`, SEAT_FIELDS, 'Add seat', async (body) => {
                      await facilityService.createSeat(f.id, body)
                      reload(`Added seat ${body.code}`)
                    })}
                  />
                </Stack>
              </Panel>
            ))}
          </Stack>
        )}
      </Box>

      <FormDialog open={Boolean(form)} {...form} onClose={() => setForm(null)} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}
