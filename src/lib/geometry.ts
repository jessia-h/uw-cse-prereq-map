// Layout geometry shared by the browser and the layout build: node sizes,
// level bands, the Layout type, and the JSON form of precomputed layouts.
// No elkjs here (that's layout.ts), so the browser bundle stays small.

import type { FocusNode } from './focusGraph.ts'

export const CARD_WIDTH = 200
export const CARD_HEIGHT = 96

/**
 * Node box sizes in px. Components render at exactly these sizes. Every
 * course card is the same size: number and level, a one-line title, and up
 * to two lines of tags (role, "Needs CSE 123 or 143", "Co-requisite", …).
 */
export function nodeSize(node: FocusNode): { width: number; height: number } {
  if (node.kind === 'junction') return { width: 48, height: 20 } // the "1 of 2" pill
  if (node.kind === 'other') return { width: CARD_WIDTH, height: 44 }
  return { width: CARD_WIDTH, height: CARD_HEIGHT }
}

/**
 * A node's level band: 1 for 100-level, 2 for 200-level (non-CSE), and so
 * on. "1 of N" pills and "other" boxes take the level of the course they feed
 * (their id starts with it, e.g. "CSE 311/prereq.all0").
 */
export function levelOf(nodeId: string): number {
  const courseId = nodeId.split('/')[0]
  return Math.floor(Number(courseId.split(' ').at(-1)) / 100)
}

/** Size of a minimum-grade tag such as "≥ 2.0". */
export const LABEL_SIZE = { width: 40, height: 18 }

export const minGradeLabel = (minGrade: number) => `≥ ${minGrade.toFixed(1)}`

export type Point = { x: number; y: number }

export interface Layout {
  /** Top-left corner of each node. */
  positions: Map<string, Point>
  /** Each edge's route from elk (start, bends, end), so lines go around nodes. */
  routes: Map<string, Point[]>
  /** Center of each edge's minimum-grade label. elk places it mid-edge and reserves space for it, so labels never overlap (tested). */
  labels: Map<string, Point>
}

/** A layout as JSON (src/generated/layouts.json): numbers rounded to 0.1 px. */
export interface SerializedLayout {
  positions: [id: string, x: number, y: number][]
  routes: [id: string, points: number[]][] // x1, y1, x2, y2, …
  labels: [id: string, x: number, y: number][]
}

/** Every layout the app draws: the full map, and "Just this course" for each course. */
export interface LayoutFile {
  full: SerializedLayout
  focus: Record<string, SerializedLayout>
}

const r = (n: number) => Math.round(n * 10) / 10

export function serializeLayout(layout: Layout): SerializedLayout {
  return {
    positions: [...layout.positions].map(([id, p]) => [id, r(p.x), r(p.y)]),
    routes: [...layout.routes].map(([id, points]) => [id, points.flatMap((p) => [r(p.x), r(p.y)])]),
    labels: [...layout.labels].map(([id, p]) => [id, r(p.x), r(p.y)]),
  }
}

export function deserializeLayout(json: SerializedLayout): Layout {
  return {
    positions: new Map(json.positions.map(([id, x, y]) => [id, { x, y }])),
    routes: new Map(
      json.routes.map(([id, flat]) => [id, Array.from({ length: flat.length / 2 }, (_, i) => ({ x: flat[2 * i], y: flat[2 * i + 1] }))]),
    ),
    labels: new Map(json.labels.map(([id, x, y]) => [id, { x, y }])),
  }
}
