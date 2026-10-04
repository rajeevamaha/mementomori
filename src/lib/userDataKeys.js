// Every slice of the Zustand store that belongs to the user (not session UI).
// Synced to Postgres as JSON in mbd_state when signed in. Death's chat history
// lives separately in mbd_convo — still in the database.

export const USER_DATA_KEYS = [
  'profile',
  'goals',
  'finance',
  'family',
  'insurance',
  'health',
  'will',
  'legacy',
  'reviews',
  'events',
  'anniversaryAsked',
  'tone',
  'view',
  'dockOpen',
  'images',
]

export function pickUserData(stateOrBlob) {
  const out = {}
  for (const k of USER_DATA_KEYS) out[k] = stateOrBlob?.[k]
  return out
}

/** Defaults when adopting a partial or empty server copy. */
export function applyUserDataDefaults(data, current = {}) {
  return {
    profile: data?.profile ?? null,
    goals: data?.goals ?? [],
    finance: data?.finance ?? { assets: [], liabilities: [], retirementTarget: 0 },
    family: data?.family ?? [],
    insurance: data?.insurance ?? { hasPolicy: null, policies: [] },
    health: data?.health ?? { conditions: [], items: {} },
    will:
      data?.will ?? {
        hasWill: null,
        location: '',
        executor: '',
        guardian: '',
        lastUpdated: '',
        checklist: {},
      },
    legacy: data?.legacy ?? [],
    reviews: data?.reviews ?? [],
    events: data?.events ?? [],
    anniversaryAsked: data?.anniversaryAsked ?? false,
    tone: data?.tone ?? current.tone ?? 'balanced',
    view: data?.view ?? current.view ?? 'dashboard',
    dockOpen: data?.dockOpen ?? current.dockOpen ?? true,
    images: data?.images ?? current.images ?? { reaper: '', bg: '', hero: '' },
  }
}
