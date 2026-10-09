import { describe, expect, it } from 'vitest'
import {
  completedAnswers,
  contextTransition,
  createContextReducer,
  createInitialContextState,
  type ContextEvent,
  type ContextState,
} from '../../src/domain/contextSession'

const CONFIG = { sceneCount: 3, maxSeconds: 1800 }
const initial = createInitialContextState(3)

function run(events: ContextEvent[], from: ContextState = initial): ContextState {
  return events.reduce((state, event) => {
    const result = contextTransition(state, event, CONFIG)
    if (!result.ok) throw new Error(`${event.type} rejected: ${result.error}`)
    return result.state
  }, from)
}

const answer = (start: number | null, end: number | null): ContextEvent[] => [
  { type: 'SET_DRAFT', draft: { start, end } },
  { type: 'SUBMIT_ANSWER' },
]

describe('context session', () => {
  it('starts unanswered on the first scene', () => {
    expect(initial).toEqual({ step: 'INPUT', index: 0, draft: { start: null, end: null }, answers: [null, null, null] })
    expect(completedAnswers(initial)).toBeNull()
  })

  it('accepts three scenes in order and shows the result', () => {
    const done = run([...answer(0, 300), ...answer(60, 600), ...answer(300, 1800)])
    expect(done.step).toBe('RESULT')
    expect(completedAnswers(done)).toEqual([
      { start: 0, end: 300 },
      { start: 60, end: 600 },
      { start: 300, end: 1800 },
    ])
  })

  it('clears the draft between scenes (no carry-over of the previous answer)', () => {
    const second = run(answer(0, 300))
    expect(second.index).toBe(1)
    expect(second.draft).toEqual({ start: null, end: null })
  })

  it.each([
    ['unanswered', null, null],
    ['half answered', 0, null],
    ['not a number', Number.NaN, 300],
    ['negative', -60, 300],
    ['reversed', 600, 300],
    ['over the maximum', 0, 1860],
    ['not an integer', 0.5, 300],
  ])('rejects %s answers', (_, start, end) => {
    const state = run([{ type: 'SET_DRAFT', draft: { start, end } }])
    const result = contextTransition(state, { type: 'SUBMIT_ANSWER' }, CONFIG)
    expect(result.ok).toBe(false)
    expect(result.state).toBe(state)
  })

  it('accepts 0, the maximum and zero-length ranges', () => {
    const done = run([...answer(0, 0), ...answer(1800, 1800), ...answer(0, 1800)])
    expect(completedAnswers(done)).toEqual([
      { start: 0, end: 0 },
      { start: 1800, end: 1800 },
      { start: 0, end: 1800 },
    ])
  })

  it('goes back to the previous scene with its answer restored, and forward again', () => {
    const second = run([...answer(0, 300), { type: 'SET_DRAFT', draft: { start: 60, end: null } }])
    const back = run([{ type: 'BACK' }], second)
    expect(back.index).toBe(0)
    expect(back.draft).toEqual({ start: 0, end: 300 })
    const again = run([{ type: 'SUBMIT_ANSWER' }], back)
    expect(again.index).toBe(1)
  })

  it('rejects BACK on the first scene (the app returns to the start screen instead)', () => {
    expect(contextTransition(initial, { type: 'BACK' }, CONFIG)).toMatchObject({ ok: false, error: 'at-first-scene' })
  })

  it('rejects input events on the result screen', () => {
    const done = run([...answer(0, 300), ...answer(60, 600), ...answer(300, 1800)])
    expect(contextTransition(done, { type: 'SET_DRAFT', draft: { start: 0, end: 0 } }, CONFIG).ok).toBe(false)
    expect(contextTransition(done, { type: 'SUBMIT_ANSWER' }, CONFIG).ok).toBe(false)
    expect(contextTransition(done, { type: 'BACK' }, CONFIG).ok).toBe(false)
  })

  it('RETRY resets everything', () => {
    const done = run([...answer(0, 300), ...answer(60, 600), ...answer(300, 1800)])
    expect(run([{ type: 'RETRY' }], done)).toEqual(initial)
  })

  it('reducer returns the same object for rejected events', () => {
    const reducer = createContextReducer(CONFIG)
    expect(reducer(initial, { type: 'SUBMIT_ANSWER' })).toBe(initial)
  })
})
