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

export type AnyCourse = Course | ExternalCourse

export const isExternal = (c: AnyCourse): c is ExternalCourse => !('prereq' in c)

/**
 * Accessible name for a course node, e.g.
 * "CSE 451, Introduction to Operating Systems. Requires CSE 332, CSE 333, and
 * CSE 351. Unlocks 2 courses."
 */
export function courseLabel(course: AnyCourse, unlocks: number): string {
  const parts = [course.title ? `${course.id}, ${course.title}.` : `${course.id}.`]
  if (course.status === 'retired') parts.push('Retired course.')
  if (isExternal(course)) parts.push('Not part of this map.')
  else if (course.prereq) parts.push(`Requires ${describeReq(course.prereq)}.`)
  else parts.push('No prerequisites.')
  if (unlocks > 0) parts.push(`Unlocks ${unlocks} ${unlocks === 1 ? 'course' : 'courses'}.`)
  return parts.join(' ')
}
