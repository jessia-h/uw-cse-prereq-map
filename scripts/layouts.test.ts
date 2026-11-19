// The browser draws layouts precomputed by `npm run data`
// (src/generated/layouts.json). These tests read the YAML source files
// directly, so they fail if a course file or the layout code changed without
// re-running `npm run data`.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CourseData } from '../src/data/schema.ts'
import { buildFocusGraph, buildFullGraph } from '../src/lib/focusGraph.ts'
import type { LayoutFile } from '../src/lib/geometry.ts'
import { computeLayouts } from '../src/lib/precompute.ts'
import { buildGraph } from '../src/lib/prereq.ts'
import { withoutRetired } from '../src/lib/shown.ts'
import { parseYaml, validate, type SourceFile } from './validate.ts'

const root = join(import.meta.dirname, '..')
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(root, path), 'utf8'))
// What `npm run data` generated, as the app reads it.
const courseData = readJson('src/generated/courses.json') as CourseData
const shownData = withoutRetired(courseData)
const layouts = readJson('src/generated/layouts.json') as LayoutFile

/** The course data as the YAML files say now, validated like the data build. */
function dataFromYaml() {
  const load = (path: string): SourceFile => {
    const result = parseYaml(path, readFileSync(join(root, path), 'utf8'))
    if ('error' in result) throw new Error(result.error)
    return result.source
  }
  const files = readdirSync(join(root, 'data/courses'))
    .filter((n) => n.endsWith('.yaml'))
    .sort()
    .map((n) => load(`data/courses/${n}`))
  const result = validate(files, load('data/external.yaml'))
  expect(result.errors).toEqual([])
  return result.data!
}

describe('precomputed layouts are up to date (run `npm run data` if these fail)', () => {
  it('the generated course data matches the YAML files', () => {
    expect(courseData).toEqual(dataFromYaml())
  })

  it('every layout matches a fresh elk layout of the current data', async () => {
    expect(await computeLayouts(withoutRetired(dataFromYaml()))).toEqual(layouts)
  }, 60_000)

  it('there is a layout for every course, and every node and line in each graph has one', () => {
    const graph = buildGraph(shownData)
    const check = (name: string, model: ReturnType<typeof buildFullGraph>, json: LayoutFile['full'] | undefined) => {
      expect(json, name).toBeDefined()
      const positioned = new Set(json!.positions.map(([id]) => id))
      const routed = new Set(json!.routes.map(([id]) => id))
      for (const n of model.nodes) expect(positioned.has(n.id), `${name}: ${n.id}`).toBe(true)
      for (const e of model.edges) expect(routed.has(e.id), `${name}: ${e.id}`).toBe(true)
    }
    check('full map', buildFullGraph(shownData), layouts.full)
    const ids = [...shownData.courses, ...shownData.external].map((c) => c.id)
    expect(Object.keys(layouts.focus).sort()).toEqual([...ids].sort())
    for (const id of ids) check(id, buildFocusGraph(id, shownData, graph, { showRecommended: true }), layouts.focus[id])
  })
})
