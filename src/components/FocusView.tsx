// The secondary view: one course, laid out on its own with its ancestors on
// the left and direct descendants on the right. Dragging, connecting and
// selecting are off; pan and zoom stay on.

import '@xyflow/react/dist/style.css'
import { Controls, ReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { courseData } from '../data/courses.ts'
import { buildFocusGraph, type FocusGraph } from '../lib/focusGraph.ts'
import { layoutFocusGraph, type Layout } from '../lib/layout.ts'
import { prereqGraph, toFlow } from './flow.ts'
import { CourseNode, JunctionNode, OtherNode } from './nodes.tsx'
import { RoutedEdge } from './RoutedEdge.tsx'

const nodeTypes = { course: CourseNode, junction: JunctionNode, other: OtherNode }
const edgeTypes = { routed: RoutedEdge }

export function FocusView(props: { focusId: string; showRecommended: boolean; onSelect: (id: string) => void }) {
  const { focusId, showRecommended, onSelect } = props
  const model = useMemo(
    () => buildFocusGraph(focusId, courseData, prereqGraph, { showRecommended }),
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
    () => (layout?.model === model ? toFlow(model, layout.result, { onSelect, selected: focusId }) : null),
    [layout, model, onSelect, focusId],
  )

  return (
    <div className="graph-view">
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
        <p className="graph-view__loading">Laying out…</p>
      )}
    </div>
  )
}
