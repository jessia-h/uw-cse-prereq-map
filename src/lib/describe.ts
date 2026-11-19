// Requirements and courses in plain words, for accessible names and labels.

import type { Course, ExternalCourse, Req } from '../data/schema.ts'

/** "a", "a and b", "a, b, and c". Groups always get commas, so nesting reads clearly. */
function join(items: string[], word: 'and' | 'or', grouped: boolean): string {
  if (items.length === 1) return items[0]
  if (items.length === 2 && !grouped) return `${items[0]} ${word} ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, ${word} ${items[items.length - 1]}`
}

const isGroup = (r: Req) => 'all' in r || 'any' in r

/**
 * A requirement in plain words, e.g.
 * "one of E E 271 or CSE 369, and one of CSE 123 or CSE 143".
 * Minimum grades are inline unless `grades` is false.
 */
export function describeReq(req: Req, { grades = true } = {}): string {
  if ('course' in req) {
    let text = req.course
    if (grades && req.minGrade !== undefined) text += ` (minimum grade ${req.minGrade.toFixed(1)})`
    if (req.timing === 'concurrent-ok') text += ' (before or at the same time)'
    return text
  }
  if ('other' in req) return req.other
  if ('any' in req) {
    const options = req.any.map((r) => describeReq(r, { grades }))
    return options.length === 1 ? options[0] : `one of ${join(options, 'or', req.any.some(isGroup))}`
  }
  return join(req.all.map((r) => describeReq(r, { grades })), 'and', req.all.some(isGroup))
}

/**
 * A co-requisite as a short line, e.g. "Take with one of CSE 121, CSE 122, CSE 123".
 * Shown as text on the node; co-requisites get no arrows.
 */
export function coreqText(req: Req): string {
  if ('course' in req) return `Take with ${describeReq(req)}`
  if ('any' in req && req.any.every((r) => 'course' in r && r.minGrade === undefined)) {
    return `Take with one of ${req.any.map((r) => describeReq(r)).join(', ')}`
  }
  return `Take with ${describeReq(req)}`
}

export type AnyCourse = Course | ExternalCourse

export const isExternal = (c: AnyCourse): c is ExternalCourse => !('prereq' in c)

/** Departments other than CSE, e.g. MATH 126, E E 271. */
export const isNonCse = (c: AnyCourse) => !c.id.startsWith('CSE ')

/**
 * The tag on a card outside the prototype: "Non-CSE" for other departments,
 * "Not in prototype yet" for CSE courses not encoded yet (CSE 163).
 */
export const externalTag = (c: AnyCourse) => (isNonCse(c) ? 'Non-CSE' : 'Not in prototype yet')

/** The same distinction in words, for accessible names, the panel, and the List view. */
export const externalLabel = (c: AnyCourse) => (isNonCse(c) ? 'Non-CSE course' : 'Not in prototype yet')

/** "CSE 311" → "300-level". */
export const levelTag = (c: AnyCourse) => `${Math.floor(Number(c.id.split(' ').at(-1)) / 100) * 100}-level`

/**
 * Courses whose only catalog prerequisites are retired. With retired courses
 * hidden they'd look like they have none, so they say this instead.
 * Wording pending adviser confirmation (docs/adviser-questions.md, question 3);
 * a test checks that every such course has an entry.
 */
export const RETIRED_PREREQ_NOTE: Record<string, { card: string; advice: string }> = {
  'CSE 143': {
    card: 'For students who already completed an earlier intro course',
    advice: 'Most students should take CSE 122 or CSE 123 instead.',
  },
}

/**
 * A course card's accessible name: short, e.g. "CSE 451, Introduction to
 * Operating Systems". The details are in its description (courseDescription,
 * linked with aria-describedby), so a screen reader moving through the map
 * hears the name first and the details after a pause.
 */
export const courseName = (course: AnyCourse) => (course.title ? `${course.id}, ${course.title}` : course.id)

