// Validation for course data. Pure functions over parsed files, so tests can
// call them without touching the disk; scripts/build-data.ts does the file I/O.
//
// Node runs this file directly (type stripping), so use only TypeScript that
// erases to plain JavaScript: no enums, namespaces, or constructor parameter
// properties, and import local files with their .ts extension.

import { parse as parseYamlText } from 'yaml'
import type { z } from 'zod'
import {
  courseSchema,
  externalFileSchema,
  type Course,
  type CourseData,
  type ExternalCourse,
  type Req,
} from '../src/data/schema.ts'

export interface SourceFile {
  file: string // path shown in messages, e.g. "data/courses/CSE451.yaml"
  data: unknown // parsed YAML
}

export interface ValidationResult {
  data: CourseData | null // null when there are errors
  errors: string[]
  warnings: string[]
}

/** Parse YAML text; a syntax error is returned as a message naming the file. */
export function parseYaml(
  file: string,
  text: string,
): { source: SourceFile } | { error: string } {
  try {
    return { source: { file, data: parseYamlText(text) } }
  } catch (e) {
    return { error: `${file}: YAML syntax error: ${(e as Error).message}` }
  }
}

/** ["prereq", "all", 0, "course"] → "prereq.all[0].course" */
export function formatPath(path: readonly PropertyKey[]): string {
  let out = ''
  for (const part of path) {
    out += typeof part === 'number' ? `[${part}]` : `${out ? '.' : ''}${String(part)}`
  }
  return out || '(top level)'
}

function zodErrors(file: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${file}: ${formatPath(i.path)}: ${i.message}`)
}

/** Every course leaf in a requirement, with its field path. */
function courseLeaves(
  req: Req,
  path: (string | number)[],
): { course: string; path: (string | number)[] }[] {
  if ('all' in req) return req.all.flatMap((r, i) => courseLeaves(r, [...path, 'all', i]))
  if ('any' in req) return req.any.flatMap((r, i) => courseLeaves(r, [...path, 'any', i]))
  if ('course' in req) return [{ course: req.course, path: [...path, 'course'] }]
  return []
}

const REQ_FIELDS = ['prereq', 'recommended', 'coreq'] as const

export function validate(
  courseFiles: SourceFile[],
  externalFile: SourceFile | null,
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Schema, file name, and prereqText checks for each course file.
  const courses: { file: string; course: Course }[] = []
  for (const { file, data } of courseFiles) {
    const result = courseSchema.safeParse(data)
    if (!result.success) {
      errors.push(...zodErrors(file, result.error))
      continue
    }
    const course = result.data
    const expectedName = `${course.id.replaceAll(' ', '')}.yaml`
    if (!file.endsWith(`/${expectedName}`) && file !== expectedName) {
      errors.push(`${file}: id: "${course.id}" should be in a file named ${expectedName}`)
    }
    const hasReq = REQ_FIELDS.some((f) => course[f])
    if (hasReq && course.prereqText.trim() === '') {
      errors.push(
        `${file}: prereqText: is empty, but the course has requirements; copy the catalog text verbatim`,
      )
    }
    courses.push({ file, course })
  }

  let external: ExternalCourse[] = []
  const externalName = externalFile?.file ?? 'data/external.yaml'
  if (externalFile) {
    const result = externalFileSchema.safeParse(externalFile.data ?? [])
    if (result.success) external = result.data
    else errors.push(...zodErrors(externalFile.file, result.error))
  }

  // 2. Every id is defined once, across courses/ and external.yaml.
  const definedIn = new Map<string, string>() // id → file
  const status = new Map<string, Course['status']>()
  const define = (id: string, where: string, s: Course['status']) => {
    const previous = definedIn.get(id)
    if (previous) errors.push(`${where}: id: "${id}" is already defined in ${previous}`)
    else {
      definedIn.set(id, where)
      status.set(id, s)
    }
  }
  for (const { file, course } of courses) define(course.id, file, course.status)
  external.forEach((c, i) => define(c.id, `${externalName}: [${i}]`, c.status))

  // 3. References resolve; warn on active → retired.
  for (const { file, course } of courses) {
    for (const field of REQ_FIELDS) {
      const req = course[field]
      if (!req) continue
      for (const leaf of courseLeaves(req, [field])) {
        const where = `${file}: ${formatPath(leaf.path)}`
        if (!definedIn.has(leaf.course)) {
          errors.push(
            `${where}: "${leaf.course}" does not exist; add data/courses/${leaf.course.replaceAll(' ', '')}.yaml or a stub in data/external.yaml`,
          )
        } else if (course.status === 'active' && status.get(leaf.course) === 'retired') {
          warnings.push(
            `${where}: active course ${course.id} references retired course ${leaf.course}`,
          )
        }
      }
    }
  }

  // 4. No cycles through `prereq` (co-requisites and recommendations excluded).
  errors.push(...findCycles(courses))

  return {
    data: errors.length
      ? null
      : {
          courses: courses.map((c) => c.course).sort((a, b) => a.id.localeCompare(b.id)),
          external: [...external].sort((a, b) => a.id.localeCompare(b.id)),
        },
    errors,
    warnings,
  }
}

/** Depth-first search for prerequisite cycles; each cycle is reported once. */
function findCycles(courses: { file: string; course: Course }[]): string[] {
  const byId = new Map(courses.map((c) => [c.course.id, c]))
  const state = new Map<string, 'visiting' | 'done'>()
  const stack: string[] = []
  const seen = new Set<string>()
  const errors: string[] = []

  const visit = (id: string) => {
    const entry = byId.get(id)
    if (!entry || state.get(id) === 'done') return // external stubs have no prereqs
    state.set(id, 'visiting')
    stack.push(id)
    const leaves = entry.course.prereq ? courseLeaves(entry.course.prereq, ['prereq']) : []
    for (const leaf of leaves) {
      if (state.get(leaf.course) === 'visiting') {
        const cycle = [...stack.slice(stack.indexOf(leaf.course)), leaf.course]
        const key = [...new Set(cycle)].sort().join('|')
        if (!seen.has(key)) {
          seen.add(key)
          errors.push(
            `${entry.file}: ${formatPath(leaf.path)}: prerequisite cycle ${cycle.join(' → ')}`,
          )
        }
      } else {
        visit(leaf.course)
      }
    }
    stack.pop()
    state.set(id, 'done')
  }

  for (const id of [...byId.keys()].sort()) visit(id)
  return errors
}
