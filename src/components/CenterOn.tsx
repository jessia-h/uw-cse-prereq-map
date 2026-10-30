// Frames the full map. On first render: centers on the selected course, or
// frames the `start` courses at a readable zoom. Afterwards: gently pans to
// each new selection, zooming in if far out. Instant if the user prefers
// reduced motion. Must be rendered inside <ReactFlow>.
//
// When `panelOpen`, the detail panel covers the map's right side; the course
// is centered in the area left of it.
//
// Note: this doesn't use React Flow's useNodesInitialized(). That flag resets
// whenever new node objects arrive (every selection, for highlighting), and
// our nodes have fixed sizes, so nothing re-measures them to set it again.

import { useReactFlow, useStore } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { panelCover } from './flow.ts'

const MIN_ZOOM_ON_SELECT = 0.8

export function CenterOn(props: {
  ready: boolean
  target: { id: string; x: number; y: number } | null
  start: string[]
  panelOpen: boolean
}) {
  const { ready, target, start, panelOpen } = props
  const flow = useReactFlow()
  const mapWidth = useStore((s) => s.width)
  const coveredRight = panelOpen ? panelCover(mapWidth) : 0
  const first = useRef(true)
  const { id, x, y } = target ?? {}

  useEffect(() => {
    if (!ready) return
    const instant = first.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isFirst = first.current
    first.current = false
    if (id === undefined || x === undefined || y === undefined) {
      if (isFirst) flow.fitView({ nodes: start.map((s) => ({ id: s })), padding: 0.3, minZoom: 0.9, maxZoom: 1 })
      return
    }
    const zoom = Math.max(flow.getZoom(), MIN_ZOOM_ON_SELECT)
    // Shift the view's center right by half the covered width, so the course
    // sits in the middle of the visible part.
    flow.setCenter(x + coveredRight / 2 / zoom, y, { zoom, duration: instant ? 0 : 400 })
  }, [ready, flow, id, x, y, start, coveredRight])

  return null
}
