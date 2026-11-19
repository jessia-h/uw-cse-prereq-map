// The main screen: every course, laid out once. With nothing selected, every
// line is quiet grey. Selecting a course highlights it, its ancestors, and its
// direct descendants (the same set the Focus view shows) in purple and fades
// the rest. Positions never move; only styles change.
//
// The detail panel (`panel`) overlays the right side of the map on wide
// screens, and the selected course is centered in the area left of it. On
// narrow screens the panel sits below the map.
//
// Levels get their own columns (elk partitions) and light background bands,
// with headings pinned to the top of the map. The degree lens, filters, and
// "simplify intro-course lines" only change what is drawn, never positions.

import '@xyflow/react/dist/style.css'
import { Controls, ReactFlow, useStore, type Node } from '@xyflow/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { shownData } from '../data/courses.ts'
import type { Degree } from '../data/programs.ts'
import { useMediaQuery, WIDE } from '../hooks/useMediaQuery.ts'
import { buildFocusGraph, buildFullGraph, INTRO_SEQUENCE, introLinkIds } from '../lib/focusGraph.ts'
import { layoutFocusGraph, levelOf, nodeSize, type Layout } from '../lib/layout.ts'
import { CenterOn } from './CenterOn.tsx'
import { GraphKeyboard } from './GraphKeyboard.tsx'
import { nodeCenter, noteAbove, prereqGraph, SCROLL_ZOOM, toFlow } from './flow.ts'
import type { Filters } from './lens.ts'
import { BandNode, CourseNode, JunctionNode, NoteNode, OtherNode } from './nodes.tsx'
import { RoutedEdge } from './RoutedEdge.tsx'
import { ScrollHint } from './ScrollHint.tsx'

const nodeTypes = { course: CourseNode, junction: JunctionNode, other: OtherNode, note: NoteNode, band: BandNode }
const edgeTypes = { routed: RoutedEdge }

// Built and laid out once, including recommendations, so toggling them
// on or off only shows or hides lines and never moves a course.
const fullModel = buildFullGraph(shownData)
const introLinks = introLinkIds(fullModel)

const INTRO_NOTE = 'Intro sequence: choose your starting point with Guided Self-Placement'

const BAND_LABEL: Record<number, string> = { 1: '100-level', 2: '200-level (non-CSE)', 3: '300-level', 4: '400-level' }
const BAND_GAP = 44 // half the gap between columns (layout.ts)

interface Band {
  level: number
  x: number
  width: number
}

/** One band per level, spanning its columns. */
function levelBands(layout: Layout): { bands: Band[]; top: number; bottom: number } {
  const spans = new Map<number, [number, number]>()
  let top = Infinity
  let bottom = -Infinity
  for (const n of fullModel.nodes) {
    const pos = layout.positions.get(n.id)
    if (!pos) continue
    const { width, height } = nodeSize(n)
    const level = levelOf(n.id)
    const [lo, hi] = spans.get(level) ?? [Infinity, -Infinity]
    spans.set(level, [Math.min(lo, pos.x), Math.max(hi, pos.x + width)])
    top = Math.min(top, pos.y)
    bottom = Math.max(bottom, pos.y + height)
  }
  const bands = [...spans]
    .sort(([a], [b]) => a - b)
    .map(([level, [lo, hi]]) => ({ level, x: lo - BAND_GAP, width: hi - lo + 2 * BAND_GAP }))
  return { bands, top: top - 120, bottom: bottom + 40 }
}

/**
 * Level headings, pinned to the top of the map and following its pan and
 * zoom sideways. Decorative: each card's level tag says the same.
 */
function LevelHeadings({ bands }: { bands: Band[] }) {
  const [tx, , zoom] = useStore((s) => s.transform)
  const width = useStore((s) => s.width)
  return (
    <div className="level-headings" aria-hidden="true">
      {bands.map((b) => {
        const left = b.x * zoom + tx
        const right = left + b.width * zoom
        if (right < 0 || left > width) return null
        // Keep the label inside the visible part of its band.
        const x = Math.max(left, 0) + 8
        return (
          <span key={b.level} className="level-headings__label" style={{ left: x, maxWidth: Math.max(0, right - x - 8) }}>
            {BAND_LABEL[b.level] ?? `${b.level}00-level`}
          </span>
        )
      })}
    </div>
  )
}

export function FullMapView(props: {
  selectedId: string | null
  showRecommended: boolean
  onSelect: (id: string) => void
  panel?: ReactNode
  degree: Degree | null
  filters: Filters
  simplify: boolean
  /** Reports how many courses are drawn, for the filters' status line. */
  onCount?: (shown: number, total: number) => void
}) {
  const { selectedId, showRecommended, onSelect, panel, degree, filters, simplify, onCount } = props
  const wide = useMediaQuery(WIDE)

  const [layout, setLayout] = useState<Layout | null>(null)
  const [viewportReady, setViewportReady] = useState(false)
  useEffect(() => {
    let current = true
    layoutFocusGraph(fullModel, { levelBands: true }).then((result) => current && setLayout(result))
    return () => {
      current = false
    }
  }, [])

  const highlight = useMemo(() => {
    if (!selectedId) return null
    const focus = buildFocusGraph(selectedId, shownData, prereqGraph, { showRecommended })
    return new Set([...focus.nodes.map((n) => n.id), ...focus.edges.map((e) => e.id)])
  }, [selectedId, showRecommended])

  const { levels, hideNonCse, hideUnused } = filters
  const flow = useMemo(() => {
    if (!layout) return null
    const { nodes, edges, visible } = toFlow(fullModel, layout, {
      onSelect,
      selected: selectedId,
      quiet: !selectedId,
      highlight,
      hideRecommended: !showRecommended,
      alwaysShow: introLinks,
      degree,
      filters: { levels, hideNonCse, hideUnused },
      simplify,
    })
    const note = noteAbove(fullModel, layout, INTRO_SEQUENCE.slice(0, 2), INTRO_NOTE)
    const { bands, top, bottom } = levelBands(layout)
    const bandNodes: Node[] = bands.map((b, i) => ({
      id: `band:${b.level}`,
      type: 'band',
      position: { x: b.x, y: top },
      width: b.width,
      height: bottom - top,
      data: { tinted: i % 2 === 1 },
      zIndex: -1, // behind lines and cards
      selectable: false,
      focusable: false,
    }))
    return { nodes: [...bandNodes, ...(note ? [note] : []), ...nodes], edges, bands, visible }
  }, [layout, onSelect, selectedId, highlight, showRecommended, degree, levels, hideNonCse, hideUnused, simplify])

  useEffect(() => {
    if (flow) onCount?.(flow.visible.shown, flow.visible.total)
  }, [flow, onCount])

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
            {...SCROLL_ZOOM}
            attributionPosition="bottom-right" // the top edge holds the level headings
          >
            <Controls showInteractive={false} />
            <ScrollHint />
            <LevelHeadings bands={flow.bands} />
            <CenterOn
              ready={viewportReady}
              target={center}
              start={INTRO_SEQUENCE}
              panelOpen={!!panel && wide}
            />
            {layout && <GraphKeyboard model={fullModel} layout={layout} panelOpen={!!panel && wide} />}
          </ReactFlow>
        ) : (
          <p className="graph-view__loading">Laying out…</p>
        )}
      </div>
      {panel}
    </div>
  )
}
