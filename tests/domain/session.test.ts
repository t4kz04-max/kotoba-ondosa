import { describe, expect, it } from 'vitest'
import {
  createSessionReducer,
  initialSessionState,
  transition,
  type SessionEvent,
  type SessionState,
  type SessionStep,
} from '../../src/domain/session'
import { defaultCatalog as catalog } from '../../src/data/catalog'

function run(events: SessionEvent[], from: SessionState = initialSessionState): SessionState {
  return events.reduce((state, event) => {
    const result = transition(state, event, catalog)
    if (!result.ok) throw new Error(`${event.type} rejected at ${state.step}: ${result.error}`)
    return result.state
  }, from)
}

const draft = (start: number | null, end: number | null): SessionEvent => ({
  type: 'SET_DRAFT',
  draft: { start, end },
})

const SOLO_TO_COMPARISON: SessionEvent[] = [
  { type: 'SELECT_MODE', mode: 'solo' },
  { type: 'SELECT_SCENARIO', scenarioId: 'sugu-iku' },
  draft(0, 300),
  { type: 'SUBMIT_ANSWER' },
]

const DUO_TO_HANDOFF: SessionEvent[] = [
  { type: 'SELECT_MODE', mode: 'duo' },
  { type: 'SELECT_SCENARIO', scenarioId: 'sugu-iku' },
  draft(0, 180),
  { type: 'SUBMIT_ANSWER' },
]

const DUO_TO_COMPARISON: SessionEvent[] = [
  ...DUO_TO_HANDOFF,
  { type: 'START_INPUT_B' },
  draft(600, 1800),
  { type: 'SUBMIT_ANSWER' },
  { type: 'REVEAL' },
]

describe('solo mode', () => {
  it('goes from HOME to COMPLETE', () => {
    const atComparison = run(SOLO_TO_COMPARISON)
    expect(atComparison.step).toBe('COMPARISON')
    expect(atComparison.answerA).toEqual({ start: 0, end: 300 })
    expect(atComparison.sampleId).toBe('sugu-sora')
    expect(atComparison.draft).toEqual({ start: null, end: null })

    const done = run(
      [
        { type: 'START_AGREEMENT' },
        { type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 },
        { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true },
      ],
      atComparison,
    )
    expect(done.step).toBe('COMPLETE')
    expect(done.agreement).toEqual({ seconds: 600, approvedBy: ['A'] })
  })

  it('switches samples within the scenario only', () => {
    const state = run(SOLO_TO_COMPARISON)
    expect(transition(state, { type: 'SELECT_SAMPLE', sampleId: 'sugu-hikari' }, catalog).state.sampleId).toBe(
      'sugu-hikari',
    )
    const other = transition(state, { type: 'SELECT_SAMPLE', sampleId: 'atode-sora' }, catalog)
    expect(other).toMatchObject({ ok: false, error: 'unknown-sample' })
  })

  it('only accepts approval from A', () => {
    const state = run([
      ...SOLO_TO_COMPARISON,
      { type: 'START_AGREEMENT' },
      { type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 },
    ])
    const result = transition(state, { type: 'APPROVE_AGREEMENT', participant: 'B', feasibilityConfirmed: true }, catalog)
    expect(result).toMatchObject({ ok: false, error: 'invalid-participant' })
  })
})

describe('duo mode', () => {
  it('goes through handoff and reveal', () => {
    const handoff = run(DUO_TO_HANDOFF)
    expect(handoff.step).toBe('HANDOFF')
    expect(handoff.answerA).toEqual({ start: 0, end: 180 })
    expect(handoff.draft).toEqual({ start: null, end: null })

    const inputB = run([{ type: 'START_INPUT_B' }], handoff)
    expect(inputB.step).toBe('INPUT_B')
    expect(inputB.draft).toEqual({ start: null, end: null })

    const comparison = run(DUO_TO_COMPARISON)
    expect(comparison.step).toBe('COMPARISON')
    expect(comparison.answerB).toEqual({ start: 600, end: 1800 })
    expect(comparison.sampleId).toBeNull()
  })

  it('completes only after both A and B approve', () => {
    let state = run([
      ...DUO_TO_COMPARISON,
      { type: 'START_AGREEMENT' },
      { type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 },
      { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true },
    ])
    expect(state.step).toBe('AGREEMENT')
    expect(
      transition(state, { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true }, catalog),
    ).toMatchObject({ ok: false, error: 'already-approved' })

    state = run([{ type: 'APPROVE_AGREEMENT', participant: 'B', feasibilityConfirmed: true }], state)
    expect(state.step).toBe('COMPLETE')
    expect(state.agreement.approvedBy).toEqual(['A', 'B'])
  })

  it('clears approvals when the time changes or is revised', () => {
    const approvedA = run([
      ...DUO_TO_COMPARISON,
      { type: 'START_AGREEMENT' },
      { type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 },
      { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true },
    ])
    expect(run([{ type: 'CHOOSE_AGREEMENT_TIME', seconds: 900 }], approvedA).agreement).toEqual({
      seconds: 900,
      approvedBy: [],
    })
    expect(run([{ type: 'REVISE_AGREEMENT' }], approvedA).agreement).toEqual({
      seconds: null,
      approvedBy: [],
    })
  })

  it('does not allow going back from INPUT_B to INPUT_A', () => {
    const inputB = run([...DUO_TO_HANDOFF, { type: 'START_INPUT_B' }])
    const back = run([{ type: 'BACK' }], inputB)
    expect(back.step).toBe('HANDOFF')
    expect(transition(back, { type: 'BACK' }, catalog)).toMatchObject({
      ok: false,
      error: 'invalid-event-for-step',
    })
  })

  it('does not allow sample selection', () => {
    const state = run(DUO_TO_COMPARISON)
    expect(transition(state, { type: 'SELECT_SAMPLE', sampleId: 'sugu-sora' }, catalog)).toMatchObject({
      ok: false,
      error: 'invalid-event-for-step',
    })
  })
})

