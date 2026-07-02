// Tone-driven mortality framing for client-facing copy.
// Pure, dependency-free. The `tone` setting (gentle | balanced | unflinching)
// lives in the store; this map turns it into the actual words the user reads.
// Unknown/missing tones fall back to 'balanced' (the current default voice).

const COPY = {
  gentle: {
    running: 'The clock is still yours, ',
    gone: 'Your time here is complete, ',
    sub: 'You have lived {age} years. Here is the time still ahead of you, and what you might do with it.',
  },
  balanced: {
    running: 'The clock is running, ',
    gone: 'The sand has run out, ',
    sub: 'You have lived {age} years. Here is what the reaper has left on the table.',
  },
  unflinching: {
    running: 'The clock is bleeding out, ',
    gone: 'The sand has run out, ',
    sub: 'You have lived {age} years. This is precisely how little remains.',
  },
}

export function toneCopy(tone) {
  return COPY[tone] || COPY.balanced
}

// Tone-driven sub-headers for every view (and the Reflect ritual intro).
// `balanced` reuses the exact current hardcoded strings so the default voice
// never regresses. The privacy clause on legacy ('Stored only on this device.')
// is kept across all three tones — it is an assurance, not framing.
const VIEWS = {
  gentle: {
    goals: { sub: 'Turn the time you have into things worth doing. Backlog → Active → Completed.' },
    finance: { sub: 'Net worth, allocation, and your runway toward a target corpus.' },
    family: { sub: 'The people your time is really for. Note the moments you want to share with them.' },
    health: { sub: 'Your body keeps its own quiet ledger. These are the checks that catch trouble early, matched to your age.' },
    will: { sub: 'Set your affairs down on paper while it is easy, so those you love are not left guessing.' },
    legacy: { sub: 'What you leave behind. Letters, an ethical will, memories, hand-off instructions. Stored only on this device.' },
    reflect: { sub: 'A quiet check-in with yourself. Answer at your own pace — there are no wrong answers.' },
  },
  balanced: {
    goals: { sub: 'Turn finite time into deliberate pursuits. Backlog → Active → Completed.' },
    finance: { sub: 'Net worth, allocation, and your runway toward a target corpus.' },
    family: { sub: 'The people your time is really for. Track them and the milestones you want to be there for.' },
    health: { sub: 'The body is a borrowed instrument. Here is what to keep watch on at your age — screenings that buy you time.' },
    will: { sub: 'A will is a last act of care. Set down who gets what, and who decides, before the choice is made for you.' },
    legacy: { sub: 'What you leave behind. Letters, an ethical will, memories, hand-off instructions. Stored only on this device.' },
    reflect: { sub: "A periodic sit-down with your mortality. Answer honestly; the dead don't lie." },
  },
  unflinching: {
    goals: { sub: 'Spend your remaining weeks on what matters. Backlog → Active → Completed.' },
    finance: { sub: 'Net worth, allocation, and exactly how much runway you have left.' },
    family: { sub: 'The people your remaining weeks are really for. Decide which milestones you will actually be alive to see.' },
    health: { sub: 'Decay is scheduled; detection is optional. These are the tests that stand between you and an avoidable end.' },
    will: { sub: 'You will die intestate or on your own terms. Put it in writing now, or the state writes your will for you.' },
    legacy: { sub: 'What you leave behind when you are gone. Letters, an ethical will, memories, hand-off instructions. Stored only on this device.' },
    reflect: { sub: "Sit with your mortality. Answer honestly; the dead don't lie." },
  },
}

export function toneViews(tone) {
  return VIEWS[tone] || VIEWS.balanced
}

// Tone-driven copy for the Dashboard first-run "getting started" card,
// shown only while the user has recorded nothing. One short line each,
// matching the register of toneViews. Same balanced fallback as elsewhere.
const START = {
  gentle: {
    title: 'Begin when you are ready.',
    sub: 'Nothing here is set in stone. Add one thing that matters and the rest of the picture will fill in.',
  },
  balanced: {
    title: 'Your timeline is empty — for now.',
    sub: 'The numbers above stay hollow until you tell the reaper what you are spending your time on.',
  },
  unflinching: {
    title: 'You have recorded nothing.',
    sub: 'The countdown is running regardless. Put something on the board before more weeks burn.',
  },
}

export function toneStart(tone) {
  return START[tone] || START.balanced
}
