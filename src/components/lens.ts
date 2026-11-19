// The degree lens and filters, applied to a laid-out graph. Pure functions:
// they decide what each card says and what is hidden, never where anything
// is, so positions stay fixed whatever the user picks.
//
// Hiding rules:
// - Filters hide courses (level, non-CSE, "not used in my degree"). A course
//   on the selected course's path is never hidden; it's marked instead.
// - A "1 of N" pill goes when all its options are hidden, or the course it
//   feeds is. Lines go when either end is hidden.
// - "Simplify intro-course lines" hides the pills whose only options are
//   CSE 123 and CSE 143 (with their lines) unless they're on the selected
//   path; the course gets a "Needs CSE 123 or 143" tag instead.

import { degreeModel, programData, type Degree } from '../data/programs.ts'
import { LEVELS, type Level, type MapOptions } from '../hooks/useUrlState.ts'
import type { DegreeRole } from '../lib/degree.ts'
import type { FocusEdge, FocusGraph } from '../lib/focusGraph.ts'
import { levelOf } from '../lib/layout.ts'

export const INTRO_PAIR = ['CSE 123', 'CSE 143']

export const PATH_NOTE = 'Shown because it’s on this course’s path'
export const DEGREE_NOTE = 'Degree roles are a guide. Confirm your requirements in MyPlan’s degree audit.'

/** How many filters hide something right now (simplifying lines isn't a filter). */
export function activeFilters(o: MapOptions): number {
  return Number(o.levels.length < LEVELS.length) + Number(o.hideNonCse) + Number(o.hideUnused && o.degree !== null)
}
export const SOME_HIDDEN = 'Some prerequisites hidden'

const programName = (degree: Degree) => programData.programs.find((p) => p.id === degree)!.name

/** "a", "a and b", "a, b, and c" */
const and = (items: string[]) =>
  items.length <= 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`

/**
 * The role for a card's short accessible name, when a degree is picked and
 * the card shows a badge: "1 of 4 required for Computer Engineering".
 */
export function roleName(courseId: string, degree: Degree | null): string | null {
  const badge = degree && degreeModel.roleOf(courseId, degree).badge
  return badge ? `${badge} for ${programName(degree)}` : null
}

/** The course's role as a sentence for its description, or null. */
export function roleSentence(courseId: string, degree: Degree | null): string | null {
  if (degree) return `In ${programName(degree)}: ${degreeModel.roleOf(courseId, degree).label}.`
  const required = degreeModel.requiredIn(courseId)
  return required.length ? `Required for ${and(required.map((p) => p.name))}.` : null
}

/** What a card shows for the lens: a role (degree picked) or program tags ("All"). */
export function cardLens(courseId: string, degree: Degree | null): { role: DegreeRole | null; programs: string[] } {
  if (degree) return { role: degreeModel.roleOf(courseId, degree), programs: [] }
  return { role: null, programs: degreeModel.requiredIn(courseId).map((p) => p.short) }
}

export type Filters = Pick<MapOptions, 'levels' | 'hideNonCse' | 'hideUnused'>

/** Would the filters hide this course (ignoring the selected path)? */
export function filteredOut(courseId: string, filters: Filters, degree: Degree | null): boolean {
  if (!courseId.startsWith('CSE ')) return filters.hideNonCse
  const level = (levelOf(courseId) * 100) as Level
  if (LEVELS.includes(level) && !filters.levels.includes(level)) return true
  return filters.hideUnused && degree !== null && degreeModel.roleOf(courseId, degree).tier === 'unused'
}

export interface Visibility {
  /** Node ids (courses, pills, boxes) not drawn. */
  hidden: Set<string>
  hiddenEdges: Set<string>
  /** Courses the filters would hide, shown because they're on the selected path. */
  pathException: Set<string>
  /** Course id → "Needs CSE 123 or 143 (≥ 2.0)", where simplifying hid its lines. */
  needsTag: Map<string, string>
  /** Visible courses with a prerequisite hidden by the filters. */
  someHidden: Set<string>
  shown: number
  total: number
}

export function visibility(
  model: FocusGraph,
  opts: { filters: Filters | null; simplify: boolean; degree: Degree | null; highlight: Set<string> | null },
): Visibility {
  const onPath = (id: string) => !!opts.highlight?.has(id)
  const inEdges = new Map<string, FocusEdge[]>()
  const outEdges = new Map<string, FocusEdge[]>()
  for (const e of model.edges) {
    inEdges.set(e.target, [...(inEdges.get(e.target) ?? []), e])
    outEdges.set(e.source, [...(outEdges.get(e.source) ?? []), e])
  }

  const hidden = new Set<string>()
  const pathException = new Set<string>()
  const courses = model.nodes.filter((n) => n.kind === 'course')
  if (opts.filters) {
    for (const c of courses) {
      if (!filteredOut(c.id, opts.filters, opts.degree)) continue
      if (onPath(c.id)) pathException.add(c.id)
      else hidden.add(c.id)
    }
  }
  const filterHidden = new Set(hidden) // courses and pills hidden by filters (not by simplifying)

  // Pills and boxes: gone when every option is hidden or their course is.
  const connectors = model.nodes.filter((n) => n.kind !== 'course')
  for (let changed = true; changed; ) {
    changed = false
    for (const n of connectors) {
      if (hidden.has(n.id) || onPath(n.id)) continue
      const ins = inEdges.get(n.id) ?? []
      const allOptionsHidden = ins.length > 0 && ins.every((e) => hidden.has(e.source))
      const targetHidden = (outEdges.get(n.id) ?? []).every((e) => hidden.has(e.target))
      if (allOptionsHidden || targetHidden) {
        hidden.add(n.id)
        filterHidden.add(n.id)
        changed = true
      }
    }
  }

  // Simplify: pills fed only by CSE 123 and CSE 143.
  const needsTag = new Map<string, string>()
  if (opts.simplify) {
    for (const n of connectors) {
      if (n.kind !== 'junction' || hidden.has(n.id) || onPath(n.id)) continue
      const ins = inEdges.get(n.id) ?? []
      if (ins.map((e) => e.source).sort().join() !== INTRO_PAIR.join()) continue
      hidden.add(n.id)
      const grades = [...new Set(ins.map((e) => e.minGrade))]
      const grade = grades.length === 1 && grades[0] !== undefined ? ` (≥ ${grades[0].toFixed(1)})` : ''
      for (const e of outEdges.get(n.id) ?? []) needsTag.set(e.target, `Needs CSE 123 or 143${grade}`)
    }
  }

  const hiddenEdges = new Set(model.edges.filter((e) => hidden.has(e.source) || hidden.has(e.target)).map((e) => e.id))

  // Courses missing a prerequisite because of the filters (not simplifying).
  const lostPrereq = (id: string, seen = new Set<string>()): boolean =>
    (inEdges.get(id) ?? []).some((e) => {
      if (e.kind === 'recommended' || seen.has(e.source)) return false
      seen.add(e.source)
      if (filterHidden.has(e.source)) return true
      const source = model.nodes.find((n) => n.id === e.source)
      return source?.kind === 'junction' && !hidden.has(source.id) && lostPrereq(source.id, seen)
    })
  const someHidden = new Set(courses.filter((c) => !hidden.has(c.id) && lostPrereq(c.id)).map((c) => c.id))

  return {
    hidden,
    hiddenEdges,
    pathException,
    needsTag,
    someHidden,
    shown: courses.filter((c) => !hidden.has(c.id)).length,
    total: courses.length,
  }
}
