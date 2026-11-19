// Layout build: runs after build-data.ts (npm run data). Lays out the full map
// and every course's "Just this course" graph with elkjs, here at build time,
// and writes src/generated/layouts.json, so the browser never loads elkjs.
//
// Node runs this file directly (type stripping), so use only TypeScript that
// erases to plain JavaScript, and import local files with their .ts extension.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { CourseData } from '../src/data/schema.ts'
import { computeLayouts } from '../src/lib/precompute.ts'
import { withoutRetired } from '../src/lib/shown.ts'

const root = join(import.meta.dirname, '..')
const coursesPath = join(root, 'src/generated/courses.json')
const outPath = join(root, 'src/generated/layouts.json')

const data = withoutRetired(JSON.parse(readFileSync(coursesPath, 'utf8')) as CourseData)
const started = Date.now()
const layouts = await computeLayouts(data)
const json = JSON.stringify(layouts)
writeFileSync(outPath, `${json}\n`)
console.log(
  `build-layouts: wrote ${relative(root, outPath)} (${1 + Object.keys(layouts.focus).length} layouts, ` +
    `${Math.round(json.length / 1024)} KB, ${Date.now() - started} ms)`,
)
