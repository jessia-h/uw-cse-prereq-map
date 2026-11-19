import { describe, expect, it } from 'vitest'
import { courseData } from '../data/courses.ts'
import type { Course, Req } from '../data/schema.ts'
import {
  ancestors,
  buildGraph,
  descendants,
  eligibility,
  satisfied,
  type Completed,
  type Related,
} from './prereq.ts'

// Most tests use the real course data (src/generated/courses.json, rebuilt by
// `npm test`). If the catalog data changes, these are expected to change too.

function course(id: string): Course {
  const found = courseData.courses.find((c) => c.id === id)
  if (!found) throw new Error(`no course ${id} in courses.json`)
  return found
}

/** done({ 'CSE 123': 3.0, 'CSE 351': null }) — null means grade unknown. */
const done = (grades: Record<string, number | null> = {}): Completed => new Map(Object.entries(grades))
const taking = (...ids: string[]) => new Set(ids)

const prereq = (id: string, completed: Completed, current = taking()) =>
  satisfied(course(id).prereq, completed, current)

const graph = buildGraph(courseData)
const rel = (id: string, relation: Related['relation'], depth: number): Related => ({ id, relation, depth })

describe('satisfied: minimum grades (CSE 311, 414)', () => {
  it('after CSE 123 (3.0) and MATH 126 (2.5), CSE 311 is eligible but CSE 332 is not yet', () => {
    const completed = done({ 'CSE 123': 3.0, 'MATH 126': 2.5 })
    expect(prereq('CSE 311', completed)).toBe('eligible')
    expect(prereq('CSE 332', completed)).toBe('not-yet')
  })

  it('CSE 143 with a 1.9 does not satisfy CSE 311', () => {
    expect(prereq('CSE 311', done({ 'CSE 143': 1.9, 'MATH 126': 3.0 }))).toBe('not-yet')
  })

  it('a low grade in one option is fine if another option meets the minimum', () => {
    expect(prereq('CSE 311', done({ 'CSE 143': 1.9, 'CSE 123': 2.0, 'MATH 135': 2.0 }))).toBe('eligible')
  })

  it('unknown grade where a minimum applies → check-with-adviser', () => {
    expect(prereq('CSE 311', done({ 'CSE 123': null, 'MATH 126': 3.0 }))).toBe('check-with-adviser')
  })

  it('unknown grade does not matter when another option is clearly met', () => {
    expect(prereq('CSE 311', done({ 'CSE 123': null, 'CSE 143': 2.5, 'MATH 126': 3.0 }))).toBe('eligible')
  })

  it('a clear not-yet in an AND outweighs an unknown grade elsewhere', () => {
    expect(prereq('CSE 311', done({ 'CSE 123': null }))).toBe('not-yet')
  })

  it('CSE 414 needs 2.5: 2.4 is not enough, exactly 2.5 is', () => {
    expect(prereq('CSE 414', done({ 'CSE 143': 2.4 }))).toBe('not-yet')
    expect(prereq('CSE 414', done({ 'CSE 163': 2.5 }))).toBe('eligible')
  })

  it('no minimum grade: an unknown grade still counts (CSE 312 after CSE 311)', () => {
    expect(prereq('CSE 312', done({ 'CSE 311': null }))).toBe('eligible')
  })
})

describe('satisfied: AND (CSE 451)', () => {
  it('needs all three of CSE 332, 333, 351', () => {
    expect(prereq('CSE 451', done({ 'CSE 332': 3.0, 'CSE 333': 3.0 }))).toBe('not-yet')
    expect(prereq('CSE 451', done({ 'CSE 332': 3.0, 'CSE 333': 3.0, 'CSE 351': 3.0 }))).toBe('eligible')
  })

  it('a course in progress does not count as a prerequisite', () => {
    const completed = done({ 'CSE 332': 3.0, 'CSE 333': 3.0 })
    expect(prereq('CSE 451', completed, taking('CSE 351'))).toBe('not-yet')
  })
})

describe('satisfied: nested OR (CSE 469)', () => {
  it('one option from each group', () => {
    expect(prereq('CSE 469', done({ 'E E 271': 3.0, 'CSE 143': 3.0 }))).toBe('eligible')
    expect(prereq('CSE 469', done({ 'CSE 369': 3.0, 'CSE 123': 3.0 }))).toBe('eligible')
  })

  it('both options of one group but none of the other is not enough', () => {
    expect(prereq('CSE 469', done({ 'E E 271': 3.0, 'CSE 369': 3.0 }))).toBe('not-yet')
  })
})

