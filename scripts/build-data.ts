// Data build: reads data/courses/*.yaml and data/external.yaml, then
// data/programs/*.yaml and data/lists.yaml; validates them; and writes
// src/generated/courses.json and src/generated/programs.json. Exits with
// code 1 on any error.
//
// Node runs this file directly (type stripping), so use only TypeScript that
// erases to plain JavaScript: no enums, namespaces, or constructor parameter
// properties, and import local files with their .ts extension.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseYaml, validate, type SourceFile } from './validate.ts'
import { validatePrograms } from './validate-programs.ts'

const root = join(import.meta.dirname, '..')
const coursesDir = join(root, 'data/courses')
const externalPath = join(root, 'data/external.yaml')
const outPath = join(root, 'src/generated/courses.json')
const programsDir = join(root, 'data/programs')
const listsPath = join(root, 'data/lists.yaml')
const programsOutPath = join(root, 'src/generated/programs.json')

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
else errors.push('data/external.yaml: not found; it must list the non-CSE and retired course stubs')

const result = validate(courseFiles, externalFile)
errors.push(...result.errors)
warnings.push(...result.warnings)

// Programs and lists refer to courses, so they're checked against the course data.
const known = new Set([...(result.data?.courses ?? []), ...(result.data?.external ?? [])].map((c) => c.id))
const programFiles = existsSync(programsDir)
  ? readdirSync(programsDir)
      .filter((n) => n.endsWith('.yaml'))
      .sort()
      .map((n) => load(join(programsDir, n)))
      .filter((f) => f !== null)
  : []
if (programFiles.length === 0) errors.push('data/programs/: no program files found')
const programs = validatePrograms(programFiles, existsSync(listsPath) ? load(listsPath) : null, known)
errors.push(...programs.errors)
warnings.push(...programs.warnings)

for (const w of warnings) console.warn(`warning: ${w}`)
if (errors.length || !result.data || !programs.data) {
  for (const e of errors) console.error(`error: ${e}`)
  console.error(`\nbuild-data: ${errors.length} error(s); nothing was written.`)
  process.exit(1)
}

mkdirSync(join(root, 'src/generated'), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(result.data, null, 2)}\n`)
writeFileSync(programsOutPath, `${JSON.stringify(programs.data, null, 2)}\n`)
console.log(
  `build-data: wrote ${relative(root, outPath)} (${result.data.courses.length} courses, ` +
    `${result.data.external.length} external) and ${relative(root, programsOutPath)} ` +
    `(${programs.data.programs.length} programs, ${programs.data.lists.length} lists), ${warnings.length} warning(s)`,
)
