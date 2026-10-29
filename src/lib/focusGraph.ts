// The focus view's graph, before layout: which nodes and edges to draw when
// one course is selected.
//
// - The focus course, plus all of its ancestors (prereq only), with each
//   course's prerequisite tree drawn in full.
// - Direct descendants, with only the branch that contains the focus course.
// - Optionally, recommendations to and from the focus course.
//
// An OR group with 2+ options becomes a "one of N" junction node: each option
// joins it with a dashed edge, and the junction joins the course with the
// edge style of its context (solid for prereq, dotted for recommended).

import type { CourseData, Req } from '../data/schema.ts'
import { isExternal, type AnyCourse } from './describe.ts'
import { ancestors, descendants, type Graph } from './prereq.ts'

export type EdgeKind = 'required' | 'one-of' | 'recommended'

export type Role = 'focus' | 'ancestor' | 'descendant' | 'recommended'

export type FocusNode =
  | { id: string; kind: 'course'; course: AnyCourse; role: Role }
  | { id: string; kind: 'junction'; label: string; recommended: boolean }
  | { id: string; kind: 'other'; text: string; recommended: boolean }

export interface FocusEdge {
  id: string
  source: string
  target: string
  kind: EdgeKind
}

export interface FocusGraph {
  nodes: FocusNode[]
  edges: FocusEdge[]
}

type Leaf = Extract<Req, { course: string }> | Extract<Req, { other: string }>

interface Context {
  role: Role
  recommended: boolean
  /** Which leaves to draw; branches with no visible leaf are skipped. */
  visible: (leaf: Leaf) => boolean
}

// If a course plays several roles, the earlier one in this list wins.
const ROLE_ORDER: Role[] = ['focus', 'ancestor', 'descendant', 'recommended']

/** Does this requirement contain a leaf that `visible` accepts? */
function mentions(req: Req, visible: Context['visible']): boolean {
  if ('all' in req) return req.all.some((r) => mentions(r, visible))
  if ('any' in req) return req.any.some((r) => mentions(r, visible))
  return visible(req)
}

export function buildFocusGraph(
  focusId: string,
  data: CourseData,
  graph: Graph,
  options: { showRecommended: boolean },
): FocusGraph {
  const byId = new Map<string, AnyCourse>([...data.courses, ...data.external].map((c) => [c.id, c]))
  const nodes = new Map<string, FocusNode>()
  const edges = new Map<string, FocusEdge>()

  const addCourse = (id: string, role: Role) => {
    const existing = nodes.get(id)
    if (existing?.kind === 'course' && ROLE_ORDER.indexOf(existing.role) <= ROLE_ORDER.indexOf(role)) return
    const course = byId.get(id)
    if (course) nodes.set(id, { id, kind: 'course', course, role })
  }
  const addEdge = (source: string, target: string, kind: EdgeKind) => {
    const id = `${source}->${target}:${kind}`
    edges.set(id, { id, source, target, kind })
  }

  /** Draw `req` as edges into `target`. Junction labels count every option, shown or not. */
  const connect = (req: Req, target: string, edgeKind: EdgeKind, path: string, insideOr: boolean, ctx: Context) => {
    if ('course' in req) {
      addCourse(req.course, ctx.role)
      addEdge(req.course, target, edgeKind)
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

  addCourse(focusId, 'focus')
  if (!nodes.has(focusId)) return { nodes: [], edges: [] }

  const all = () => true
  const onlyFocus = (leaf: Leaf) => 'course' in leaf && leaf.course === focusId

  // Left side: the focus course and every ancestor, with full prereq trees.
  for (const id of [focusId, ...ancestors(focusId, graph).map((a) => a.id)]) {
    const course = byId.get(id)
    if (!course || isExternal(course) || !course.prereq) continue
    addCourse(id, 'ancestor')
    connect(course.prereq, id, 'required', 'prereq', false, { role: 'ancestor', recommended: false, visible: all })
  }

  // Right side: direct descendants, showing only the branch with the focus course.
  for (const d of descendants(focusId, graph).filter((d) => d.depth === 1)) {
    const course = byId.get(d.id)
    if (!course || isExternal(course) || !course.prereq) continue
    addCourse(d.id, 'descendant')
    connect(course.prereq, d.id, 'required', 'prereq', false, {
      role: 'descendant',
      recommended: false,
      visible: onlyFocus,
    })
  }

  // Dotted: what the focus course recommends, and courses that recommend it.
  if (options.showRecommended) {
    const focus = byId.get(focusId)!
    if (!isExternal(focus) && focus.recommended) {
      connect(focus.recommended, focusId, 'recommended', 'recommended', false, {
        role: 'recommended',
        recommended: true,
        visible: all,
      })
    }
    for (const course of data.courses) {
      if (!course.recommended || !mentions(course.recommended, onlyFocus)) continue
      addCourse(course.id, 'recommended')
      connect(course.recommended, course.id, 'recommended', 'recommended', false, {
        role: 'recommended',
        recommended: true,
        visible: onlyFocus,
      })
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] }
}
