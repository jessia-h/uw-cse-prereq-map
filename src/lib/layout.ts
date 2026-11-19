// Left-to-right layout with elkjs's "layered" algorithm. Layered puts every
// edge pointing rightward, so prerequisites land left of the courses they
// unlock. Used by both the full map and the focus view.

import ELK, { type ElkExtendedEdge, type ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { FocusGraph, FocusNode } from './focusGraph.ts'

export const CARD_WIDTH = 200
export const CARD_HEIGHT = 96

/**
 * Node box sizes in px. Components render at exactly these sizes. Every
 * course card is the same size: number and level, a one-line title, and up
 * to two lines of tags (role, "Needs CSE 123 or 143", "Co-requisite", …).
 */
export function nodeSize(node: FocusNode): { width: number; height: number } {
  if (node.kind === 'junction') return { width: 48, height: 20 } // the "1 of 2" pill
  if (node.kind === 'other') return { width: CARD_WIDTH, height: 44 }
  return { width: CARD_WIDTH, height: CARD_HEIGHT }
}

/**
 * A node's level band: 1 for 100-level, 2 for 200-level (non-CSE), and so
 * on. "1 of N" pills and "other" boxes take the level of the course they feed
 * (their id starts with it, e.g. "CSE 311/prereq.all0").
 */
export function levelOf(nodeId: string): number {
  const courseId = nodeId.split('/')[0]
  return Math.floor(Number(courseId.split(' ').at(-1)) / 100)
}

/** Size of a minimum-grade tag such as "≥ 2.0". */
export const LABEL_SIZE = { width: 40, height: 18 }

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

/**
 * Lay out a graph left to right. With `levelBands`, each level gets its own
 * columns (elk "partitions"), so the full map can draw 100-, 200-, 300- and
 * 400-level bands. No prerequisite goes from a higher level to a lower one,
 * so elk can always honor them (tested).
 */
export async function layoutFocusGraph(graph: FocusGraph, { levelBands = false } = {}): Promise<Layout> {
  const root: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': '88',
      'elk.layered.spacing.edgeNodeBetweenLayers': '16',
      'elk.spacing.nodeNode': '20',
      'elk.spacing.edgeLabel': '2',
      // Keep input order where possible, so the same course lays out the same way.
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      // Courses with no lines (CSE 480, SOC 225) would otherwise be laid out
      // apart, ignoring the partitions; keep the whole map as one graph.
      ...(levelBands && { 'elk.partitioning.activate': 'true', 'elk.separateConnectedComponents': 'false' }),
    },
    children: graph.nodes.map((n) => ({
      id: n.id,
      ...nodeSize(n),
      ...(levelBands && { layoutOptions: { 'elk.partitioning.partition': String(levelOf(n.id)) } }),
    })),
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
