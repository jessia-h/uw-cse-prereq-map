// Left-to-right layout with elkjs's "layered" algorithm. Layered puts every
// edge pointing rightward, so prerequisites land left of the courses they
// unlock. Runs at build time (scripts/build-layouts.ts writes every layout to
// src/generated/layouts.json) and in tests; the browser never loads elkjs.

import ElkDefault, { type ELK as ElkInstance, type ElkExtendedEdge, type ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { FocusGraph } from './focusGraph.ts'

// Sizes, levels, and the Layout type live in geometry.ts, which the browser
// imports; only this file loads elkjs (at build time and in tests).
export * from './geometry.ts'
import { LABEL_SIZE, levelOf, minGradeLabel, nodeSize, type Layout } from './geometry.ts'

// elkjs is CommonJS. Node and Vite both hand over the class as the default
// import, but with `module: nodenext` (the scripts' tsconfig, which reaches
// this file through scripts/build-layouts.ts) TypeScript types it as the
// module object, so the type is stated here.
const ELK = ElkDefault as unknown as new () => ElkInstance
const elk = new ELK()

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
