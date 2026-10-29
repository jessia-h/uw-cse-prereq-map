// Fixtures here are made-up test data, not catalog prerequisites.
import { describe, expect, it } from 'vitest'
import { formatPath, parseYaml, validate, type SourceFile } from './validate.ts'

const base = {
  credits: '4',
  prereq: null,
  prereqText: '',
  audience: 'majors',
  status: 'active',
  sources: [{ url: 'https://www.washington.edu/students/crscat/cse.html', retrieved: '2026-10-22' }],
  verified: { date: '2026-10-22', by: 'peer-adviser', method: 'catalog' },
}

/** A valid course file; override any field. */
function course(id: string, fields: Record<string, unknown> = {}): SourceFile {
  return {
    file: `data/courses/${id.replaceAll(' ', '')}.yaml`,
    data: { ...base, id, title: `Title of ${id}`, ...fields },
  }
}

function external(entries: Record<string, unknown>[]): SourceFile {
  return { file: 'data/external.yaml', data: entries }
}

const stub = (id: string, status = 'active') => ({
  id,
  status,
  url: 'https://www.washington.edu/students/crscat/',
})

describe('validate: valid data', () => {
  it('passes and returns courses sorted by id', () => {
    const result = validate(
      [
        course('CSE 312', { prereq: { course: 'CSE 311' }, prereqText: 'Prerequisite: CSE 311.' }),
        course('CSE 311', {
          prereq: { course: 'MATH 126', minGrade: 2.0 },
          prereqText: 'Prerequisite: MATH 126.',
        }),
      ],
      external([stub('MATH 126')]),
    )
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.data?.courses.map((c) => c.id)).toEqual(['CSE 311', 'CSE 312'])
    expect(result.data?.external.map((c) => c.id)).toEqual(['MATH 126'])
  })
})

describe('validate: schema errors name the file and field', () => {
  it('wrong type deep inside a requirement', () => {
    const result = validate(
      [
        course('CSE 311', {
          prereq: { all: [{ any: [{ course: 'CSE 123', minGrade: '2.0' }] }] },
          prereqText: 'Prerequisite: …',
        }),
      ],
      null,
    )
    expect(result.data).toBeNull()
    expect(result.errors).toEqual([
      'data/courses/CSE311.yaml: prereq.all[0].any[0].minGrade: Invalid input: expected number, received string',
    ])
  })

  it('missing required field', () => {
    const { title: _omit, ...data } = course('CSE 311').data as Record<string, unknown>
    const result = validate([{ file: 'data/courses/CSE311.yaml', data }], null)
    expect(result.errors).toEqual([
      'data/courses/CSE311.yaml: title: Invalid input: expected string, received undefined',
    ])
  })

  it('unknown key (typo)', () => {
    const result = validate([course('CSE 311', { prereqs: null })], null)
    expect(result.errors[0]).toMatch(/^data\/courses\/CSE311\.yaml: \(top level\): .*"prereqs"/)
  })

  it('requirement with none of all/any/course/other', () => {
    const result = validate(
      [course('CSE 311', { prereq: { cours: 'CSE 123' }, prereqText: 'x' })],
      null,
    )
    expect(result.errors).toEqual([
      'data/courses/CSE311.yaml: prereq: must be an object with one of the keys: all, any, course, other',
    ])
  })

  it('badly formatted course id', () => {
    const result = validate(
      [course('CSE 311', { prereq: { course: 'MATH126' }, prereqText: 'x' })],
      null,
    )
    expect(result.errors).toEqual([
      'data/courses/CSE311.yaml: prereq.course: must look like "CSE 451" or "E E 205"',
    ])
  })

  it('error in external.yaml names the entry index', () => {
    const result = validate([], external([{ id: 'MATH 126', status: 'active', url: 'not a url' }]))
    expect(result.errors).toEqual(['data/external.yaml: [0].url: Invalid URL'])
  })

  it('file name must match id', () => {
    const result = validate([{ ...course('CSE 311'), file: 'data/courses/CSE312.yaml' }], null)
    expect(result.errors).toEqual([
      'data/courses/CSE312.yaml: id: "CSE 311" should be in a file named CSE311.yaml',
    ])
  })

  it('requirements without verbatim prereqText', () => {
    const result = validate([course('CSE 312', { prereq: { other: 'Placement' } })], null)
    expect(result.errors).toEqual([
      'data/courses/CSE312.yaml: prereqText: is empty, but the course has requirements; copy the catalog text verbatim',
    ])
  })

  it('YAML syntax error names the file', () => {
    const result = parseYaml('data/courses/CSE311.yaml', 'id: "CSE 311\ntitle: x')
    expect('error' in result && result.error).toMatch(/^data\/courses\/CSE311\.yaml: YAML syntax error:/)
  })
})

