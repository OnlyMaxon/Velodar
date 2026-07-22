// Report type catalogue — single source of truth for the UI (picker, markers,
// callouts) and for the values stored in the DB `report_type` enum.
//
// `emoji` doubles as a lightweight marker glyph so the MVP needs no image
// assets; swap for custom PNG/SVG icons later without touching the DB.

export const REPORT_TYPES = [
  {
    id: 'police',
    label: 'Policja', // police post
    emoji: '👮',
    color: '#2563eb',
    description: 'Patrol / kontrola policji',
  },
  {
    id: 'camera',
    label: 'Fotoradar', // speed camera
    emoji: '📷',
    color: '#dc2626',
    description: 'Fotoradar / pomiar prędkości',
  },
  {
    id: 'ebike_control',
    label: 'Kontrola e-bike', // e-bike control
    emoji: '⚡',
    color: '#f59e0b',
    description: 'Kontrola rowerów elektrycznych',
  },
];

export const REPORT_TYPES_BY_ID = REPORT_TYPES.reduce((acc, t) => {
  acc[t.id] = t;
  return acc;
}, {});

export function getReportType(id) {
  return REPORT_TYPES_BY_ID[id] ?? null;
}
