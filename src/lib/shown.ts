// What the interface shows. Retired courses stay in the data, and prereq.ts
// still counts them (a student who took CSE 142 can take CSE 143), but they
// never appear in the interface: not on the map, in the list, in search, in
// Unlocks, in accessible names, or in plain-language text. The one exception
// is the catalog's own prerequisite text (`prereqText`), shown verbatim.
//
// Removing an option can leave an OR with one course; it becomes a plain
// requirement, so CSE 461 needs "CSE 332 and CSE 333".

import type { CourseData, Req } from '../data/schema.ts'

/** `req` without the given courses; null if nothing is left. */
export function withoutCourses(req: Req, hidden: Set<string>): Req | null {
  if ('course' in req) return hidden.has(req.course) ? null : req
  if ('other' in req) return req
  const key = 'all' in req ? 'all' : 'any'
  const kept = ('all' in req ? req.all : req.any).flatMap((r) => withoutCourses(r, hidden) ?? [])
  if (kept.length === 0) return null
  return kept.length === 1 ? kept[0] : ({ [key]: kept } as Req)
}

export function withoutRetired(data: CourseData): CourseData {
  // A course can be retired in its own file or as a stub in external.yaml.
  const retired = new Set(
    [...data.courses, ...data.external].filter((c) => c.status === 'retired').map((c) => c.id),
  )
  const strip = (req: Req | undefined) => (req ? (withoutCourses(req, retired) ?? undefined) : undefined)
  return {
    ...data,
    external: data.external.filter((c) => !retired.has(c.id)),
    courses: data.courses.filter((c) => !retired.has(c.id)).map((c) => {
      const course = { ...c, prereq: c.prereq ? withoutCourses(c.prereq, retired) : null }
      const recommended = strip(c.recommended)
      const coreq = strip(c.coreq)
      if (recommended) course.recommended = recommended
      else delete course.recommended
      if (coreq) course.coreq = coreq
      else delete course.coreq
      return course
    }),
  }
}
