import { describe, expect, it } from 'vitest'
import type { Course, CourseData } from '../data/schema.ts'
import { withoutRetired } from './shown.ts'

const course = (id: string, extra: Partial<Course> = {}): Course => ({
  id,
  title: id,
  credits: '4',
  prereq: null,
  prereqText: '',
  audience: 'unknown',
  status: 'active',
  sources: [{ url: 'https://example.edu', retrieved: '2026-10-22' }],
  verified: { date: '2026-10-22', by: 'test', method: 'catalog' },
  ...extra,
})

describe('withoutRetired', () => {
  it('hides a course retired in its own file, not only stubs in external.yaml', () => {
    const data: CourseData = {
      courses: [
        course('CSE 300', { status: 'retired' }),
        course('CSE 400', { prereq: { any: [{ course: 'CSE 300' }, { course: 'CSE 301' }] } }),
      ],
      external: [{ id: 'CSE 301', status: 'active', url: 'https://example.edu' }],
    }
    const shown = withoutRetired(data)
    expect(shown.courses.map((c) => c.id)).toEqual(['CSE 400'])
    // The OR with one option left becomes a plain requirement.
    expect(shown.courses[0].prereq).toEqual({ course: 'CSE 301' })
  })
})
