// Every layout the app draws, computed with elkjs: the full map (with level
// bands) and "Just this course" for each course. scripts/build-layouts.ts
// writes the result to src/generated/layouts.json for the browser, and
// precompute.test.ts recomputes it to check that file is up to date.
//
// Node runs this file from the build script (type stripping), so use only
// TypeScript that erases to plain JavaScript.

import type { CourseData } from '../data/schema.ts'
import { buildFocusGraph, buildFullGraph } from './focusGraph.ts'
import { layoutFocusGraph, serializeLayout, type LayoutFile } from './layout.ts'
import { buildGraph } from './prereq.ts'

/** `data` is what the interface shows (no retired courses: shownData). */
export async function computeLayouts(data: CourseData): Promise<LayoutFile> {
  const graph = buildGraph(data)
  const full = serializeLayout(await layoutFocusGraph(buildFullGraph(data), { levelBands: true }))
  const focus: LayoutFile['focus'] = {}
  for (const c of [...data.courses, ...data.external].sort((a, b) => a.id.localeCompare(b.id))) {
    // The focus view always lays out with recommended courses, so the toggle never moves anything.
    focus[c.id] = serializeLayout(await layoutFocusGraph(buildFocusGraph(c.id, data, graph, { showRecommended: true })))
  }
  return { full, focus }
}
