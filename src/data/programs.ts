// Degree programs and course lists: src/generated/programs.json, written by
// `npm run data` after validation (see scripts/validate-programs.ts).

import raw from '../generated/programs.json'
import { buildDegreeModel } from '../lib/degree.ts'
import { shownData } from './courses.ts'
import type { ProgramData } from './schema.ts'

export type Degree = 'cs' | 'ds' | 'ce'
/** Display order: the degree control, "All" mode tags, and the panel. */
export const DEGREES: Degree[] = ['cs', 'ds', 'ce']

const loaded = raw as unknown as ProgramData
export const programData: ProgramData = {
  ...loaded,
  programs: [...loaded.programs].sort((a, b) => DEGREES.indexOf(a.id as Degree) - DEGREES.indexOf(b.id as Degree)),
}

/** Roles of the courses the interface shows, in each program. */
export const degreeModel = buildDegreeModel(programData, shownData)
