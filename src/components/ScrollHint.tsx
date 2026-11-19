// Scrolling over the map scrolls the page; the map zooms only with Ctrl or
// Cmd held (or a trackpad pinch, which browsers send as Ctrl + wheel). A
// plain scroll shows "Use Ctrl + scroll to zoom" for a moment. Render inside
// <ReactFlow>, with SCROLL_ZOOM from flow.ts.
//
// Ctrl/Cmd + wheel is handled here rather than by React Flow: React Flow
// only sees Cmd if the key press reached this page (it often doesn't when
// the map is embedded in an iframe), and it treats every Ctrl + wheel as a
// pinch, so one mouse-wheel step jumps to full zoom.

import { useReactFlow, useStore } from '@xyflow/react'
import { useEffect, useState } from 'react'

const SHOW_FOR_MS = 1600

/** How much one wheel event zooms: trackpad pinches send many small deltas, a mouse wheel few large ones. */
const zoomFactor = (deltaY: number) => 2 ** (-deltaY * (Math.abs(deltaY) < 50 ? 0.01 : 0.002))

export function ScrollHint() {
  const domNode = useStore((s) => s.domNode)
  const minZoom = useStore((s) => s.minZoom)
  const maxZoom = useStore((s) => s.maxZoom)
  const flow = useReactFlow()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!domNode) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        // A plain scroll: let the page scroll, and say how to zoom.
        setVisible(true)
        clearTimeout(timer)
        timer = setTimeout(() => setVisible(false), SHOW_FOR_MS)
        return
      }
      // Ctrl/Cmd + scroll or a pinch: zoom around the pointer, and keep the
      // browser from zooming the whole page.
      e.preventDefault()
      e.stopPropagation()
      const { x, y, zoom } = flow.getViewport()
      const next = Math.min(maxZoom, Math.max(minZoom, zoom * zoomFactor(e.deltaY)))
      const box = domNode.getBoundingClientRect()
      const px = e.clientX - box.left
      const py = e.clientY - box.top
      flow.setViewport({ x: px - ((px - x) / zoom) * next, y: py - ((py - y) / zoom) * next, zoom: next })
    }
    // Capture, so this runs before React Flow's own wheel handling.
    domNode.addEventListener('wheel', onWheel, { capture: true, passive: false })
    return () => {
      domNode.removeEventListener('wheel', onWheel, { capture: true })
      clearTimeout(timer)
    }
  }, [domNode, flow, minZoom, maxZoom])

  // Decorative for screen readers (they don't scroll with a wheel); the
  // zoom buttons are labelled.
  return visible ? (
    <div className="scroll-hint" aria-hidden="true">
      Use Ctrl + scroll to zoom
    </div>
  ) : null
}
