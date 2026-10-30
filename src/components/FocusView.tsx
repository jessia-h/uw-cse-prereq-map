// The secondary view: one course, laid out on its own with its ancestors on
// the left and direct descendants on the right. Dragging, connecting and
// selecting are off; pan and zoom stay on.
//
// The layout always includes recommended courses, and the toggle only shows
// or hides them, so turning it on or off never moves a course.

import '@xyflow/react/dist/style.css'
import { Controls, ReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { shownData } from '../data/courses.ts'
import { buildFocusGraph, type FocusGraph } from '../lib/focusGraph.ts'
import { layoutFocusGraph, type Layout } from '../lib/layout.ts'
import { prereqGraph, toFlow } from './flow.ts'
import { GraphKeyboard } from './GraphKeyboard.tsx'
import { CourseNode, JunctionNode, OtherNode } from './nodes.tsx'
import { RoutedEdge } from './RoutedEdge.tsx'

const nodeTypes = { course: CourseNode, junction: JunctionNode, other: OtherNode }
const edgeTypes = { routed: RoutedEdge }

export function FocusView(props: { focusId: string; showRecommended: boolean; onSelect: (id: string) => void }) {
  const { focusId, showRecommended, onSelect } = props
  const model = useMemo(() => buildFocusGraph(focusId, shownData, prereqGraph, { showRecommended: true }), [focusId])

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
    () =>
      layout?.model === model
        ? toFlow(model, layout.result, { onSelect, selected: focusId, hideRecommended: !showRecommended })
        : null,
    [layout, model, onSelect, focusId, showRecommended],
  )

  return (
    <div className="graph-view">
      {flow ? (
        <ReactFlow
          // Remount per course so fitView frames each new graph.
          key={focusId}
          nodes={flow.nodes}
          edges={flow.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          // Frame hidden recommended courses too, so showing them needs no reframing.
          fitViewOptions={{ padding: 0.1, includeHiddenNodes: true }}
          minZoom={0.2}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
        >
          <Controls showInteractive={false} />
          {layout && <GraphKeyboard model={layout.model} layout={layout.result} />}
        </ReactFlow>
      ) : (
        <p className="graph-view__loading">Laying out…</p>
      )}
    </div>
  )
}
