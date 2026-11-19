import { describe, expect, it } from 'vitest'
import { shownData } from '../data/courses.ts'
import { degreeModel as m, programData } from '../data/programs.ts'

// Uses the real program and list data (rebuilt by `npm test`).

const role = (course: string, degree: string) => {
  const r = m.roleOf(course, degree)
  return `${r.tier}: ${r.badge ?? r.label}`
}

describe('degree roles: the cases from the brief', () => {
  it('CSE 331: Required for CS, Core for CE', () => {
    expect(role('CSE 331', 'cs')).toBe('required: Required')
    expect(role('CSE 331', 'ce')).toBe('elective: Core')
    // Required for CS, and not counted as Core there.
    expect(m.roleOf('CSE 331', 'cs').groups.map((g) => g.id)).toEqual(['cs-required'])
  })

  it('CSE 369: Required for CE, Core for CS', () => {
    expect(role('CSE 369', 'ce')).toBe('required: Required')
    expect(m.roleOf('CSE 369', 'ce').groups.map((g) => g.id)).toEqual(['ce-required'])
    expect(role('CSE 369', 'cs')).toBe('elective: Core')
  })

  it('CSE 446: Required for DS, Core for CS and CE', () => {
    expect(role('CSE 446', 'ds')).toBe('required: Required')
    expect(role('CSE 446', 'cs')).toBe('elective: Core')
    expect(role('CSE 446', 'ce')).toBe('elective: Core')
  })

  it('CSE 474 in CE: "1 of 4 required" wins the tie with CE systems elective; the panel gets both', () => {
    expect(role('CSE 474', 'ce')).toBe('choose: 1 of 4 required')
    expect(m.roleOf('CSE 474', 'ce').groups.map((g) => g.id)).toEqual(['ce-one-of-four', 'ce-systems', 'ce-core'])
  })

  it('CSE 373 does not count in any program', () => {
    for (const d of ['cs', 'ds', 'ce']) {
      expect(m.roleOf('CSE 373', d)).toMatchObject({ tier: 'unused', label: 'Does not count (majors must take CSE 332)' })
    }
  })
})

describe('degree roles: answers from the review', () => {
  it('Core and Elective badges (same strength, different text)', () => {
    expect(role('CSE 333', 'cs')).toBe('elective: Core')
    expect(role('CSE 480', 'cs')).toBe('elective: Elective')
    expect(role('CSE 480', 'ce')).toBe('choose: 1 of 4 required')
  })

  it('exceptions: CSE 374 free elective (no badge), CSE 414 "Check with adviser" with a note', () => {
    expect(m.roleOf('CSE 374', 'cs')).toMatchObject({ tier: 'neutral', badge: undefined, label: 'Free elective only' })
    expect(m.roleOf('CSE 414', 'ce')).toMatchObject({
      tier: 'neutral',
      badge: 'Check with adviser',
      note: 'May substitute for a 300-level Core course if taken before admission to the Allen School.',
    })
  })

  it('courses that lead to a required course are neutral (CSE 121, 122 via recommendations; MATH 126 via CSE 311)', () => {
    for (const d of ['cs', 'ds', 'ce']) {
      expect(m.roleOf('CSE 121', d)).toMatchObject({ tier: 'neutral', label: 'Leads to a required course' })
      expect(m.roleOf('CSE 122', d).tier).toBe('neutral')
      expect(m.roleOf('MATH 126', d).tier).toBe('neutral')
    }
  })

  it('non-CSE courses are never "unused", but keep a real role (E E 215 for CE, SOC 225 for DS, STAT 391 Core)', () => {
    expect(m.roleOf('MATH 208', 'cs')).toMatchObject({ tier: 'neutral', label: 'Not part of the CSE requirements' })
    expect(role('E E 215', 'ce')).toBe('required: Required')
    expect(role('SOC 225', 'ds')).toBe('required: Required')
    expect(role('STAT 391', 'cs')).toBe('elective: Core')
  })

  it('DS extends CS: CS groups first, and its extra required courses also count as Core', () => {
    expect(m.groupsOf('ds').map((g) => g.id)).toEqual([
      'cs-required',
      'cs-core',
      'cs-capstone',
      'cs-electives',
      'ds-required',
      'ds-elective',
    ])
    expect(role('CSE 311', 'ds')).toBe('required: Required')
    expect(m.roleOf('CSE 442', 'ds').groups.map((g) => g.id)).toEqual(['ds-required', 'cs-core', 'cs-electives'])
  })

  it('required with a minimum grade says so in words', () => {
    expect(m.roleOf('CSE 123', 'cs').label).toBe('Required (minimum grade 2.0)')
    expect(m.roleOf('CSE 421', 'ds').label).toBe('Required')
  })

  it('pending lists are empty, so they give no roles', () => {
    for (const id of ['capstone', 'ds-electives']) {
      expect(programData.lists.find((l) => l.id === id)).toMatchObject({ status: 'pending', courses: [] })
    }
    const capstone = m.groupsOf('ce').find((g) => g.id === 'ce-capstone')!
    expect(m.membersOf(capstone).size).toBe(0)
  })

  it('CSE 466, 467 and 471 are recorded as conflicts, not list members', () => {
    const systems = programData.lists.find((l) => l.id === 'ce-systems')!
    expect(systems.courses).not.toContain('CSE 466')
    expect(systems.conflicts?.[0]).toMatch(/CSE 466, 467 and 471/)
  })

  it('requiredIn lists every program where a course is Required ("All" mode tags)', () => {
    expect(m.requiredIn('CSE 311').map((p) => p.short)).toEqual(['CS', 'DS', 'CE'])
    expect(m.requiredIn('CSE 369').map((p) => p.short)).toEqual(['CE'])
    expect(m.requiredIn('CSE 446').map((p) => p.short)).toEqual(['DS'])
  })
})

describe('the CSE Electives list follows its rule', () => {
  // "Any course on the CSE Core list; any graded 400-level CSE course whose
  // audience is not nonmajor; CSE 480." A new 400-level course must be added
  // to data/lists.yaml (or be credit/no-credit, or nonmajor).
  it('every graded 400-level CSE course that is not nonmajor is an Elective (or Core)', () => {
    const electives = m.membersOf(m.groupsOf('cs').find((g) => g.id === 'cs-electives')!)
    const shouldBe = shownData.courses.filter(
      (c) =>
        /^CSE 4\d\d$/.test(c.id) &&
        c.audience !== 'nonmajor' &&
        !c.notes?.includes('Credit/no-credit only') &&
        c.id !== 'CSE 331',
    )
    for (const c of shouldBe) expect(electives.has(c.id), c.id).toBe(true)
    expect(electives.has('CSE 480')).toBe(true)
  })
})
