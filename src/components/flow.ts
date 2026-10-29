// Turns a laid-out graph model into React Flow nodes and edges. Shared by the
// full map and the focus view so both draw courses, lines, and labels the
// same way.

import { MarkerType, type Edge, type Node } from '@xyflow/react'
import { courseData } from '../data/courses.ts'
import { courseLabel, coreqText, isExternal } from '../lib/describe.ts'
import type { EdgeKind, FocusGraph } from '../lib/focusGraph.ts'
import { minGradeLabel, nodeSize, type Layout } from '../lib/layout.ts'
import { buildGraph } from '../lib/prereq.ts'
import { colors } from '../theme.ts'

export const prereqGraph = buildGraph(courseData)

// Line style carries the meaning; faded lines keep their dash pattern.
const DASH: Record<EdgeKind, string | undefined> = { required: undefined, 'one-of': '8 5', recommended: '2 5' }
const STROKE: Record<EdgeKind, string> = {
  required: colors.edgeRequired,
  'one-of': colors.edgeOneOf,
  recommended: colors.edgeRecommended,
}

export interface FlowOptions {
  onSelect: (id: string) => void
  /** Course ids that get aria-current and the selected style. */
  selected?: string | null
  /** Ids to keep at full strength; everything else fades. null = nothing fades. */
  highlight?: Set<string> | null
  /** Hide dotted recommendation edges, and junctions/boxes that only serve them. */
  hideRecommended?: boolean
}

export function toFlow(model: FocusGraph, layout: Layout, opts: FlowOptions): { nodes: Node[]; edges: Edge[] } {
  const faded = (id: string) => !!opts.highlight && !opts.highlight.has(id)

  const nodes: Node[] = model.nodes.map((n) => {
    const base = {
      id: n.id,
      position: layout.positions.get(n.id) ?? { x: 0, y: 0 },
      ...nodeSize(n),
    }
    if (n.kind === 'course') {
      const course = n.course
      return {
        ...base,
        type: 'course',
        data: {
          courseId: n.id,
          title: course.title,
          selected: opts.selected === n.id,
          faded: faded(n.id),
          external: isExternal(course),
          retired: course.status === 'retired',
          coreq: !isExternal(course) && course.coreq ? coreqText(course.coreq) : undefined,
          label: courseLabel(course, prereqGraph.unlocks.get(n.id)?.length ?? 0),
          onSelect: opts.onSelect,
        },
      }
    }
    const hidden = !!opts.hideRecommended && n.recommended
    if (n.kind === 'junction') {
      return { ...base, hidden, type: 'junction', data: { label: n.label, recommended: n.recommended, faded: faded(n.id) } }
    }
    return { ...base, hidden, type: 'other', data: { text: n.text, recommended: n.recommended, faded: faded(n.id) } }
  })
  // Tab order follows the picture: left to right, then top to bottom.
  nodes.sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)

  const edges: Edge[] = model.edges.map((e) => {
    const isFaded = faded(e.id)
    const stroke = isFaded ? colors.edgeFaded : STROKE[e.kind]
    const label = layout.labels.get(e.id)
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'routed',
      hidden: !!opts.hideRecommended && e.kind === 'recommended',
      // Highlighted lines draw on top of faded ones.
      zIndex: isFaded ? 0 : 1,
      data: {
        points: layout.routes.get(e.id) ?? [],
        label: e.minGrade !== undefined && label ? { text: minGradeLabel(e.minGrade), ...label } : undefined,
      },
      style: {
        stroke,
        strokeWidth: opts.highlight && !isFaded ? 3 : isFaded ? 1.5 : 2,
        strokeDasharray: DASH[e.kind],
        strokeLinecap: 'round',
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 },
    }
  })
  return { nodes, edges }
}

/** Center point of a node, for centering the view on it. */
export function nodeCenter(model: FocusGraph, layout: Layout, id: string) {
  const node = model.nodes.find((n) => n.id === id)
  const pos = layout.positions.get(id)
  if (!node || !pos) return null
  const { width, height } = nodeSize(node)
  return { x: pos.x + width / 2, y: pos.y + height / 2 }
}
