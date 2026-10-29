// The main screen: every course, laid out once. Selecting a course highlights
// it, its ancestors, and its direct descendants (the same set the Focus view
// shows) and fades the rest. Positions never move; only styles change.

import '@xyflow/react/dist/style.css'
import { Controls, ReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { courseData } from '../data/courses.ts'
import { buildFocusGraph, buildFullGraph } from '../lib/focusGraph.ts'
import { layoutFocusGraph, type Layout } from '../lib/layout.ts'
import { CenterOn } from './CenterOn.tsx'
import { nodeCenter, prereqGraph, toFlow } from './flow.ts'
import { CourseNode, JunctionNode, OtherNode } from './nodes.tsx'
import { RoutedEdge } from './RoutedEdge.tsx'

const nodeTypes = { course: CourseNode, junction: JunctionNode, other: OtherNode }
const edgeTypes = { routed: RoutedEdge }

// Built and laid out once, including recommendations, so toggling them
// on or off only shows or hides lines and never moves a course.
const fullModel = buildFullGraph(courseData)

export function FullMapView(props: {
  selectedId: string | null
  showRecommended: boolean
  onSelect: (id: string) => void
}) {
  const { selectedId, showRecommended, onSelect } = props

  const [layout, setLayout] = useState<Layout | null>(null)
  const [viewportReady, setViewportReady] = useState(false)
  useEffect(() => {
    let current = true
    layoutFocusGraph(fullModel).then((result) => current && setLayout(result))
    return () => {
      current = false
    }
  }, [])

  const highlight = useMemo(() => {
    if (!selectedId) return null
    const focus = buildFocusGraph(selectedId, courseData, prereqGraph, { showRecommended })
    return new Set([...focus.nodes.map((n) => n.id), ...focus.edges.map((e) => e.id)])
  }, [selectedId, showRecommended])

  const flow = useMemo(
    () =>
      layout &&
      toFlow(fullModel, layout, { onSelect, selected: selectedId, highlight, hideRecommended: !showRecommended }),
    [layout, onSelect, selectedId, highlight, showRecommended],
  )

  const center = useMemo(() => {
    const point = layout && selectedId ? nodeCenter(fullModel, layout, selectedId) : null
    return point && selectedId ? { id: selectedId, ...point } : null
  }, [layout, selectedId])

  return (
    <div className="graph-view graph-view--map">
      {flow ? (
        <ReactFlow
          nodes={flow.nodes}
          edges={flow.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          // CenterOn does the initial framing, so a ?course= link opens centered on it.
          onInit={() => setViewportReady(true)}
          minZoom={0.1}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
        >
          <Controls showInteractive={false} />
          <CenterOn ready={viewportReady} target={center} />
        </ReactFlow>
      ) : (
        <p className="graph-view__loading">Laying out…</p>
      )}
    </div>
  )
}
