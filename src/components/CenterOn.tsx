// Frames the full map: on first render, centers on the selected course (or
// fits the whole map if none); afterwards, gently pans to each new selection,
// zooming in if far out. Instant if the user prefers reduced motion.
// Must be rendered inside <ReactFlow>.
//
// Note: this doesn't use React Flow's useNodesInitialized(). That flag resets
// whenever new node objects arrive (every selection, for highlighting), and
// our nodes have fixed sizes, so nothing re-measures them to set it again.

import { useReactFlow } from '@xyflow/react'
import { useEffect, useRef } from 'react'

const MIN_ZOOM_ON_SELECT = 0.8

export function CenterOn(props: { ready: boolean; target: { id: string; x: number; y: number } | null }) {
  const { ready, target } = props
  const flow = useReactFlow()
  const first = useRef(true)
  const { id, x, y } = target ?? {}

  useEffect(() => {
    if (!ready) return
    const instant = first.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    first.current = false
    if (id === undefined || x === undefined || y === undefined) {
      if (instant) flow.fitView({ padding: 0.05 })
      return
    }
    flow.setCenter(x, y, {
      zoom: Math.max(flow.getZoom(), MIN_ZOOM_ON_SELECT),
      duration: instant ? 0 : 400,
    })
  }, [ready, flow, id, x, y])

  return null
}
