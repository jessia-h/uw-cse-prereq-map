// Left-to-right layout with elkjs's "layered" algorithm. Layered puts every
// edge pointing rightward, so prerequisites land left of the courses they
// unlock: ancestors left of the focus course, descendants right of it.

import ELK, { type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js'
import type { FocusGraph, FocusNode } from './focusGraph.ts'

/** Node box sizes in px. Components render at exactly these sizes. */
export const NODE_SIZE = {
  course: { width: 176, height: 64 },
  junction: { width: 72, height: 28 },
  other: { width: 176, height: 44 },
} as const satisfies Record<FocusNode['kind'], { width: number; height: number }>

const elk = new ELK()

export type Point = { x: number; y: number }

export interface Layout {
  /** Top-left corner of each node. */
  positions: Map<string, Point>
  /** Each edge's route from elk (start, bends, end), so lines go around nodes. */
  routes: Map<string, Point[]>
}

export async function layoutFocusGraph(graph: FocusGraph): Promise<Layout> {
  const result = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': '56',
      'elk.layered.spacing.edgeNodeBetweenLayers': '16',
      'elk.spacing.nodeNode': '20',
      // Keep input order where possible, so the same course lays out the same way.
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: graph.nodes.map((n) => ({ id: n.id, ...NODE_SIZE[n.kind] })),
    edges: graph.edges.map((e): ElkExtendedEdge => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  })
  return {
    positions: new Map((result.children ?? []).map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }])),
    routes: new Map(
      (result.edges ?? []).map((e) => {
        const s = e.sections?.[0]
        return [e.id, s ? [s.startPoint, ...(s.bendPoints ?? []), s.endPoint] : []]
      }),
    ),
  }
}
