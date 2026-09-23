// Sample data used until the backend services exist. Shapes follow the planned API responses.

// Demo clock: Wednesday 12:15, so engineer availability shows a mix of states.
export const DEMO_NOW = 12.25
export const DEMO_TIME_LABEL = 'Wed 23 Sep · 12:15'

export const USERS = {
  1: { id: 1, name: 'Jordan Blake', role: 'admin', email: 'jordan.blake@acme.inc', color: '#6B4EF5' },
  2: { id: 2, name: 'Sam Rivera', role: 'employee', email: 'sam.rivera@acme.inc', color: '#0E9AA7' },
  3: { id: 3, name: 'Marcus Chen', role: 'engineer', email: 'marcus.chen@acme.inc', color: '#2F6BEA' },
  4: { id: 4, name: 'Priya Nair', role: 'engineer', email: 'priya.nair@acme.inc', color: '#16A36F' },
  5: { id: 5, name: 'Dana Okafor', role: 'engineer', email: 'dana.okafor@acme.inc', color: '#E4A11B' },
  6: { id: 6, name: 'Leo Alvarez', role: 'engineer', email: 'leo.alvarez@acme.inc', color: '#E3455A' },
  7: { id: 7, name: 'Kim Park', role: 'engineer', email: 'kim.park@acme.inc', color: '#C2410C' },
  8: { id: 8, name: 'Ava Thompson', role: 'employee', email: 'ava.thompson@acme.inc', color: '#2F6BEA' },
  9: { id: 9, name: 'Ravi Menon', role: 'employee', email: 'ravi.menon@acme.inc', color: '#16A36F' },
}

// Hours as decimals (13.5 = 13:30), matching engineer_profiles shift/lunch columns.
export const ENGINEERS = [
  { userId: 3, specialty: 'software', shift: [8, 16], lunch: [13, 14] },
  { userId: 4, specialty: 'hardware', shift: [9, 17], lunch: [12, 13] },
  { userId: 5, specialty: 'facility', shift: [10, 18], lunch: [14, 15] },
  { userId: 6, specialty: 'hardware', shift: [6, 14], lunch: [11, 11.5] },
  { userId: 7, specialty: 'software', shift: [14, 22], lunch: [18, 18.5] },
]

export const PERSONAS = [
  { userId: 1, title: 'Facility Admin' },
  { userId: 3, title: 'Engineer' },
  { userId: 2, title: 'Employee' },
]

// Seat id -> [building, floor, seat]
export const LOCATIONS = {
  'HT-4-112': ['Harbor Tower', 'Floor 4', 'Seat 4-112'],
  'HT-4-118': ['Harbor Tower', 'Floor 4', 'Seat 4-118'],
  'HT-7-ORCA': ['Harbor Tower', 'Floor 7', 'Room Orca'],
  'HT-2-018': ['Harbor Tower', 'Floor 2', 'Seat 2-018'],
  'RA-1-EAST': ['Riverside Annex', 'Floor 1', 'East entrance'],
  'RA-3-204': ['Riverside Annex', 'Floor 3', 'Seat 3-204'],
  'IL-2-BAY': ['Innovation Lab', 'Floor 2', 'Lab bay B'],
}