describe('answer confirmation', () => {
  const atInput = run([
    { type: 'SELECT_MODE', mode: 'solo' },
    { type: 'SELECT_SCENARIO', scenarioId: 'chotto-matte' },
  ])

  it('starts with an unanswered draft', () => {
    expect(atInput.draft).toEqual({ start: null, end: null })
  })

  it.each([
    ['empty draft', null, null],
    ['missing end', 0, null],
    ['missing start', null, 60],
  ])('rejects submitting a %s', (_name, start, end) => {
    const state = run([draft(start, end)], atInput)
    const result = transition(state, { type: 'SUBMIT_ANSWER' }, catalog)
    expect(result).toMatchObject({ ok: false, error: 'invalid-answer' })
    expect(result.state).toBe(state)
  })

  it.each([
    ['reversed range', 120, 60],
    ['range above the max', 0, 1801],
    ['negative value', -10, 60],
  ])('rejects submitting a %s', (_name, start, end) => {
    const state = run([draft(start, end)], atInput)
    expect(transition(state, { type: 'SUBMIT_ANSWER' }, catalog)).toMatchObject({
      ok: false,
      error: 'invalid-answer',
    })
  })

  it('accepts a zero-length range at 0', () => {
    const state = run([draft(0, 0), { type: 'SUBMIT_ANSWER' }], atInput)
    expect(state.answerA).toEqual({ start: 0, end: 0 })
  })
})

describe('agreement validation', () => {
  const atAgreement = run([...SOLO_TO_COMPARISON, { type: 'START_AGREEMENT' }])

  it('rejects approval before a time is chosen', () => {
    expect(
      transition(atAgreement, { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true }, catalog),
    ).toMatchObject({ ok: false, error: 'agreement-time-not-chosen' })
  })

  it('rejects approval without a feasibility check', () => {
    const chosen = run([{ type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 }], atAgreement)
    expect(
      transition(chosen, { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: false }, catalog),
    ).toMatchObject({ ok: false, error: 'feasibility-not-confirmed' })
  })

  it.each([0, 3601, 1.5])('rejects agreement time %s', (seconds) => {
    expect(transition(atAgreement, { type: 'CHOOSE_AGREEMENT_TIME', seconds }, catalog)).toMatchObject({
      ok: false,
      error: 'invalid-agreement-time',
    })
  })
})

describe('invalid transitions', () => {
  const cases: [SessionStep, SessionEvent[], SessionEvent][] = [
    ['HOME', [], { type: 'SELECT_SCENARIO', scenarioId: 'sugu-iku' }],
    ['HOME', [], { type: 'SUBMIT_ANSWER' }],
    ['HOME', [], { type: 'BACK' }],
    ['SCENARIO_SELECT', [{ type: 'SELECT_MODE', mode: 'solo' }], { type: 'SELECT_MODE', mode: 'duo' }],
    ['INPUT_A', SOLO_TO_COMPARISON.slice(0, 2), { type: 'REVEAL' }],
    ['INPUT_A', SOLO_TO_COMPARISON.slice(0, 2), { type: 'START_AGREEMENT' }],
    ['HANDOFF', DUO_TO_HANDOFF, draft(0, 60)],
    ['HANDOFF', DUO_TO_HANDOFF, { type: 'REVEAL' }],
    ['READY_TO_REVEAL', DUO_TO_COMPARISON.slice(0, -1), { type: 'START_AGREEMENT' }],
    ['COMPARISON', SOLO_TO_COMPARISON, { type: 'BACK' }],
    ['COMPARISON', SOLO_TO_COMPARISON, { type: 'SUBMIT_ANSWER' }],
    ['COMPARISON', SOLO_TO_COMPARISON, { type: 'CHOOSE_AGREEMENT_TIME', seconds: 60 }],
  ]

  it.each(cases)('rejects at %s: %j', (step, setup, event) => {
    const state = run(setup)
    expect(state.step).toBe(step)
    const result = transition(state, event, catalog)
    expect(result.ok).toBe(false)
    expect(result.state).toBe(state)
  })

  it('rejects an unknown scenario', () => {
    const state = run([{ type: 'SELECT_MODE', mode: 'solo' }])
    const result = transition(state, { type: 'SELECT_SCENARIO', scenarioId: 'nope' as never }, catalog)
    expect(result).toMatchObject({ ok: false, error: 'unknown-scenario' })
  })
})

