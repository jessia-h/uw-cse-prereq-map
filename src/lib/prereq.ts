// Prerequisite logic: is a requirement met, and which courses lead to or
// from a course. All functions are pure; pass in the course data.

import type { Course, CourseData, Req } from '../data/schema.ts'

export type Status = 'eligible' | 'not-yet' | 'check-with-adviser'

/** Completed courses → grade (0.0–4.0), or null when the grade is unknown. */
export type Completed = ReadonlyMap<string, number | null>
/** Courses the student is taking this quarter. */
export type Current = ReadonlySet<string>

/**
 * Whether a requirement is met.
 * - A course leaf is met when completed (with a high enough grade, if
 *   minGrade is set). A minGrade with an unknown grade → check-with-adviser.
 * - timing "concurrent-ok" also accepts a course in `current`.
 * - An `other` leaf (e.g. Guided Self-Placement) can't be checked here →
 *   check-with-adviser.
 * - all: any not-yet → not-yet; else any check → check; else eligible.
 * - any: any eligible → eligible; else any check → check; else not-yet.
 * - null (no requirement) → eligible.
 */
export function satisfied(req: Req | null, completed: Completed, current: Current): Status {
  return evaluate(req, completed, current, false)
}

function evaluate(
  req: Req | null,
  completed: Completed,
  current: Current,
  currentAlwaysOk: boolean,
): Status {
  if (req === null) return 'eligible'
  if ('all' in req || 'any' in req) {
    const parts = ('all' in req ? req.all : req.any).map((r) =>
      evaluate(r, completed, current, currentAlwaysOk),
    )
    if ('all' in req) {
      if (parts.includes('not-yet')) return 'not-yet'
      return parts.includes('check-with-adviser') ? 'check-with-adviser' : 'eligible'
    }
    if (parts.includes('eligible')) return 'eligible'
    return parts.includes('check-with-adviser') ? 'check-with-adviser' : 'not-yet'
  }
  if ('other' in req) return 'check-with-adviser'

  if (completed.has(req.course)) {
    if (req.minGrade === undefined) return 'eligible'
    const grade = completed.get(req.course)
    if (grade === null || grade === undefined) return 'check-with-adviser'
    return grade >= req.minGrade ? 'eligible' : 'not-yet'
  }
  const currentOk = currentAlwaysOk || req.timing === 'concurrent-ok'
  return currentOk && current.has(req.course) ? 'eligible' : 'not-yet'
}

export interface Eligibility {
  prereq: Status
  /** null when the course has no co-requisite. */
  coreq: Status | null
}

/**
 * Prerequisites and co-requisites for one course, reported separately.
 * A co-requisite is met by a course that is completed or in `current`.
 * `recommended` never affects the result.
 */
export function eligibility(course: Course, completed: Completed, current: Current): Eligibility {
  return {
    prereq: satisfied(course.prereq, completed, current),
    coreq: course.coreq ? evaluate(course.coreq, completed, current, true) : null,
  }
}

export interface Related {
  id: string
  /**
   * "required": needed on every route, i.e. reached only through AND links.
   * "alternative": somewhere on the route it is one option in an OR group.
   * When a course is reached both ways, "required" wins.
   */
  relation: 'required' | 'alternative'
  /** Shortest number of prerequisite links away (1 = direct). */
  depth: number
}

type Relation = Related['relation']

/** Direct prerequisite course leaves of a requirement, with their relation. */
function directLeaves(req: Req | null, relation: Relation = 'required'): { id: string; relation: Relation }[] {
  if (req === null || 'other' in req) return []
  if ('course' in req) return [{ id: req.course, relation }]
  if ('all' in req) return req.all.flatMap((r) => directLeaves(r, relation))
  // An OR group with a single option is effectively required.
  const inner = req.any.length > 1 ? 'alternative' : relation
  return req.any.flatMap((r) => directLeaves(r, inner))
}

export interface Graph {
  /** Course id → its direct prerequisites (from `prereq` only). */
  prereqsOf: Map<string, { id: string; relation: Relation }[]>
  /** Course id → courses that list it directly in `prereq`. */
  unlocks: Map<string, { id: string; relation: Relation }[]>
}

/** Build the prerequisite graph. Co-requisites and recommendations are excluded. */
export function buildGraph(data: CourseData): Graph {
  const prereqsOf: Graph['prereqsOf'] = new Map()
  const unlocks: Graph['unlocks'] = new Map()
  for (const course of data.courses) {
    const leaves = directLeaves(course.prereq)
    prereqsOf.set(course.id, leaves)
    for (const leaf of leaves) {
      const list = unlocks.get(leaf.id) ?? []
      list.push({ id: course.id, relation: leaf.relation })
      unlocks.set(leaf.id, list)
    }
  }
  return { prereqsOf, unlocks }
}

/** Walk the graph from `start`, combining relations along each route. */
function walk(start: string, next: Graph['prereqsOf']): Related[] {
  const best = new Map<string, Related>()
  const queue: Related[] = [{ id: start, relation: 'required', depth: 0 }]
  while (queue.length) {
    const from = queue.shift()!
    for (const edge of next.get(from.id) ?? []) {
      const relation: Relation =
        from.relation === 'required' && edge.relation === 'required' ? 'required' : 'alternative'
      const depth = from.depth + 1
      const seen = best.get(edge.id)
      const better =
        !seen ||
        (relation === 'required' && seen.relation === 'alternative') ||
        depth < seen.depth
      if (!better) continue
      const merged: Related = {
        id: edge.id,
        relation: seen?.relation === 'required' ? 'required' : relation,
        depth: Math.min(depth, seen?.depth ?? depth),
      }
      best.set(edge.id, merged)
      queue.push(merged)
    }
  }
  return [...best.values()].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id))
}

/** Every course that `courseId` depends on through `prereq`, directly or not. */
export function ancestors(courseId: string, graph: Graph): Related[] {
  return walk(courseId, graph.prereqsOf)
}

/** Every course that depends on `courseId` through `prereq`, directly or not. */
export function descendants(courseId: string, graph: Graph): Related[] {
  return walk(courseId, graph.unlocks)
}
