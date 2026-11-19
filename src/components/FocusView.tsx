// The secondary view: one course, laid out on its own with its ancestors on
// the left and direct descendants on the right. Dragging, connecting and
// selecting are off; pan and zoom stay on.
//
// The layout always includes recommended courses, and the toggle only shows
// or hides them, so turning it on or off never moves a course.

import '@xyflow/react/dist/style.css'
import { Controls, ReactFlow } from '@xyflow/react'
import { useMemo } from 'react'
import { shownData } from '../data/courses.ts'
import type { Degree } from '../data/programs.ts'
import { focusLayout } from '../data/layouts.ts'
import { buildFocusGraph } from '../lib/focusGraph.ts'
import { prereqGraph, SCROLL_ZOOM, toFlow } from './flow.ts'
import { GraphKeyboard } from './GraphKeyboard.tsx'
import { CourseNode, JunctionNode, OtherNode } from './nodes.tsx'
import { RoutedEdge } from './RoutedEdge.tsx'
import { ScrollHint } from './ScrollHint.tsx'

const nodeTypes = { course: CourseNode, junction: JunctionNode, other: OtherNode }
const edgeTypes = { routed: RoutedEdge }

export function FocusView(props: {
  focusId: string
  showRecommended: boolean
  onSelect: (id: string) => void
  degree: Degree | null
}) {
  const { focusId, showRecommended, onSelect, degree } = props
  const model = useMemo(() => buildFocusGraph(focusId, shownData, prereqGraph, { showRecommended: true }), [focusId])

  // Laid out at build time (npm run data) for this same graph.
  const layout = focusLayout(focusId)

  const flow = useMemo(
    () =>
      layout
        ? // Everything here is on the course's path, so filters don't apply; the degree lens does.
          toFlow(model, layout, { onSelect, selected: focusId, hideRecommended: !showRecommended, degree })
        : null,
    [layout, model, onSelect, focusId, showRecommended, degree],
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
          {...SCROLL_ZOOM}
        >
          <Controls showInteractive={false} />
          <ScrollHint />
          {layout && <GraphKeyboard model={model} layout={layout} />}
        </ReactFlow>
      ) : (
        <p className="graph-view__loading">No map for this course yet.</p>
      )}
    </div>
  )
}
