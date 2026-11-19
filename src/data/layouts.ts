// Precomputed layouts: src/generated/layouts.json, written by `npm run data`
// (scripts/build-layouts.ts). The browser reads positions and line routes
// from here instead of running elkjs.

import raw from '../generated/layouts.json'
import { deserializeLayout, type Layout, type LayoutFile } from '../lib/geometry.ts'

const file = raw as unknown as LayoutFile

/** The full map, with level bands. */
export const fullLayout: Layout = deserializeLayout(file.full)

const focusLayouts = new Map<string, Layout>()

/** "Just this course" for a course (with its recommended courses laid out too), or null if unknown. */
export function focusLayout(courseId: string): Layout | null {
  const json = file.focus[courseId]
  if (!json) return null
  let layout = focusLayouts.get(courseId)
  if (!layout) {
    layout = deserializeLayout(json)
    focusLayouts.set(courseId, layout)
  }
  return layout
}
