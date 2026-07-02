import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Single source of truth for the whole platform, persisted to localStorage.
// Each module (goals, finance, family, legacy, reviews) hangs off this store.

let idCounter = 0
const uid = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}`

export const GOAL_CATEGORIES = [
  'Self',
  'Family',
  'Health',
  'Career',
  'Experiences',
  'Finance',
  'Legacy',
]

export const GOAL_STATUSES = ['BACKLOG', 'ACTIVE', 'COMPLETED']

export const useStore = create(
  persist(
    (set, get) => ({
      // ---- profile / onboarding ----
      profile: null, // { name, dob, lifeExpectancy }
      view: 'dashboard',
      dockOpen: true, // Death side-dock, open by default
      tone: 'balanced', // 'gentle' | 'balanced' | 'unflinching'
      // User-supplied artwork as data URLs (downscaled). reaper = wolf avatar,
      // bg = full-page background, hero = onboarding background.
      images: { reaper: '', bg: '', hero: '' },

      setView: (view) => set({ view }),
      setDockOpen: (dockOpen) => set({ dockOpen }),
      toggleDock: () => set((s) => ({ dockOpen: !s.dockOpen })),
      setTone: (tone) => set({ tone }),
      setImage: (slot, dataUrl) => set((s) => ({ images: { ...s.images, [slot]: dataUrl } })),
      clearImage: (slot) => set((s) => ({ images: { ...s.images, [slot]: '' } })),

      completeOnboarding: (profile) => set({ profile, view: 'dashboard' }),
      resetAll: () =>
        set({
          profile: null,
          view: 'dashboard',
          goals: [],
          finance: { assets: [], liabilities: [], retirementTarget: 0 },
          family: [],
          insurance: { hasPolicy: null, policies: [] },
          health: { conditions: [], items: {} },
          will: { hasWill: null, location: '', executor: '', guardian: '', lastUpdated: '', checklist: {} },
          legacy: [],
          reviews: [],
          events: [],
          anniversaryAsked: false,
          tone: 'balanced',
          images: { reaper: '', bg: '', hero: '' },
        }),
      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),

      // ---- goals ----
      goals: [],
      addGoal: (g) =>
        set((s) => ({
          goals: [
            ...s.goals,
            {
              id: uid(),
              category: g.category || 'Self',
              title: g.title || 'Untitled',
              description: g.description || '',
              status: g.status || 'BACKLOG',
              priority: g.priority ?? 2,
              targetDate: g.targetDate || '',
              // horizon: null = ordinary kanban goal; 'annual' / 'fiveyear' =
              // year-scoped goals shown ONLY in the Years life-grid view.
              horizon: g.horizon || null,
              year: g.year || null,
              createdAt: Date.now(),
            },
          ],
        })),
      updateGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      removeGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      setGoalStatus: (id, status) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, status } : g)),
        })),

      // ---- finance ----
      finance: { assets: [], liabilities: [], retirementTarget: 0 },
      addAsset: (label, value) =>
        set((s) => ({
          finance: {
            ...s.finance,
            assets: [...s.finance.assets, { id: uid(), label, value: Number(value) || 0 }],
          },
        })),
      addLiability: (label, value) =>
        set((s) => ({
          finance: {
            ...s.finance,
            liabilities: [
              ...s.finance.liabilities,
              { id: uid(), label, value: Number(value) || 0 },
            ],
          },
        })),
      removeFinanceItem: (kind, id) =>
        set((s) => ({
          finance: {
            ...s.finance,
            [kind]: s.finance[kind].filter((x) => x.id !== id),
          },
        })),
      updateFinanceItem: (kind, id, patch) =>
        set((s) => ({
          finance: {
            ...s.finance,
            [kind]: s.finance[kind].map((x) =>
              x.id === id ? { ...x, ...patch } : x
            ),
          },
        })),
      setRetirementTarget: (v) =>
        set((s) => ({ finance: { ...s.finance, retirementTarget: Number(v) || 0 } })),

      // ---- family ----
      family: [],
      addFamilyMember: (m) =>
        set((s) => ({
          family: [
            ...s.family,
            { id: uid(), name: m.name, relation: m.relation || '', dob: m.dob || '', milestones: [] },
          ],
        })),
      updateFamilyMember: (id, patch) =>
        set((s) => ({
          family: s.family.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      removeFamilyMember: (id) =>
        set((s) => ({ family: s.family.filter((m) => m.id !== id) })),
      addMilestone: (memberId, title, date) =>
        set((s) => ({
          family: s.family.map((m) =>
            m.id === memberId
              ? { ...m, milestones: [...m.milestones, { id: uid(), title, date }] }
              : m
          ),
        })),
      removeMilestone: (memberId, msId) =>
        set((s) => ({
          family: s.family.map((m) =>
            m.id === memberId
              ? { ...m, milestones: m.milestones.filter((x) => x.id !== msId) }
              : m
          ),
        })),

      // ---- life insurance (shown in Family) ----
      // hasPolicy: null = unanswered, true/false = declared. policies[] hold the
      // details when the user has cover.
      insurance: { hasPolicy: null, policies: [] },
      setInsuranceStatus: (hasPolicy) =>
        set((s) => ({ insurance: { ...s.insurance, hasPolicy } })),
      addPolicy: (p) =>
        set((s) => ({
          insurance: {
            ...s.insurance,
            hasPolicy: true,
            policies: [
              ...s.insurance.policies,
              {
                id: uid(),
                insurer: p.insurer || '',
                kind: p.kind || 'Term',
                coverage: Number(p.coverage) || 0,
                beneficiary: p.beneficiary || '',
                premium: Number(p.premium) || 0,
                premiumFreq: p.premiumFreq || 'yr',
                renewal: p.renewal || '',
                note: p.note || '',
              },
            ],
          },
        })),
      updatePolicy: (id, patch) =>
        set((s) => ({
          insurance: {
            ...s.insurance,
            policies: s.insurance.policies.map((x) =>
              x.id === id ? { ...x, ...patch } : x
            ),
          },
        })),
      removePolicy: (id) =>
        set((s) => ({
          insurance: {
            ...s.insurance,
            policies: s.insurance.policies.filter((x) => x.id !== id),
          },
        })),

      // ---- health (age/sex screening checklist) ----
      // conditions[] = active risk gates ('ever-smoker','diabetes','hypertension',
      // 'overweight','family-history','high-risk') that unlock conditional screens.
      // items = per-screening tracking: { [id]: { status, lastDone, nextDue, note } }.
      health: { conditions: [], items: {} },
      setHealthItem: (id, patch) =>
        set((s) => ({
          health: {
            ...s.health,
            items: { ...s.health.items, [id]: { ...(s.health.items[id] || {}), ...patch } },
          },
        })),
      clearHealthItem: (id) =>
        set((s) => {
          const items = { ...s.health.items }
          delete items[id]
          return { health: { ...s.health, items } }
        }),
      toggleCondition: (cond) =>
        set((s) => ({
          health: {
            ...s.health,
            conditions: s.health.conditions.includes(cond)
              ? s.health.conditions.filter((c) => c !== cond)
              : [...s.health.conditions, cond],
          },
        })),

      // ---- will planning tracker ----
      will: { hasWill: null, location: '', executor: '', guardian: '', lastUpdated: '', checklist: {} },
      setWill: (patch) => set((s) => ({ will: { ...s.will, ...patch } })),
      toggleWillStep: (key) =>
        set((s) => ({
          will: { ...s.will, checklist: { ...s.will.checklist, [key]: !s.will.checklist[key] } },
        })),

      // ---- legacy vault ----
      legacy: [],
      addLegacy: (entry) =>
        set((s) => ({
          legacy: [
            ...s.legacy,
            {
              id: uid(),
              type: entry.type || 'Letter',
              title: entry.title || 'Untitled',
              body: entry.body || '',
              updatedAt: Date.now(),
            },
          ],
        })),
      updateLegacy: (id, patch) =>
        set((s) => ({
          legacy: s.legacy.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e
          ),
        })),
      removeLegacy: (id) =>
        set((s) => ({ legacy: s.legacy.filter((e) => e.id !== id) })),

      // ---- calendar events (life-in-months markers) ----
      events: [], // { id, title, date 'YYYY-MM-DD', kind: 'event'|'anniversary'|'birthday' }
      anniversaryAsked: false,
      addEvent: (e) =>
        set((s) => ({
          events: [
            ...s.events,
            { id: uid(), title: e.title || 'Event', date: e.date || '', kind: e.kind || 'event' },
          ],
        })),
      removeEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      setAnniversaryAsked: (v) => set({ anniversaryAsked: !!v }),

      // ---- reviews / rituals ----
      reviews: [],
      addReview: (answers) =>
        set((s) => ({
          reviews: [
            { id: uid(), date: new Date().toISOString().slice(0, 10), answers },
            ...s.reviews,
          ],
        })),

      // ---- backup import (tolerant: only overwrite keys present in the file) ----
      importData: (data) =>
        set((s) => ({
          profile: data.profile ?? s.profile,
          goals: data.goals ?? s.goals,
          finance: data.finance ?? s.finance,
          family: data.family ?? s.family,
          insurance: data.insurance ?? s.insurance,
          health: data.health ?? s.health,
          will: data.will ?? s.will,
          legacy: data.legacy ?? s.legacy,
          reviews: data.reviews ?? s.reviews,
          events: data.events ?? s.events,
          tone: data.tone ?? s.tone,
        })),
    }),
    {
      name: 'mbd.store.v1',
      version: 3,
      // v2: drop any per-device uploaded images so the built-in (transparent)
      // wolf defaults in /public win. Earlier uploads were flat white-bg PNGs.
      // v3: seed the new health / insurance / will slices for existing users.
      migrate: (state, fromVersion) => {
        if (state && fromVersion < 2) {
          state.images = { reaper: '', bg: '', hero: '' }
        }
        if (state && fromVersion < 3) {
          state.insurance = state.insurance || { hasPolicy: null, policies: [] }
          state.health = state.health || { conditions: [], items: {} }
          state.will = state.will || {
            hasWill: null, location: '', executor: '', guardian: '', lastUpdated: '', checklist: {},
          }
        }
        return state
      },
    }
  )
)

// Derived helper: aggregated finance numbers.
export function financeTotals(finance) {
  const assets = finance.assets.reduce((a, x) => a + (Number(x.value) || 0), 0)
  const liabilities = finance.liabilities.reduce((a, x) => a + (Number(x.value) || 0), 0)
  return { assets, liabilities, netWorth: assets - liabilities }
}