describe('validate: references', () => {
  it('reference to a course that does not exist', () => {
    const result = validate(
      [
        course('CSE 451', {
          prereq: { all: [{ course: 'CSE 332' }, { course: 'CSE 999' }] },
          prereqText: 'x',
        }),
        course('CSE 332'),
      ],
      null,
    )
    expect(result.data).toBeNull()
    expect(result.errors).toEqual([
      'data/courses/CSE451.yaml: prereq.all[1].course: "CSE 999" does not exist; add data/courses/CSE999.yaml or a stub in data/external.yaml',
    ])
  })

  it('also checks recommended and coreq', () => {
    const result = validate(
      [course('CSE 197', { coreq: { course: 'CSE 121' }, recommended: { course: 'CSE 122' }, prereqText: 'x' })],
      null,
    )
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toMatch(/^data\/courses\/CSE197\.yaml: recommended\.course: "CSE 122"/)
    expect(result.errors[1]).toMatch(/^data\/courses\/CSE197\.yaml: coreq\.course: "CSE 121"/)
  })

  it('duplicate id across courses/ and external.yaml', () => {
    const result = validate([course('CSE 142')], external([stub('CSE 142', 'retired')]))
    expect(result.errors).toEqual([
      'data/external.yaml: [0]: id: "CSE 142" is already defined in data/courses/CSE142.yaml',
    ])
  })
})

describe('validate: prerequisite cycles', () => {
  it('two-course cycle is an error, reported once', () => {
    const result = validate(
      [
        course('CSE 311', { prereq: { course: 'CSE 312' }, prereqText: 'x' }),
        course('CSE 312', { prereq: { any: [{ course: 'CSE 311' }] }, prereqText: 'x' }),
      ],
      null,
    )
    expect(result.data).toBeNull()
    expect(result.errors).toEqual([
      'data/courses/CSE312.yaml: prereq.any[0].course: prerequisite cycle CSE 311 → CSE 312 → CSE 311',
    ])
  })

  it('longer cycle and self-reference', () => {
    const result = validate(
      [
        course('CSE 331', { prereq: { course: 'CSE 332' }, prereqText: 'x' }),
        course('CSE 332', { prereq: { course: 'CSE 333' }, prereqText: 'x' }),
        course('CSE 333', { prereq: { course: 'CSE 331' }, prereqText: 'x' }),
        course('CSE 351', { prereq: { course: 'CSE 351' }, prereqText: 'x' }),
      ],
      null,
    )
    expect(result.errors).toEqual([
      'data/courses/CSE333.yaml: prereq.course: prerequisite cycle CSE 331 → CSE 332 → CSE 333 → CSE 331',
      'data/courses/CSE351.yaml: prereq.course: prerequisite cycle CSE 351 → CSE 351',
    ])
  })

  it('co-requisites pointing at each other are not a cycle', () => {
    const result = validate(
      [
        course('CSE 121', { coreq: { course: 'CSE 197' }, prereqText: 'x' }),
        course('CSE 197', { coreq: { course: 'CSE 121' }, prereqText: 'x' }),
      ],
      null,
    )
    expect(result.errors).toEqual([])
  })
})

describe('validate: retired courses', () => {
  it('active course referencing a retired course is a warning, not an error', () => {
    const result = validate(
      [
        course('CSE 461', {
          prereq: { any: [{ course: 'CSE 326' }, { course: 'CSE 332' }] },
          prereqText: 'x',
        }),
        course('CSE 332'),
      ],
      external([stub('CSE 326', 'retired')]),
    )
    expect(result.errors).toEqual([])
    expect(result.data).not.toBeNull()
    expect(result.warnings).toEqual([
      'data/courses/CSE461.yaml: prereq.any[0].course: active course CSE 461 references retired course CSE 326',
    ])
  })

  it('retired course referencing a retired course: no warning', () => {
    const result = validate(
      [course('CSE 303', { status: 'retired', prereq: { course: 'CSE 142' }, prereqText: 'x' })],
      external([stub('CSE 142', 'retired')]),
    )
    expect(result.warnings).toEqual([])
  })
})

describe('formatPath', () => {
  it('formats Zod paths for messages', () => {
    expect(formatPath(['prereq', 'all', 0, 'any', 1, 'course'])).toBe('prereq.all[0].any[1].course')
    expect(formatPath([2, 'url'])).toBe('[2].url')
    expect(formatPath([])).toBe('(top level)')
  })
})
