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
