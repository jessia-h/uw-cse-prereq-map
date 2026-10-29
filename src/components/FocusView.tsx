// The graph: builds the focus model, lays it out with elkjs, and renders it
// with React Flow. Dragging, connecting and selecting are off; the graph is
// for reading. Pan and zoom stay on.

import '@xyflow/react/dist/style.css'
import { Controls, MarkerType, ReactFlow, type Edge, type Node } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { courseData } from '../data/courses.ts'
import { courseLabel, isExternal } from '../lib/describe.ts'
import { buildFocusGraph, type EdgeKind, type FocusGraph } from '../lib/focusGraph.ts'
import { layoutFocusGraph, NODE_SIZE, type Layout } from '../lib/layout.ts'
import { buildGraph } from '../lib/prereq.ts'
import { colors } from '../theme.ts'
import { CourseNode, JunctionNode, OtherNode } from './nodes.tsx'
import { RoutedEdge } from './RoutedEdge.tsx'

const nodeTypes = { course: CourseNode, junction: JunctionNode, other: OtherNode }
const edgeTypes = { routed: RoutedEdge }

const graph = buildGraph(courseData)

// Line style carries the meaning; color is the same token family throughout.
const EDGE_STYLE: Record<EdgeKind, { stroke: string; dash?: string }> = {
  required: { stroke: colors.edgeRequired },
  'one-of': { stroke: colors.edgeOneOf, dash: '8 5' },
  recommended: { stroke: colors.edgeRecommended, dash: '2 5' },
}

function toFlow(model: FocusGraph, { positions, routes }: Layout, onSelect: (id: string) => void) {
  const nodes: Node[] = model.nodes.map((n) => {
    const base = { id: n.id, position: positions.get(n.id) ?? { x: 0, y: 0 }, ...NODE_SIZE[n.kind] }
    if (n.kind === 'course') {
      return {
        ...base,
        type: 'course',
        data: {
          courseId: n.id,
          title: n.course.title,
          role: n.role,
          external: isExternal(n.course),
          retired: n.course.status === 'retired',
          label: courseLabel(n.course, graph.unlocks.get(n.id)?.length ?? 0),
          onSelect,
        },
      }
    }
    if (n.kind === 'junction') return { ...base, type: 'junction', data: { label: n.label, recommended: n.recommended } }
    return { ...base, type: 'other', data: { text: n.text, recommended: n.recommended } }
  })
  // Tab order follows the picture: left to right, then top to bottom.
  nodes.sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)

  const edges: Edge[] = model.edges.map((e) => {
    const { stroke, dash } = EDGE_STYLE[e.kind]
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'routed',
      data: { points: routes.get(e.id) ?? [] },
      style: { stroke, strokeWidth: 2, strokeDasharray: dash, strokeLinecap: 'round' },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 },
    }
  })
  return { nodes, edges }
}

export function FocusView(props: { focusId: string; showRecommended: boolean; onSelect: (id: string) => void }) {
  const { focusId, showRecommended, onSelect } = props
  const model = useMemo(
    () => buildFocusGraph(focusId, courseData, graph, { showRecommended }),
    [focusId, showRecommended],
  )

  // Layout is async; drop results for a model that is no longer current.
  const [layout, setLayout] = useState<{ model: FocusGraph; result: Layout } | null>(null)
  useEffect(() => {
    let current = true
    layoutFocusGraph(model).then((result) => current && setLayout({ model, result }))
    return () => {
      current = false
    }
  }, [model])

  const flow = useMemo(
    () => (layout?.model === model ? toFlow(model, layout.result, onSelect) : null),
    [layout, model, onSelect],
  )

  return (
    <div className="focus-view">
      {flow ? (
        <ReactFlow
          // Remount per course so fitView frames each new graph.
          key={`${focusId}:${showRecommended}`}
          nodes={flow.nodes}
          edges={flow.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.2}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
        >
          <Controls showInteractive={false} />
        </ReactFlow>
      ) : (
        <p className="focus-view__loading">Laying out…</p>
      )}
    </div>
  )
}
