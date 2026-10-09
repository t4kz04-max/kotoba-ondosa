import type { SessionCatalog } from '../domain/session'
import { SAMPLES } from './samples'
import { SCENARIOS } from './scenarios'

export const defaultCatalog: SessionCatalog = {
  scenarios: SCENARIOS,
  samples: SAMPLES,
}
