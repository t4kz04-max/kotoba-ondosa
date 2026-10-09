import { describe, expect, it } from 'vitest'
import { initialSessionState, transition, type SessionEvent, type SessionState } from '../../src/domain/session'
import { selectAgreementView, selectComparisonView, selectInputView } from '../../src/domain/views'
import { defaultCatalog as catalog } from '../../src/data/catalog'

function run(events: SessionEvent[]): SessionState {
  return events.reduce((state, event) => {
    const result = transition(state, event, catalog)
    if (!result.ok) throw new Error(`${event.type} rejected: ${result.error}`)
    return result.state
  }, initialSessionState)
}

const DUO_INPUT_B: SessionEvent[] = [
  { type: 'SELECT_MODE', mode: 'duo' },
  { type: 'SELECT_SCENARIO', scenarioId: 'sugu-iku' },
  { type: 'SET_DRAFT', draft: { start: 120, end: 420 } },
  { type: 'SUBMIT_ANSWER' },
  { type: 'START_INPUT_B' },
]

describe('selectInputView', () => {
  it('does not expose A’s answer while B is entering', () => {
    const view = selectInputView(run(DUO_INPUT_B), catalog)
    expect(view).not.toBeNull()
    expect(Object.keys(view ?? {}).sort()).toEqual(['canSubmit', 'draft', 'mode', 'participant', 'scenario'])
    expect(view?.participant).toBe('B')
    expect(view?.draft).toEqual({ start: null, end: null })
    // A の回答の値（120・420）がどこにも含まれない
    const serialized = JSON.stringify(view)
    expect(serialized).not.toContain('"start":120')
    expect(serialized).not.toContain('"end":420')
  })

  it('reports whether the draft can be submitted', () => {
    const empty = selectInputView(run(DUO_INPUT_B), catalog)
    expect(empty?.canSubmit).toBe(false)
    const filled = selectInputView(
      run([...DUO_INPUT_B, { type: 'SET_DRAFT', draft: { start: 0, end: 60 } }]),
      catalog,
    )
    expect(filled?.canSubmit).toBe(true)
  })

  it('returns null outside input steps', () => {
    expect(selectInputView(initialSessionState, catalog)).toBeNull()
    expect(selectInputView(run(DUO_INPUT_B.slice(0, 4)), catalog)).toBeNull()
  })
})

describe('selectComparisonView', () => {
  it('is not available before the reveal', () => {
    const ready = run([
      ...DUO_INPUT_B,
      { type: 'SET_DRAFT', draft: { start: 600, end: 1800 } },
      { type: 'SUBMIT_ANSWER' },
    ])
    expect(ready.step).toBe('READY_TO_REVEAL')
    expect(selectComparisonView(ready, catalog)).toBeNull()
  })

  it('compares A and B in duo mode', () => {
    const state = run([
      ...DUO_INPUT_B,
      { type: 'SET_DRAFT', draft: { start: 600, end: 1800 } },
      { type: 'SUBMIT_ANSWER' },
      { type: 'REVEAL' },
    ])
    const view = selectComparisonView(state, catalog)
    expect(view?.a).toEqual({ label: 'Aさん', range: { start: 120, end: 420 } })
    expect(view?.b).toEqual({ label: 'Bさん', range: { start: 600, end: 1800 } })
    expect(view?.result.relation).toBe('gap')
    expect(view?.result.gapLength).toBe(180)
    expect(view?.samples).toEqual([])
  })

  it('compares with a fictional sample in solo mode', () => {
    const state = run([
      { type: 'SELECT_MODE', mode: 'solo' },
      { type: 'SELECT_SCENARIO', scenarioId: 'sugu-iku' },
      { type: 'SET_DRAFT', draft: { start: 0, end: 300 } },
      { type: 'SUBMIT_ANSWER' },
    ])
    const view = selectComparisonView(state, catalog)
    expect(view?.a.label).toBe('あなた')
    expect(view?.b.label).toBe('ソラ（架空）')
    expect(view?.samples).toHaveLength(3)
    expect(view?.description.headline).toBe('2人の「すぐ行く」は重なりませんでした')
    expect(view?.candidates.map((c) => c.seconds)).toEqual([300, 1800])
  })
})

describe('selectAgreementView', () => {
  it('builds the text and feasibility question only after a time is chosen', () => {
    const base: SessionEvent[] = [
      { type: 'SELECT_MODE', mode: 'solo' },
      { type: 'SELECT_SCENARIO', scenarioId: 'sugu-iku' },
      { type: 'SET_DRAFT', draft: { start: 0, end: 300 } },
      { type: 'SUBMIT_ANSWER' },
      { type: 'START_AGREEMENT' },
    ]
    expect(selectAgreementView(run(base), catalog)).toEqual({
      seconds: null,
      text: null,
      parts: null,
      feasibilityQuestion: null,
      approvedBy: [],
      requiredApprovers: ['A'],
    })
    const chosen = selectAgreementView(run([...base, { type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 }]), catalog)
    expect(chosen?.text).toBe('今から10分以内に着くね')
    expect(chosen?.parts).toEqual({ when: '今から10分以内', action: '着く' })
    expect(chosen?.feasibilityQuestion).toBe('今から10分以内に、本当に着けそう？')
  })
})
