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
 */
export function describeReq(req: Req): string {
  if ('course' in req) {
    let text = req.course
    if (req.minGrade !== undefined) text += ` (minimum grade ${req.minGrade.toFixed(1)})`
    if (req.timing === 'concurrent-ok') text += ' (before or at the same time)'
    return text
  }
  if ('other' in req) return req.other
  if ('any' in req) {
    const options = req.any.map(describeReq)
    return options.length === 1 ? options[0] : `one of ${join(options, 'or', req.any.some(isGroup))}`
  }
  return join(req.all.map(describeReq), 'and', req.all.some(isGroup))
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

/**
 * Accessible name for a course node, e.g.
 * "CSE 451, Introduction to Operating Systems. Requires CSE 332, CSE 333, and
 * CSE 351. Unlocks 2 courses."
 * Minimum grades are included ("CSE 123 (minimum grade 2.0)").
 */
export function courseLabel(course: AnyCourse, unlocks: number): string {
  const parts = [course.title ? `${course.id}, ${course.title}.` : `${course.id}.`]
  if (course.status === 'retired') parts.push('Retired course.')
  if (isExternal(course)) parts.push('Not part of this map.')
  else if (course.prereq) parts.push(`Requires ${describeReq(course.prereq)}.`)
  else parts.push('No prerequisites.')
  if (!isExternal(course) && course.coreq) parts.push(`${coreqText(course.coreq)}.`)
  if (unlocks > 0) parts.push(`Unlocks ${unlocks} ${unlocks === 1 ? 'course' : 'courses'}.`)
  return parts.join(' ')
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

export const AUDIENCE_LABEL: Record<Course['audience'], string> = {
  majors: 'Majors',
  open: 'Open to all',
  nonmajor: 'Non-majors',
  unknown: 'Not yet confirmed',
}

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
