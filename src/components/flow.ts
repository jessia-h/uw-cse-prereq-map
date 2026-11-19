// Turns a laid-out graph model into React Flow nodes and edges. Shared by the
// full map and the focus view so both draw courses, lines, and labels the
// same way.

import { MarkerType, type Edge, type Node } from '@xyflow/react'
import { shownData } from '../data/courses.ts'
import type { Degree } from '../data/programs.ts'
import { courseDescription, courseName, externalTag, isExternal, levelTag, RETIRED_PREREQ_NOTE } from '../lib/describe.ts'
import type { EdgeKind, FocusGraph } from '../lib/focusGraph.ts'
import { minGradeLabel, nodeSize, type Layout } from '../lib/layout.ts'
import { buildGraph } from '../lib/prereq.ts'
import { colors } from '../theme.ts'
import { cardLens, PATH_NOTE, roleName, roleSentence, SOME_HIDDEN, visibility, type Filters, type Visibility } from './lens.ts'
import type { Look } from './nodes.tsx'

/**
 * Scrolling over the map scrolls the page (it may be embedded in a long
 * WordPress page), so the wheel never zooms on its own. Zoom with the +/−
 * buttons, a touch pinch (React Flow), or Ctrl/Cmd + scroll and trackpad
 * pinches (ScrollHint handles those, and shows a hint on a plain scroll).
 * Dragging still pans.
 */
export const SCROLL_ZOOM = {
  zoomOnScroll: false,
  panOnScroll: false,
  preventScrolling: false,
  zoomOnPinch: true,
  zoomActivationKeyCode: null,
}

/** Prerequisite links between the courses the interface shows (no retired courses). */
export const prereqGraph = buildGraph(shownData)

// Line style carries the meaning, in every look: solid, dashed, dotted.
const DASH: Record<EdgeKind, string | undefined> = { required: undefined, 'one-of': '8 5', recommended: '2 5' }
const PATH_STROKE: Record<EdgeKind, string> = {
  required: colors.edgeRequired,
  'one-of': colors.edgeOneOf,
  recommended: colors.edgeRecommended,
}
// Selection is the only strong visual: purple and thicker on the path, grey
// and thin everywhere else (still >= 3:1).
const WIDTH: Record<Look, number> = { path: 2.5, quiet: 1.25, faded: 1 }

export interface FlowOptions {
  onSelect: (id: string) => void
  /** Course ids that get aria-current and the selected style. */
  selected?: string | null
  /** Nothing selected: everything gets the quiet look. */
  quiet?: boolean
  /** Ids on the selected path; everything else fades. null = everything is on the path. */
  highlight?: Set<string> | null
  /** Hide dotted recommendation edges, and the junctions, boxes and courses that only serve them. */
  hideRecommended?: boolean
  /** Recommendation ids to show even when the rest are hidden (the intro sequence). */
  alwaysShow?: Set<string>
  /** The degree lens; null or absent = "All". */
  degree?: Degree | null
  /** Filters (whole map only); absent = show everything. */
  filters?: Filters | null
  /** Simplify intro-course lines (whole map only). */
  simplify?: boolean
}

