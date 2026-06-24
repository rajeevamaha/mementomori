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

      setView: (view) => set({ view }),
      setDockOpen: (dockOpen) => set({ dockOpen }),
      toggleDock: () => set((s) => ({ dockOpen: !s.dockOpen })),

      completeOnboarding: (profile) => set({ profile, view: 'dashboard' }),
      resetAll: () =>
        set({
          profile: null,
          view: 'dashboard',
          goals: [],
          finance: { assets: [], liabilities: [], retirementTarget: 0 },
          family: [],
          legacy: [],
          reviews: [],
          events: [],
          anniversaryAsked: false,
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
    }),
    {
      name: 'mbd.store.v1',
      version: 1,
    }
  )
)

// Derived helper: aggregated finance numbers.
export function financeTotals(finance) {
  const assets = finance.assets.reduce((a, x) => a + (Number(x.value) || 0), 0)
  const liabilities = finance.liabilities.reduce((a, x) => a + (Number(x.value) || 0), 0)
  return { assets, liabilities, netWorth: assets - liabilities }
}