describe('satisfied: retired alternatives (CSE 461)', () => {
  it('retired CSE 326 and CSE 303 still satisfy their groups', () => {
    expect(prereq('CSE 461', done({ 'CSE 326': 3.0, 'CSE 303': 3.0 }))).toBe('eligible')
    expect(prereq('CSE 461', done({ 'CSE 332': 3.0, 'CSE 303': 3.0 }))).toBe('eligible')
  })

  it('current courses alone: needs both CSE 332 and CSE 333', () => {
    expect(prereq('CSE 461', done({ 'CSE 332': 3.0 }))).toBe('not-yet')
    expect(prereq('CSE 461', done({ 'CSE 332': 3.0, 'CSE 333': 3.0 }))).toBe('eligible')
  })

  it('CSE 143 is satisfied by retired CSE 142', () => {
    expect(prereq('CSE 143', done({ 'CSE 142': 3.0 }))).toBe('eligible')
  })
})

describe('satisfied: other leaves and no requirement', () => {
  it('no prerequisite → eligible (CSE 121)', () => {
    expect(prereq('CSE 121', done())).toBe('eligible')
  })

  it('an other leaf (Guided Self-Placement) → check-with-adviser', () => {
    expect(satisfied(course('CSE 121').recommended!, done(), taking())).toBe('check-with-adviser')
  })

  it('OR with an other leaf: a completed course option makes it eligible (CSE 122)', () => {
    const rec = course('CSE 122').recommended!
    expect(satisfied(rec, done({ 'CSE 121': 3.0 }), taking())).toBe('eligible')
    expect(satisfied(rec, done(), taking())).toBe('check-with-adviser')
  })
})

describe('eligibility: co-requisites (CSE 197)', () => {
  it('reports the co-requisite separately from prerequisites', () => {
    expect(eligibility(course('CSE 197'), done(), taking())).toEqual({ prereq: 'eligible', coreq: 'not-yet' })
  })

  it('met by a course in progress', () => {
    expect(eligibility(course('CSE 197'), done(), taking('CSE 122'))).toEqual({
      prereq: 'eligible',
      coreq: 'eligible',
    })
  })

  it('met by a completed course', () => {
    expect(eligibility(course('CSE 197'), done({ 'CSE 121': 3.5 }), taking()).coreq).toBe('eligible')
  })

  it('courses without a co-requisite report null', () => {
    expect(eligibility(course('CSE 451'), done(), taking()).coreq).toBeNull()
  })
})

describe('recommended never affects eligibility (CSE 447)', () => {
  it('eligible with CSE 312 and 332, without MATH 208 or CSE 446', () => {
    const result = eligibility(course('CSE 447'), done({ 'CSE 312': 3.0, 'CSE 332': 3.0 }), taking())
    expect(result).toEqual({ prereq: 'eligible', coreq: null })
  })

  it('the concurrent-ok recommendation accepts CSE 446 in progress', () => {
    const rec = course('CSE 447').recommended!
    expect(satisfied(rec, done({ 'MATH 208': 3.0 }), taking('CSE 446'))).toBe('eligible')
    expect(satisfied(rec, done({ 'MATH 208': 3.0 }), taking())).toBe('not-yet')
  })

  it('timing "before" (the default) does not accept a course in progress', () => {
    const rec = course('CSE 447').recommended!
    expect(satisfied(rec, done({ 'CSE 446': 3.0 }), taking('MATH 208'))).toBe('not-yet')
  })
})

describe('satisfied: made-up edge cases', () => {
  const none = done()
  it('AND containing an other leaf and a met course → check-with-adviser', () => {
    const req: Req = { all: [{ course: 'X 100' }, { other: 'Instructor permission' }] }
    expect(satisfied(req, done({ 'X 100': 3.0 }), taking())).toBe('check-with-adviser')
  })

  it('OR of only unmet courses → not-yet', () => {
    expect(satisfied({ any: [{ course: 'X 100' }, { course: 'X 200' }] }, none, taking())).toBe('not-yet')
  })

  it('null requirement → eligible', () => {
    expect(satisfied(null, none, taking())).toBe('eligible')
  })
})