/**
 * A course card's description, e.g. "Requires CSE 332, CSE 333, and CSE 351.
 * Unlocks 2 courses." Minimum grades are included ("CSE 123 (minimum grade
 * 2.0)"). `extra` sentences (the degree role, filter notes) go before the
 * unlock count.
 */
export function courseDescription(course: AnyCourse, unlocks: number, extra: string[] = []): string {
  const parts: string[] = []
  const note = RETIRED_PREREQ_NOTE[course.id]
  if (isExternal(course)) parts.push(`${externalLabel(course)}.`)
  else if (course.prereq) parts.push(`Requires ${describeReq(course.prereq)}.`)
  else if (note) parts.push(`${note.card}.`)
  else parts.push('No prerequisites.')
  if (!isExternal(course) && course.coreq) parts.push(`${coreqText(course.coreq)}.`)
  parts.push(...extra) // degree role, filter notes
  if (unlocks > 0) parts.push(`Unlocks ${unlocks} ${unlocks === 1 ? 'course' : 'courses'}.`)
  return parts.join(' ')
}

/** Non-breaking spaces inside course numbers, so "E E 271" never wraps across lines. */
export const keepCourseIdsTogether = (text: string) =>
  text.replace(/\b([A-Z]+(?: [A-Z]+)*) (\d{3})\b/g, (id) => id.replaceAll(' ', '\u00a0'))

/** Every course named in a requirement, with its minimum grade if any. */
function leaves(req: Req): Extract<Req, { course: string }>[] {
  if ('course' in req) return [req]
  if ('other' in req) return []
  return ('all' in req ? req.all : req.any).flatMap(leaves)
}

/**
 * The panel's opening answer, e.g. "To take CSE 311, you need one of CSE 123
 * or CSE 143, and one of MATH 126 or MATH 135, each with a minimum grade of
 * 2.0." A shared minimum grade is said once; otherwise grades stay inline.
 */
export function answerSentence(course: Course): string {
  const note = RETIRED_PREREQ_NOTE[course.id]
  let text: string
  if (course.prereq) {
    const grades = leaves(course.prereq).map((l) => l.minGrade)
    const shared = grades[0] !== undefined && grades.every((g) => g === grades[0]) ? grades[0] : undefined
    if (shared === undefined) text = `To take ${course.id}, you need ${describeReq(course.prereq)}.`
    else {
      const each = grades.length > 1 ? 'each with' : 'with'
      text = `To take ${course.id}, you need ${describeReq(course.prereq, { grades: false })}, ${each} a minimum grade of ${shared.toFixed(1)}.`
    }
  } else if (note) text = `${note.card}. ${note.advice}`
  else text = `${course.id} has no prerequisites listed in the catalog.`
  if (course.coreq) text += ` ${coreqText(course.coreq)}.`
  return text
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * A requirement as list items for the detail panel: a top-level AND becomes
 * one item per part ("One of E E 271 or CSE 369", "One of CSE 123 or CSE 143");
 * anything else is a single item. Minimum grades stay inline.
 */
export function reqItems(req: Req): string[] {
  return ('all' in req ? req.all : [req]).map((r) => capitalize(describeReq(r)))
}

// Wording pending adviser confirmation (docs/adviser-questions.md, question 2).
export const AUDIENCE_LABEL: Record<Course['audience'], string> = {
  majors: 'Allen School majors only',
  open: 'Open to all students',
  nonmajor: 'Designed for non-majors',
  unknown: 'Not yet confirmed',
}

/** Shown wherever a course unlocks nothing among the prototype's courses. */
export const NO_UNLOCKS = 'None among the courses in this prototype.'

/**
 * Link to the course in the UW Course Catalog. CSE courses link to the
 * department page with the course anchor (cse.html#cse451), like the stubs do.
 */
export function catalogUrl(course: AnyCourse): string {
  if (isExternal(course)) return course.url
  const url = course.sources[0].url
  return url.includes('#') ? url : `${url}#${course.id.toLowerCase().replaceAll(' ', '')}`
}

/** "2026-10-22" → "October 22, 2026" (no time zone shift). */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
