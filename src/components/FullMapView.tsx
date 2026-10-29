// The main screen: every course, laid out once. Selecting a course highlights
// it, its ancestors, and its direct descendants (the same set the Focus view
// shows) and fades the rest. Positions never move; only styles change.
//
// The detail panel (`panel`) overlays the right side of the map on wide
// screens, and the selected course is centered in the area left of it. On
// narrow screens the panel sits below the map.

import '@xyflow/react/dist/style.css'
import { Controls, ReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { courseData } from '../data/courses.ts'
import { useMediaQuery, WIDE } from '../hooks/useMediaQuery.ts'
import { buildFocusGraph, buildFullGraph, INTRO_SEQUENCE, introLinkIds } from '../lib/focusGraph.ts'
import { layoutFocusGraph, type Layout } from '../lib/layout.ts'
import { CenterOn } from './CenterOn.tsx'
import { nodeCenter, noteAbove, prereqGraph, toFlow } from './flow.ts'
import { CourseNode, JunctionNode, NoteNode, OtherNode } from './nodes.tsx'
import { RoutedEdge } from './RoutedEdge.tsx'

const nodeTypes = { course: CourseNode, junction: JunctionNode, other: OtherNode, note: NoteNode }
const edgeTypes = { routed: RoutedEdge }

// Built and laid out once, including recommendations, so toggling them
// on or off only shows or hides lines and never moves a course.
const fullModel = buildFullGraph(courseData)
const introLinks = introLinkIds(fullModel)

const INTRO_NOTE = 'Intro sequence: choose your starting point with Guided Self-Placement'

/** Width of the detail panel overlay in px, plus its gap from the map edge. Matches App.css. */
export const PANEL_WIDTH = 360
const PANEL_COVER = PANEL_WIDTH + 16

export function FullMapView(props: {
  selectedId: string | null
  showRecommended: boolean
  onSelect: (id: string) => void
  panel?: ReactNode
}) {
  const { selectedId, showRecommended, onSelect, panel } = props
  const wide = useMediaQuery(WIDE)

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

  const flow = useMemo(() => {
    if (!layout) return null
    const { nodes, edges } = toFlow(fullModel, layout, {
      onSelect,
      selected: selectedId,
      highlight,
      hideRecommended: !showRecommended,
      alwaysShow: introLinks,
    })
    const note = noteAbove(fullModel, layout, INTRO_SEQUENCE.slice(0, 2), INTRO_NOTE)
    return { nodes: note ? [note, ...nodes] : nodes, edges }
  }, [layout, onSelect, selectedId, highlight, showRecommended])

  const center = useMemo(() => {
    const point = layout && selectedId ? nodeCenter(fullModel, layout, selectedId) : null
    return point && selectedId ? { id: selectedId, ...point } : null
  }, [layout, selectedId])

  return (
    <div className={`map-with-panel${panel ? ' map-with-panel--open' : ''}`}>
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
            attributionPosition="top-left"
          >
            <Controls showInteractive={false} />
            <CenterOn
              ready={viewportReady}
              target={center}
              start={INTRO_SEQUENCE}
              coveredRight={panel && wide ? PANEL_COVER : 0}
            />
          </ReactFlow>
        ) : (
          <p className="graph-view__loading">Laying out…</p>
        )}
      </div>
      {panel}
    </div>
  )
}
