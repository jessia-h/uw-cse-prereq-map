// The graphs to draw, before layout. Two views share one builder, so node
// and edge ids match between them:
//
// - buildFullGraph: every course, with every prerequisite tree drawn in full.
// - buildFocusGraph: one course, all of its ancestors (prereq only, full
//   trees), and its direct descendants (only the branch that contains it).
//
// Because the focus graph for a course is a subset of the full graph, the
// full map highlights a selection by lighting up the focus graph's ids.
//
// An OR group with 2+ options becomes a "one of N" junction node: each option
// joins it with a dashed edge, and the junction joins the course with the
// edge style of its context (solid for prereq, dotted for recommended).

import type { CourseData, Req } from '../data/schema.ts'
import { isExternal, type AnyCourse } from './describe.ts'
import { ancestors, descendants, type Graph } from './prereq.ts'

export type EdgeKind = 'required' | 'one-of' | 'recommended'

/** A course's place in a focus graph; null in the full map. */
export type Role = 'focus' | 'ancestor' | 'descendant' | 'recommended'

export type FocusNode =
  | { id: string; kind: 'course'; course: AnyCourse; role: Role | null }
  | { id: string; kind: 'junction'; label: string; recommended: boolean }
  | { id: string; kind: 'other'; text: string; recommended: boolean }

export interface FocusEdge {
  id: string
  source: string
  target: string
  kind: EdgeKind
  /** Minimum grade required in the source course, shown on the edge. */
  minGrade?: number
}

export interface FocusGraph {
  nodes: FocusNode[]
  edges: FocusEdge[]
}

type Leaf = Extract<Req, { course: string }> | Extract<Req, { other: string }>

interface Context {
  role: Role | null
  recommended: boolean
  /** Which leaves to draw; branches with no visible leaf are skipped. */
  visible: (leaf: Leaf) => boolean
}

// If a course plays several roles, the earlier one wins; null is lowest.
const ROLE_ORDER: Role[] = ['focus', 'ancestor', 'descendant', 'recommended']
const rank = (role: Role | null) => (role ? ROLE_ORDER.indexOf(role) : ROLE_ORDER.length)

const all = () => true

/** Does this requirement contain a leaf that `visible` accepts? */
function mentions(req: Req, visible: Context['visible']): boolean {
  if ('all' in req) return req.all.some((r) => mentions(r, visible))
  if ('any' in req) return req.any.some((r) => mentions(r, visible))
  return visible(req)
}

function createBuilder(data: CourseData) {
  const byId = new Map<string, AnyCourse>([...data.courses, ...data.external].map((c) => [c.id, c]))
  const nodes = new Map<string, FocusNode>()
  const edges = new Map<string, FocusEdge>()

  const addCourse = (id: string, role: Role | null) => {
    const existing = nodes.get(id)
    if (existing?.kind === 'course' && rank(existing.role) <= rank(role)) return
    const course = byId.get(id)
    if (course) nodes.set(id, { id, kind: 'course', course, role })
  }
  const addEdge = (source: string, target: string, kind: EdgeKind, minGrade?: number) => {
    const id = `${source}->${target}:${kind}`
    edges.set(id, { id, source, target, kind, ...(minGrade !== undefined && { minGrade }) })
  }

  /** Draw `req` as edges into `target`. Junction labels count every option, shown or not. */
  const connect = (req: Req, target: string, edgeKind: EdgeKind, path: string, insideOr: boolean, ctx: Context) => {
    if ('course' in req) {
      addCourse(req.course, ctx.role)
      addEdge(req.course, target, edgeKind, req.minGrade)
      return
    }
    if ('other' in req) {
      const id = `${target}/${path}`
      nodes.set(id, { id, kind: 'other', text: req.other, recommended: ctx.recommended })
      addEdge(id, target, edgeKind)
      return
    }
    const key = 'all' in req ? 'all' : 'any'
    const children = 'all' in req ? req.all : req.any
    const shown = children.map((child, i) => ({ child, i })).filter(({ child }) => mentions(child, ctx.visible))

    // An AND feeding a course needs no junction: each part is its own edge.
    // An OR with one option is just that option. An AND inside an OR does
    // need an "all of" junction, or its parts would look like separate options.
    const needsJunction = key === 'any' ? children.length > 1 : insideOr
    if (!needsJunction) {
      for (const { child, i } of shown) connect(child, target, edgeKind, `${path}.${key}${i}`, insideOr, ctx)
      return
    }
    const id = `${target}/${path}`
    nodes.set(id, {
      id,
      kind: 'junction',
      label: `${key === 'any' ? 'one of' : 'all of'} ${children.length}`,
      recommended: ctx.recommended,
    })
    addEdge(id, target, edgeKind)
    const inner: EdgeKind = ctx.recommended ? 'recommended' : key === 'any' ? 'one-of' : 'required'
    for (const { child, i } of shown) connect(child, id, inner, `${path}.${key}${i}`, key === 'any', ctx)
  }

  /** A course's prereq tree, drawn into it. */
  const drawPrereq = (id: string, ctx: Context) => {
    const course = byId.get(id)
    if (course && !isExternal(course) && course.prereq) connect(course.prereq, id, 'required', 'prereq', false, ctx)
  }
  /** A course's recommendations, drawn into it as dotted edges. */
  const drawRecommended = (id: string, role: Role | null, visible: Context['visible']) => {
    const course = byId.get(id)
    if (course && !isExternal(course) && course.recommended) {
      connect(course.recommended, id, 'recommended', 'recommended', false, { role, recommended: true, visible })
    }
  }

  return {
    byId,
    nodes,
    addCourse,
    drawPrereq,
    drawRecommended,
    result: (): FocusGraph => ({ nodes: [...nodes.values()], edges: [...edges.values()] }),
  }
}

/** Every course and outside course, with all prerequisite trees and recommendations. */
export function buildFullGraph(data: CourseData): FocusGraph {
  const b = createBuilder(data)
  for (const c of [...data.courses, ...data.external]) b.addCourse(c.id, null)
  for (const c of data.courses) {
    b.drawPrereq(c.id, { role: null, recommended: false, visible: all })
    b.drawRecommended(c.id, null, all)
  }
  return b.result()
}

export function buildFocusGraph(
  focusId: string,
  data: CourseData,
  graph: Graph,
  options: { showRecommended: boolean },
): FocusGraph {
  const b = createBuilder(data)
  b.addCourse(focusId, 'focus')
  if (!b.nodes.has(focusId)) return { nodes: [], edges: [] }

  const onlyFocus = (leaf: Leaf) => 'course' in leaf && leaf.course === focusId

  // Left side: the focus course and every ancestor, with full prereq trees.
  for (const id of [focusId, ...ancestors(focusId, graph).map((a) => a.id)]) {
    b.drawPrereq(id, { role: 'ancestor', recommended: false, visible: all })
  }

  // Right side: direct descendants, showing only the branch with the focus course.
  for (const d of descendants(focusId, graph).filter((d) => d.depth === 1)) {
    b.addCourse(d.id, 'descendant')
    b.drawPrereq(d.id, { role: 'descendant', recommended: false, visible: onlyFocus })
  }

  // Dotted: what the focus course recommends, and courses that recommend it.
  if (options.showRecommended) {
    b.drawRecommended(focusId, 'recommended', all)
    for (const course of data.courses) {
      if (!course.recommended || !mentions(course.recommended, onlyFocus)) continue
      b.addCourse(course.id, 'recommended')
      b.drawRecommended(course.id, 'recommended', onlyFocus)
    }
  }

  return b.result()
}
