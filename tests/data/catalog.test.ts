import { describe, expect, it } from 'vitest'
import { validateRange } from '../../src/domain/range'
import { SAMPLES } from '../../src/data/samples'
import { SCENARIOS } from '../../src/data/scenarios'

describe('scenarios', () => {
  it('defines the three MVP scenarios with the agreed maximums', () => {
    expect(SCENARIOS.map((s) => [s.id, s.maxSeconds])).toEqual([
      ['sugu-iku', 3600],
      ['chotto-matte', 1800],
      ['atode-yaru', 43200],
    ])
  })

  it.each(SCENARIOS)('$id has a valid step and templates', (scenario) => {
    expect(Number.isInteger(scenario.inputStepSeconds)).toBe(true)
    expect(scenario.inputStepSeconds).toBeGreaterThan(0)
    expect(scenario.maxSeconds % scenario.inputStepSeconds).toBe(0)
    expect(scenario.agreementTemplate).toContain('{time}')
    expect(scenario.feasibilityTemplate).toContain('{time}')
  })
})

describe('fictional samples', () => {
  it.each(SCENARIOS)('$id has three fictional samples', (scenario) => {
    const samples = SAMPLES.filter((s) => s.scenarioId === scenario.id)
    expect(samples).toHaveLength(3)
    for (const sample of samples) {
      expect(sample.fictional).toBe(true)
      expect(validateRange(sample.range, scenario.maxSeconds).ok).toBe(true)
      expect(sample.range.start % scenario.inputStepSeconds).toBe(0)
      expect(sample.range.end % scenario.inputStepSeconds).toBe(0)
    }
  })

  it('has unique sample ids', () => {
    const ids = SAMPLES.map((s) => s.sampleId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('context scenes (場面を変えて比べる)', () => {
  it('defines three scenes with a shared origin, endpoint rule and maximum', async () => {
    const { CONTEXT_SCENES, CONTEXT_SETTINGS } = await import('../../src/data/contextScenes')
    expect(CONTEXT_SCENES.map((s) => s.phrase)).toEqual(['すぐ行く', 'すぐ返信する', 'すぐ始める'])
    expect(CONTEXT_SETTINGS.maxSeconds).toBe(1800)
    expect(CONTEXT_SETTINGS.maxSeconds % CONTEXT_SETTINGS.inputStepSeconds).toBe(0)
    expect(new Set(CONTEXT_SCENES.map((s) => s.id)).size).toBe(3)
    for (const scene of CONTEXT_SCENES) {
      // 同じ言葉（すぐ）を使い、起点（伝えたとき）からの時間をたずねる
      expect(scene.phrase.startsWith(CONTEXT_SETTINGS.word)).toBe(true)
      expect(scene.question).toContain('伝えてから')
      expect(scene.question).toContain(scene.phrase)
    }
  })
})