export function toFlow(
  model: FocusGraph,
  layout: Layout,
  opts: FlowOptions,
): { nodes: Node[]; edges: Edge[]; visible: Visibility } {
  const look = (id: string): Look => (opts.quiet ? 'quiet' : opts.highlight && !opts.highlight.has(id) ? 'faded' : 'path')
  const hide = (id: string) => !!opts.hideRecommended && !opts.alwaysShow?.has(id)
  const degree = opts.degree ?? null
  const visible = visibility(model, {
    filters: opts.filters ?? null,
    simplify: !!opts.simplify,
    degree,
    highlight: opts.highlight ?? null,
  })

  const nodes: Node[] = model.nodes.map((n) => {
    const base = {
      id: n.id,
      position: layout.positions.get(n.id) ?? { x: 0, y: 0 },
      ...nodeSize(n),
    }
    if (n.kind === 'course') {
      const course = n.course
      const external = isExternal(course)
      const lens = cardLens(n.id, degree)
      const onPathOnly = visible.pathException.has(n.id)
      const someHidden = visible.someHidden.has(n.id)
      // Short tags on the card; the full text is in the accessible name and panel.
      const chips = [
        visible.needsTag.get(n.id),
        !external && course.coreq ? 'Co-requisite' : undefined,
        RETIRED_PREREQ_NOTE[n.id] ? 'See details' : undefined,
        someHidden ? SOME_HIDDEN : undefined,
        onPathOnly ? PATH_NOTE : undefined,
      ].filter((c): c is string => !!c)
      const extra = [
        roleSentence(n.id, degree),
        someHidden ? `${SOME_HIDDEN}.` : null,
        onPathOnly ? `${PATH_NOTE}.` : null,
      ].filter((t): t is string => !!t)
      return {
        ...base,
        // In the focus view, courses there only because of a recommendation.
        hidden: (n.role === 'recommended' && hide(n.id)) || visible.hidden.has(n.id),
        type: 'course',
        data: {
          courseId: n.id,
          title: course.title,
          selected: opts.selected === n.id,
          look: look(n.id),
          external,
          nonCse: external && externalTag(course) === 'Non-CSE',
          tag: external ? externalTag(course) : levelTag(course),
          role: lens.role ? { tier: lens.role.tier, badge: lens.role.badge } : null,
          programs: lens.programs,
          chips,
          onPathOnly,
          // Short name (plus the role when a degree is picked); details in the description.
          label: [courseName(course), roleName(n.id, degree)].filter(Boolean).join(', '),
          description: courseDescription(course, prereqGraph.unlocks.get(n.id)?.length ?? 0, extra),
          onSelect: opts.onSelect,
        },
      }
    }
    const hidden = (n.recommended && hide(n.id)) || visible.hidden.has(n.id)
    if (n.kind === 'junction') {
      return { ...base, hidden, type: 'junction', data: { label: n.label, recommended: n.recommended, look: look(n.id) } }
    }
    return { ...base, hidden, type: 'other', data: { text: n.text, recommended: n.recommended, look: look(n.id) } }
  })
  // Tab order follows the picture: left to right, then top to bottom.
  nodes.sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)

  const edges: Edge[] = model.edges.map((e) => {
    const edgeLook = look(e.id)
    const stroke = edgeLook === 'path' ? PATH_STROKE[e.kind] : colors.edgeQuiet
    const label = layout.labels.get(e.id)
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'routed',
      hidden: (e.kind === 'recommended' && hide(e.id)) || visible.hiddenEdges.has(e.id),
      // Lines on the path draw on top of the others.
      zIndex: edgeLook === 'path' ? 1 : 0,
      data: {
        points: layout.routes.get(e.id) ?? [],
        label: e.minGrade !== undefined && label ? { text: minGradeLabel(e.minGrade), ...label } : undefined,
        look: edgeLook,
      },
      style: {
        stroke,
        strokeWidth: WIDTH[edgeLook],
        strokeDasharray: DASH[e.kind],
        strokeLinecap: 'round',
      },
      // Sized in px, so arrowheads stay readable on thin lines.
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        markerUnits: 'userSpaceOnUse',
        width: edgeLook === 'path' ? 14 : 11,
        height: edgeLook === 'path' ? 14 : 11,
      },
    }
  })
  return { nodes, edges, visible }
}

/** Center point of a node, for centering the view on it. */
export function nodeCenter(model: FocusGraph, layout: Layout, id: string) {
  const node = model.nodes.find((n) => n.id === id)
  const pos = layout.positions.get(id)
  if (!node || !pos) return null
  const { width, height } = nodeSize(node)
  return { x: pos.x + width / 2, y: pos.y + height / 2 }
}

/**
 * A note above the given courses, e.g. the intro sequence label. Placed from
 * the layout (not by elk), spanning the courses' combined width.
 */
export function noteAbove(model: FocusGraph, layout: Layout, ids: string[], text: string): Node | null {
  const boxes = ids.flatMap((id) => {
    const node = model.nodes.find((n) => n.id === id)
    const pos = layout.positions.get(id)
    return node && pos ? [{ ...pos, ...nodeSize(node) }] : []
  })
  if (boxes.length === 0) return null
  const left = Math.min(...boxes.map((b) => b.x))
  const right = Math.max(...boxes.map((b) => b.x + b.width))
  const top = Math.min(...boxes.map((b) => b.y))
  return {
    id: `note:${ids.join(',')}`,
    type: 'note',
    position: { x: left, y: top - 52 },
    data: { text, width: right - left },
    selectable: false,
  }
}

/** Width of the detail panel overlay on the full map, in px. Matches App.css. */
export const PANEL_WIDTH = 360

/** Screen pixels the panel overlay covers on the right of a map this wide (panel plus its margins). */
export function panelCover(mapWidth: number): number {
  return Math.min(PANEL_WIDTH, mapWidth / 2) + 16
}