describe('ancestors (prereq only)', () => {
  it("CSE 469's ancestors include E E 271 and CSE 369 marked as alternatives", () => {
    expect(ancestors('CSE 469', graph)).toEqual([
      rel('CSE 123', 'alternative', 1),
      rel('CSE 143', 'alternative', 1),
      rel('CSE 369', 'alternative', 1),
      rel('E E 271', 'alternative', 1),
      rel('CSE 142', 'alternative', 2),
      rel('CSE 311', 'alternative', 2),
      rel('MATH 126', 'alternative', 3),
      rel('MATH 135', 'alternative', 3),
    ])
  })

  it('CSE 451: AND links stay required; anything under an OR is an alternative', () => {
    expect(ancestors('CSE 451', graph)).toEqual([
      rel('CSE 332', 'required', 1),
      rel('CSE 333', 'required', 1),
      rel('CSE 351', 'required', 1),
      rel('CSE 123', 'alternative', 2),
      rel('CSE 143', 'alternative', 2),
      rel('CSE 311', 'required', 2),
      rel('CSE 142', 'alternative', 3),
      rel('MATH 126', 'alternative', 3),
      rel('MATH 135', 'alternative', 3),
    ])
  })

  it('CSE 461: retired courses appear as alternatives', () => {
    const result = ancestors('CSE 461', graph)
    expect(result).toContainEqual(rel('CSE 326', 'alternative', 1))
    expect(result).toContainEqual(rel('CSE 303', 'alternative', 1))
    expect(result).toContainEqual(rel('CSE 332', 'alternative', 1))
  })

  it('co-requisites and recommendations are not ancestors (CSE 197, CSE 122, CSE 447)', () => {
    expect(ancestors('CSE 197', graph)).toEqual([])
    expect(ancestors('CSE 122', graph)).toEqual([])
    expect(ancestors('CSE 447', graph).map((r) => r.id)).not.toContain('CSE 446')
    expect(ancestors('CSE 447', graph).map((r) => r.id)).not.toContain('MATH 208')
  })

  it('external courses have no ancestors', () => {
    expect(ancestors('MATH 126', graph)).toEqual([])
  })
})

describe('descendants (prereq only)', () => {
  it('CSE 311: required where it is the only route, alternative where it is one option', () => {
    expect(descendants('CSE 311', graph)).toEqual([
      rel('CSE 312', 'required', 1),
      rel('CSE 332', 'required', 1),
      rel('CSE 344', 'required', 1), // "Prerequisite: CSE 311."
      rel('CSE 369', 'required', 1),
      rel('CSE 371', 'alternative', 2),
      rel('CSE 401', 'required', 2), // via CSE 332: "CSE 332 and CSE 351"
      rel('CSE 403', 'required', 2), // via CSE 332: "CSE 331; CSE 332"
      rel('CSE 421', 'required', 2),
      rel('CSE 442', 'required', 2), // via CSE 332: "Prerequisite: CSE 332."
      rel('CSE 444', 'required', 2), // via CSE 332: "CSE 332; and either CSE 344 or CSE 414")
      rel('CSE 446', 'required', 2), // via CSE 332 (required), even though via CSE 312 it is an option
      rel('CSE 447', 'required', 2),
      rel('CSE 451', 'required', 2),
      rel('CSE 461', 'alternative', 2),
      rel('CSE 469', 'alternative', 2),
      rel('CSE 484', 'required', 2), // via CSE 332: "CSE 332; CSE 351."
    ])
  })

  it('CSE 123 is one option everywhere, so every descendant is an alternative', () => {
    const result = descendants('CSE 123', graph)
    expect(result.filter((r) => r.depth === 1).map((r) => r.id)).toEqual([
      'CSE 154',
      'CSE 163',
      'CSE 311',
      'CSE 331',
      'CSE 340',
      'CSE 341',
      'CSE 351',
      'CSE 373',
      'CSE 374',
      'CSE 391',
      'CSE 414',
      'CSE 469',
      'CSE 474',
    ])
    expect(result.every((r) => r.relation === 'alternative')).toBe(true)
  })

  it('retired CSE 326 unlocks only CSE 461, as an alternative', () => {
    expect(descendants('CSE 326', graph)).toEqual([rel('CSE 461', 'alternative', 1)])
  })

  it('co-requisites and recommendations are not descendants (CSE 121, CSE 446)', () => {
    expect(descendants('CSE 121', graph)).toEqual([])
    expect(descendants('CSE 446', graph)).toEqual([])
  })
})
