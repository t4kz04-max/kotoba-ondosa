import { describe, expect, it } from 'vitest'
import { APP_SUBTITLE, APP_TITLE } from '../src/app/appInfo'

describe('appInfo', () => {
  it('exposes the project title and subtitle', () => {
    expect(APP_TITLE).toBe('言葉の温度差')
    expect(APP_SUBTITLE).toBe('同じ言葉なのに、同じ意味じゃない。')
  })
})