describe('back navigation', () => {
  it('goes back from SCENARIO_SELECT to HOME and from INPUT_A to SCENARIO_SELECT', () => {
    expect(run([{ type: 'SELECT_MODE', mode: 'solo' }, { type: 'BACK' }])).toEqual(initialSessionState)
    const backFromInput = run([...SOLO_TO_COMPARISON.slice(0, 3), { type: 'BACK' }])
    expect(backFromInput.step).toBe('SCENARIO_SELECT')
    expect(backFromInput.scenarioId).toBeNull()
    expect(backFromInput.draft).toEqual({ start: null, end: null })
  })

  it('goes back from AGREEMENT to COMPARISON and clears the agreement', () => {
    const state = run([
      ...SOLO_TO_COMPARISON,
      { type: 'START_AGREEMENT' },
      { type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 },
      { type: 'BACK' },
    ])
    expect(state.step).toBe('COMPARISON')
    expect(state.agreement).toEqual({ seconds: null, approvedBy: [] })
  })
})

describe('reset and restart', () => {
  it('RESET returns to the initial state from any step', () => {
    const prefixes: SessionEvent[][] = [
      [],
      SOLO_TO_COMPARISON.slice(0, 3),
      DUO_TO_HANDOFF,
      DUO_TO_COMPARISON,
      [...DUO_TO_COMPARISON, { type: 'START_AGREEMENT' }],
    ]
    for (const prefix of prefixes) {
      expect(run([...prefix, { type: 'RESET' }])).toEqual(initialSessionState)
    }
  })

  it('RESTART_SAME_MODE keeps only the mode', () => {
    const complete = run([
      ...DUO_TO_COMPARISON,
      { type: 'START_AGREEMENT' },
      { type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 },
      { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true },
      { type: 'APPROVE_AGREEMENT', participant: 'B', feasibilityConfirmed: true },
    ])
    expect(run([{ type: 'RESTART_SAME_MODE' }], complete)).toEqual({
      ...initialSessionState,
      step: 'SCENARIO_SELECT',
      mode: 'duo',
    })
    expect(run([{ type: 'RESTART_SAME_MODE' }], run(SOLO_TO_COMPARISON)).mode).toBe('solo')
  })

  it('RESTART_SAME_MODE is rejected before the comparison', () => {
    const state = run(DUO_TO_HANDOFF)
    expect(transition(state, { type: 'RESTART_SAME_MODE' }, catalog).ok).toBe(false)
  })
})

describe('createSessionReducer', () => {
  it('returns the same state object for rejected events', () => {
    const reducer = createSessionReducer(catalog)
    expect(reducer(initialSessionState, { type: 'REVEAL' })).toBe(initialSessionState)
    expect(reducer(initialSessionState, { type: 'SELECT_MODE', mode: 'solo' }).step).toBe('SCENARIO_SELECT')
  })
})

describe('withdrawing an approval (Phase 6B)', () => {
  const duoChosen: SessionEvent[] = [
    { type: 'SELECT_MODE', mode: 'duo' },
    { type: 'SELECT_SCENARIO', scenarioId: 'sugu-iku' },
    { type: 'SET_DRAFT', draft: { start: 0, end: 300 } },
    { type: 'SUBMIT_ANSWER' },
    { type: 'START_INPUT_B' },
    { type: 'SET_DRAFT', draft: { start: 600, end: 900 } },
    { type: 'SUBMIT_ANSWER' },
    { type: 'REVEAL' },
    { type: 'START_AGREEMENT' },
    { type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 },
  ]
  const apply = (events: SessionEvent[]) =>
    events.reduce((state, event) => transition(state, event, catalog).state, initialSessionState)

  it('removes only that participant and keeps the chosen time', () => {
    const state = apply([
      ...duoChosen,
      { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true },
      { type: 'WITHDRAW_APPROVAL', participant: 'A' },
    ])
    expect(state.step).toBe('AGREEMENT')
    expect(state.agreement).toEqual({ seconds: 600, approvedBy: [] })
  })

  it('rejects withdrawing when not approved, or outside the agreement step', () => {
    const chosen = apply(duoChosen)
    expect(transition(chosen, { type: 'WITHDRAW_APPROVAL', participant: 'B' }, catalog)).toMatchObject({
      ok: false,
      error: 'not-approved',
    })
    expect(transition(initialSessionState, { type: 'WITHDRAW_APPROVAL', participant: 'A' }, catalog).ok).toBe(false)
  })

  it('cannot complete with only one approval, even after withdraw and re-approve', () => {
    const state = apply([
      ...duoChosen,
      { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true },
      { type: 'WITHDRAW_APPROVAL', participant: 'A' },
      { type: 'APPROVE_AGREEMENT', participant: 'B', feasibilityConfirmed: true },
    ])
    expect(state.step).toBe('AGREEMENT')
    expect(apply([
      ...duoChosen,
      { type: 'APPROVE_AGREEMENT', participant: 'B', feasibilityConfirmed: true },
      { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true },
    ]).step).toBe('COMPLETE')
  })
})
