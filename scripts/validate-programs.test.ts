import { describe, expect, it } from 'vitest'
import { validatePrograms } from './validate-programs.ts'

const SOURCES = [{ url: 'https://example.edu', retrieved: '2026-10-22' }]
const VERIFIED = { date: '2026-10-22', by: 'peer-adviser', method: 'catalog' }
const known = new Set(['CSE 123', 'CSE 143', 'CSE 311', 'CSE 401'])

const lists = (extra: object = {}) => ({
  file: 'data/lists.yaml',
  data: {
    sources: SOURCES,
    verified: VERIFIED,
    lists: [{ id: 'core', name: 'Core', courses: ['CSE 401'] }],
    ...extra,
  },
})
const program = (id: string, extra: object = {}) => ({
  file: `data/programs/${id}.yaml`,
  data: {
    id,
    name: id.toUpperCase(),
    short: id.toUpperCase(),
    sources: SOURCES,
    verified: VERIFIED,
    groups: [{ id: `${id}-req`, role: 'required', badge: 'Required', courses: [{ any: ['CSE 123', 'CSE 143'] }, 'CSE 311'] }],
    ...extra,
  },
})

describe('validatePrograms', () => {
  it('accepts valid files', () => {
    const r = validatePrograms([program('cs')], lists(), known)
    expect(r.errors).toEqual([])
    expect(r.data?.programs.map((p) => p.id)).toEqual(['cs'])
  })

  it('a course not in the data is a warning naming the file and field', () => {
    const r = validatePrograms(
      [program('cs')],
      lists({ lists: [{ id: 'core', name: 'Core', courses: ['CSE 401', 'CSE 402'] }] }),
      known,
    )
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual(['data/lists.yaml: lists[0].courses[1]: CSE 402 is not in the course data yet'])
  })

  it('schema errors name the file and field', () => {
    const r = validatePrograms([program('cs', { groups: [{ id: 'x', role: 'mandatory', badge: 'R', courses: [] }] })], lists(), known)
    expect(r.errors[0]).toMatch(/^data\/programs\/cs\.yaml: groups\[0\]\.role: /)
  })

  it('a group needs exactly one of courses or list', () => {
    const r = validatePrograms([program('cs', { groups: [{ id: 'x', role: 'elective', badge: 'Core', courses: ['CSE 401'], list: 'core' }] })], lists(), known)
    expect(r.errors[0]).toMatch(/give exactly one of `courses` or `list`/)
  })

  it('unknown list, unknown extends, duplicate group, duplicate course, wrong file name', () => {
    const r = validatePrograms(
      [
        program('cs', {
          extends: 'xx',
          groups: [
            { id: 'a', role: 'elective', badge: 'Core', list: 'nope' },
            { id: 'a', role: 'required', badge: 'Required', courses: ['CSE 311', 'CSE 311'] },
          ],
        }),
        { ...program('ce'), file: 'data/programs/eng.yaml' },
      ],
      lists(),
      known,
    )
    expect(r.errors).toEqual([
      'data/programs/eng.yaml: id: "ce" should be in a file named ce.yaml',
      'data/programs/cs.yaml: extends: no other program "xx"',
      'data/programs/cs.yaml: groups[0].list: no list "nope" in data/lists.yaml',
      'data/programs/cs.yaml: groups[1].id: "a" is already used (including the program it extends)',
      'data/programs/cs.yaml: groups[1].courses[1]: CSE 311 is listed twice',
    ])
    expect(r.data).toBeNull()
  })

  it('a pending list must be empty; includes must name a list', () => {
    const r = validatePrograms(
      [program('cs')],
      lists({
        lists: [
          { id: 'core', name: 'Core', courses: ['CSE 401'], includes: ['missing'] },
          { id: 'capstone', name: 'Capstone', status: 'pending', courses: ['CSE 401'] },
        ],
      }),
      known,
    )
    expect(r.errors).toEqual([
      'data/lists.yaml: lists[1].courses: "capstone" is pending, so it must be empty until the list is available',
      'data/lists.yaml: lists[0].includes[0]: no list "missing"',
    ])
  })

  it('a missing lists file is an error', () => {
    expect(validatePrograms([program('cs')], null, known).errors[0]).toMatch(/^data\/lists\.yaml: not found/)
  })
})
