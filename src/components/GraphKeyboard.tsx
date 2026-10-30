// Keyboard support inside a graph (render inside <ReactFlow>):
// - ArrowLeft: to a prerequisite of the focused course.
// - ArrowRight: to a course it unlocks.
// - ArrowUp / ArrowDown: to the nearest course above / below.
// Where there are several, the one closest vertically wins.
//
// Also keeps the focused course visible: when focus lands on a node outside
// the visible area (by arrow key or Tab), the view pans to it. Browsers try
// to scroll the focused element into view themselves, which shifts React
// Flow's clipped container, so that scroll is reset first.

import { useReactFlow, useStore } from '@xyflow/react'
import { useEffect } from 'react'
import type { FocusGraph } from '../lib/focusGraph.ts'
import { nodeSize, type Layout } from '../lib/layout.ts'
import { panelCover, prereqGraph } from './flow.ts'

const MARGIN = 24

export function GraphKeyboard(props: { model: FocusGraph; layout: Layout; panelOpen?: boolean }) {
  const { model, layout, panelOpen = false } = props
  const flow = useReactFlow()
  const domNode = useStore((s) => s.domNode)
  const mapWidth = useStore((s) => s.width)
  const coveredRight = panelOpen ? panelCover(mapWidth) : 0

  useEffect(() => {
    if (!domNode) return
    const courses = new Map(
      model.nodes.flatMap((n) => {
        const pos = layout.positions.get(n.id)
        if (n.kind !== 'course' || !pos) return []
        const { width, height } = nodeSize(n)
        return [[n.id, { x: pos.x, y: pos.y, cx: pos.x + width / 2, cy: pos.y + height / 2 }]] as const
      }),
    )
    const buttonFor = (id: string) =>
      domNode.querySelector<HTMLButtonElement>(`button.course-node[data-course-id="${id}"]`)

    /** Pan so the course is inside the visible part of the map, if it isn't already. */
    const reveal = (button: HTMLElement) => {
      domNode.scrollTop = 0
      domNode.scrollLeft = 0
      const box = button.getBoundingClientRect()
      const area = domNode.getBoundingClientRect()
      const inside =
        box.left >= area.left + MARGIN &&
        box.right <= area.right - coveredRight - MARGIN &&
        box.top >= area.top + MARGIN &&
        box.bottom <= area.bottom - MARGIN
      const c = courses.get(button.dataset.courseId ?? '')
      if (inside || !c) return
      const zoom = flow.getZoom()
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      flow.setCenter(c.cx + coveredRight / 2 / zoom, c.cy, { zoom, duration: reduceMotion ? 0 : 200 })
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const button = (e.target as HTMLElement).closest<HTMLElement>('button.course-node')
      const id = button?.dataset.courseId
      const from = id && courses.get(id)
      if (!from) return

      let candidates: string[] = []
      if (e.key === 'ArrowLeft') candidates = (prereqGraph.prereqsOf.get(id) ?? []).map((p) => p.id)
      else if (e.key === 'ArrowRight') candidates = (prereqGraph.unlocks.get(id) ?? []).map((u) => u.id)
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const below = e.key === 'ArrowDown'
        candidates = [...courses.keys()].filter((other) => {
          const c = courses.get(other)!
          return below ? c.cy > from.cy + 1 : c.cy < from.cy - 1
        })
      } else return

      const target = candidates
        .filter((c) => courses.has(c) && buttonFor(c)) // drawn and not hidden
        .map((c) => ({ id: c, ...courses.get(c)! }))
        // Up/Down: prefer the same column, then the nearest row.
        .sort((a, b) => Math.abs(a.cx - from.cx) / 4 + Math.abs(a.cy - from.cy) - (Math.abs(b.cx - from.cx) / 4 + Math.abs(b.cy - from.cy)))[0]
      e.preventDefault() // arrows would otherwise scroll the page
      if (target) buttonFor(target.id)?.focus({ preventScroll: true })
    }

    const onFocusIn = (e: FocusEvent) => {
      const button = (e.target as HTMLElement).closest<HTMLElement>('button.course-node')
      if (button) reveal(button)
    }

    domNode.addEventListener('keydown', onKeyDown)
    domNode.addEventListener('focusin', onFocusIn)
    return () => {
      domNode.removeEventListener('keydown', onKeyDown)
      domNode.removeEventListener('focusin', onFocusIn)
    }
  }, [domNode, model, layout, flow, coveredRight])

  return null
}