export const INCIDENTS = [
  {
    id: 1042, title: 'Monitor flickering, burning smell', category: 'hardware', priority: 'critical', status: 'in_progress',
    description: "Screen flickers then goes black. There's an extreme burning smell coming from the back of the monitor.",
    seat: 'HT-4-112', assetTag: 'MON-0042', reporterId: 2, assigneeId: 6, age: '38m',
    escalationReason: 'Auto-flagged — report contains “extreme”: “extreme burning smell coming from the back of the monitor”',
    notes: [
      { authorId: 1, time: '12:02', system: 'Status Open → In progress' },
      { authorId: 6, time: '12:05', body: 'Unplugged the monitor and swapped to a spare. Pulling MON-0042 for inspection.' },
    ],
  },
  {
    id: 1041, title: 'VPN drops every 10 minutes', category: 'software', priority: 'high', status: 'blocked',
    description: "GlobalProtect disconnects roughly every ten minutes since Monday's update.",
    seat: 'RA-3-204', assetTag: 'LT-2231', reporterId: 8, assigneeId: 3, age: '1d',
    blockedReason: 'Waiting on network team firewall rule change (CHG-5510)',
    notes: [{ authorId: 3, time: 'Tue 16:20', body: 'Reproduced on two laptops. Needs firewall change, raised with network team.' }],
  },
  {
    id: 1040, title: 'Badge reader dead at east entrance', category: 'facility', priority: 'high', status: 'open',
    description: 'Reader shows no light; staff are tailgating in.',
    seat: 'RA-1-EAST', assetTag: 'BR-0107', reporterId: 9, assigneeId: null, age: '22m', notes: [],
  },
  {
    id: 1039, title: "Room display won't pair with laptops", category: 'hardware', priority: 'medium', status: 'open',
    description: "Orca conference room screen can't be found over AirPlay or Miracast.",
    seat: 'HT-7-ORCA', assetTag: 'DSP-0710', reporterId: 8, assigneeId: null, age: '1h', notes: [],
  },
  {
    id: 1038, title: 'Outlook crashes on launch', category: 'software', priority: 'medium', status: 'in_progress',
    description: 'Crashes immediately after the splash screen. Safe mode works.',
    seat: 'HT-2-018', assetTag: 'LT-1984', reporterId: 9, assigneeId: 3, age: '3h',
    notes: [{ authorId: 3, time: '10:12', body: 'Looks like a corrupt add-in. Disabling them one by one.' }],
  },
  {
    id: 1037, title: 'Ceiling leak above desks', category: 'facility', priority: 'critical', status: 'in_progress',
    description: 'Water dripping near two power strips at 4-118.',
    seat: 'HT-4-118', assetTag: null, reporterId: 2, assigneeId: 5, age: '2h',
    escalationReason: 'Employee requested — water is dripping close to live power strips',
    notes: [{ authorId: 5, time: '10:40', body: 'Area cordoned off and power strips isolated. Roofer is on the way.' }],
  },
  {
    id: 1036, title: "Docking station won't charge laptop", category: 'hardware', priority: 'low', status: 'open',
    description: "Displays work through the dock but the battery isn't charging.",
    seat: 'HT-4-112', assetTag: 'DK-0391', reporterId: 2, assigneeId: 4, age: '4h', notes: [],
  },
  {
    id: 1035, title: 'Printer jams on every duplex job', category: 'hardware', priority: 'low', status: 'resolved',
    description: 'Floor 3 printer jams whenever double-sided printing is selected.',
    seat: 'RA-3-204', assetTag: 'PR-0033', reporterId: 8, assigneeId: 6, age: '1d',
    notes: [{ authorId: 6, time: 'Tue 11:05', body: 'Replaced the duplex roller. Ran a test batch of 40 pages.' }],
  },
  {
    id: 1034, title: 'Echo on Teams calls', category: 'software', priority: 'medium', status: 'resolved',
    description: "Other people hear themselves echo when I'm on a call.",
    seat: 'HT-4-112', assetTag: 'HS-0772', reporterId: 2, assigneeId: 3, age: '2d',
    notes: [{ authorId: 3, time: 'Mon 15:30', body: "Turned off the duplicate audio device and updated the headset firmware. Can you confirm it's fixed?" }],
  },
  {
    id: 1033, title: "Standing desk won't raise", category: 'facility', priority: 'low', status: 'closed',
    description: "Motor hums, desk doesn't move.",
    seat: 'IL-2-BAY', assetTag: 'DSK-0218', reporterId: 9, assigneeId: 5, age: '4d', notes: [],
  },
  {
    id: 1032, title: 'Keyboard keys sticking', category: 'hardware', priority: 'low', status: 'closed',
    description: 'E and R keys stick after a coffee spill.',
    seat: 'HT-4-112', assetTag: 'KB-1150', reporterId: 2, assigneeId: 4, age: '6d', notes: [],
  },
  {
    id: 1031, title: 'Lab HVAC far too cold', category: 'facility', priority: 'medium', status: 'blocked',
    description: "Lab bay B is at 16°C; the thermostat doesn't respond.",
    seat: 'IL-2-BAY', assetTag: 'HVAC-IL2', reporterId: 8, assigneeId: 5, age: '2d',
    blockedReason: 'Vendor visit booked for Thursday 09:00', notes: [],
  },
  {
    id: 1030, title: 'Password reset loop on SSO', category: 'software', priority: 'high', status: 'open',
    description: 'Every login asks me to reset my password again.',
    seat: 'HT-7-ORCA', assetTag: null, reporterId: 9, assigneeId: 3, age: '48m', notes: [],
  },
]

// 90-day history for the reporting panels (would come from GET /api/dashboard).
export const HOTSPOTS = [
  { label: 'Harbor Tower', detail: 'Seat 4-112', value: 7 },
  { label: 'Harbor Tower', detail: 'Room Orca', value: 5 },
  { label: 'Riverside Annex', detail: 'East entrance', value: 4 },
  { label: 'Innovation Lab', detail: 'Lab bay B', value: 4 },
  { label: 'Harbor Tower', detail: 'Seat 2-018', value: 3 },
]

export const CATEGORY_COUNTS = [
  { label: 'Hardware', value: 48 },
  { label: 'Software', value: 36 },
  { label: 'Facility', value: 29 },
  { label: 'Other', value: 6 },
]
