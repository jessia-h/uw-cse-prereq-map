// Data build: reads data/courses/*.yaml and data/external.yaml, validates them,
// and writes src/generated/courses.json. Exits with code 1 on any error.
//
// Node runs this file directly (type stripping), so use only TypeScript that
// erases to plain JavaScript: no enums, namespaces, or constructor parameter
// properties, and import local files with their .ts extension.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseYaml, validate, type SourceFile } from './validate.ts'

const root = join(import.meta.dirname, '..')
const coursesDir = join(root, 'data/courses')
const externalPath = join(root, 'data/external.yaml')
const outPath = join(root, 'src/generated/courses.json')

const errors: string[] = []
const warnings: string[] = []

function load(path: string): SourceFile | null {
  const result = parseYaml(relative(root, path), readFileSync(path, 'utf8'))
  if ('error' in result) {
    errors.push(result.error)
    return null
  }
  return result.source
}

const names = readdirSync(coursesDir).sort()
for (const name of names.filter((n) => n.endsWith('.yml'))) {
  errors.push(`data/courses/${name}: use the .yaml extension (.yml files are not read)`)
}
const courseFiles = names
  .filter((n) => n.endsWith('.yaml'))
  .map((n) => load(join(coursesDir, n)))
  .filter((f) => f !== null)

let externalFile: SourceFile | null = null
if (existsSync(externalPath)) externalFile = load(externalPath)
else warnings.push('data/external.yaml: not found; treating as empty')

const result = validate(courseFiles, externalFile)
errors.push(...result.errors)
warnings.push(...result.warnings)

for (const w of warnings) console.warn(`warning: ${w}`)
if (errors.length || !result.data) {
  for (const e of errors) console.error(`error: ${e}`)
  console.error(`\nbuild-data: ${errors.length} error(s); courses.json was not written.`)
  process.exit(1)
}

mkdirSync(join(root, 'src/generated'), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(result.data, null, 2)}\n`)
console.log(
  `build-data: wrote ${relative(root, outPath)} (${result.data.courses.length} courses, ` +
    `${result.data.external.length} external, ${warnings.length} warning(s))`,
)
