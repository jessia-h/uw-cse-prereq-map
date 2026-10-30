// Left-to-right layout with elkjs's "layered" algorithm. Layered puts every
// edge pointing rightward, so prerequisites land left of the courses they
// unlock. Used by both the full map and the focus view.

import ELK, { type ElkExtendedEdge, type ElkNode } from 'elkjs/lib/elk.bundled.js'
import { isExternal } from './describe.ts'
import type { FocusGraph, FocusNode } from './focusGraph.ts'

/** Node box sizes in px. Components render at exactly these sizes. */
export function nodeSize(node: FocusNode): { width: number; height: number } {
  if (node.kind === 'junction') return { width: 72, height: 28 }
  if (node.kind === 'other') return { width: 176, height: 44 }
  // Room for a "Take with …" line under the title.
  const hasCoreq = !isExternal(node.course) && node.course.coreq
  return { width: 176, height: hasCoreq ? 100 : 64 }
}

/** Size of a minimum-grade label such as "≥ 2.0". */
export const LABEL_SIZE = { width: 36, height: 16 }

export const minGradeLabel = (minGrade: number) => `≥ ${minGrade.toFixed(1)}`

const elk = new ELK()

export type Point = { x: number; y: number }

export interface Layout {
  /** Top-left corner of each node. */
  positions: Map<string, Point>
  /** Each edge's route from elk (start, bends, end), so lines go around nodes. */
  routes: Map<string, Point[]>
  /** Center of each edge's minimum-grade label. elk places it mid-edge and reserves space for it, so labels never overlap (tested). */
  labels: Map<string, Point>
}

export async function layoutFocusGraph(graph: FocusGraph): Promise<Layout> {
  const root: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': '56',
      'elk.layered.spacing.edgeNodeBetweenLayers': '16',
      'elk.spacing.nodeNode': '20',
      'elk.spacing.edgeLabel': '2',
      // Keep input order where possible, so the same course lays out the same way.
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: graph.nodes.map((n) => ({ id: n.id, ...nodeSize(n) })),
    edges: graph.edges.map(
      (e): ElkExtendedEdge => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
        labels:
          e.minGrade === undefined
            ? undefined
            : [
                {
                  id: `${e.id}#label`,
                  text: minGradeLabel(e.minGrade),
                  ...LABEL_SIZE,
                  layoutOptions: { 'elk.edgeLabels.placement': 'CENTER' },
                },
              ],
      }),
    ),
  }
  const result = await elk.layout(root)
  const edges = (result.edges ?? []) as ElkExtendedEdge[]
  return {
    positions: new Map((result.children ?? []).map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }])),
    routes: new Map(
      edges.map((e) => {
        const s = e.sections?.[0]
        return [e.id, s ? [s.startPoint, ...(s.bendPoints ?? []), s.endPoint] : []]
      }),
    ),
    labels: new Map(
      edges.flatMap((e) => {
        const l = e.labels?.[0]
        return l ? [[e.id, { x: (l.x ?? 0) + LABEL_SIZE.width / 2, y: (l.y ?? 0) + LABEL_SIZE.height / 2 }]] : []
      }),
    ),
  }
}
