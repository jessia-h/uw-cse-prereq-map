// Validation for degree programs (data/programs/*.yaml) and course lists
// (data/lists.yaml). Pure functions, like validate.ts; build-data.ts does
// the file I/O.
//
// Courses named in a program or list but missing from the course data are
// warnings, not errors: the lists name many courses the map doesn't have yet.
//
// Node runs this file directly (type stripping), so use only TypeScript that
// erases to plain JavaScript, and import local files with their .ts extension.

import {
  listsFileSchema,
  programSchema,
  type CourseException,
  type CourseList,
  type Program,
  type ProgramData,
} from '../src/data/schema.ts'
import { formatPath, type SourceFile } from './validate.ts'

export interface ProgramValidationResult {
  data: ProgramData | null // null when there are errors
  errors: string[]
  warnings: string[]
}

export function validatePrograms(
  programFiles: SourceFile[],
  listsFile: SourceFile | null,
  knownCourses: ReadonlySet<string>,
): ProgramValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const issues = (file: string, error: { issues: { path: PropertyKey[]; message: string }[] }) =>
    error.issues.map((i) => `${file}: ${formatPath(i.path)}: ${i.message}`)
  const checkCourse = (where: string, id: string) => {
    if (!knownCourses.has(id)) warnings.push(`${where}: ${id} is not in the course data yet`)
  }

  // Lists
  let lists: CourseList[] = []
  let exceptions: CourseException[] = []
  if (!listsFile) errors.push('data/lists.yaml: not found; it must define the course lists programs refer to')
  else {
    const parsed = listsFileSchema.safeParse(listsFile.data)
    if (!parsed.success) errors.push(...issues(listsFile.file, parsed.error))
    else {
      lists = parsed.data.lists
      exceptions = parsed.data.exceptions
      const listIds = new Set<string>()
      lists.forEach((list, i) => {
        const where = `${listsFile.file}: lists[${i}]`
        if (listIds.has(list.id)) errors.push(`${where}.id: "${list.id}" is defined twice`)
        listIds.add(list.id)
        if (list.status === 'pending' && list.courses.length > 0) {
          errors.push(`${where}.courses: "${list.id}" is pending, so it must be empty until the list is available`)
        }
        const seen = new Set<string>()
        list.courses.forEach((id, j) => {
          if (seen.has(id)) errors.push(`${where}.courses[${j}]: ${id} is listed twice`)
          seen.add(id)
          checkCourse(`${where}.courses[${j}]`, id)
        })
      })
      lists.forEach((list, i) =>
        list.includes?.forEach((ref, j) => {
          if (!listIds.has(ref)) errors.push(`${listsFile.file}: lists[${i}].includes[${j}]: no list "${ref}"`)
        }),
      )
      const excepted = new Set<string>()
      exceptions.forEach((e, i) => {
        const where = `${listsFile.file}: exceptions[${i}].course`
        if (excepted.has(e.course)) errors.push(`${where}: ${e.course} has two exceptions`)
        excepted.add(e.course)
        checkCourse(where, e.course)
      })
    }
  }
  const listIds = new Set(lists.map((l) => l.id))

  // Programs
  const programs: { file: string; program: Program }[] = []
  for (const { file, data } of programFiles) {
    const parsed = programSchema.safeParse(data)
    if (!parsed.success) {
      errors.push(...issues(file, parsed.error))
      continue
    }
    const program = parsed.data
    const expected = `${program.id}.yaml`
    if (!file.endsWith(`/${expected}`)) errors.push(`${file}: id: "${program.id}" should be in a file named ${expected}`)
    programs.push({ file, program })
  }
  const programIds = new Set(programs.map((p) => p.program.id))
  for (const { file, program } of programs) {
    if (program.extends !== undefined && (program.extends === program.id || !programIds.has(program.extends))) {
      errors.push(`${file}: extends: no other program "${program.extends}"`)
    }
    const parentGroups = programs.find((p) => p.program.id === program.extends)?.program.groups ?? []
    const groupIds = new Set(parentGroups.map((g) => g.id))
    program.groups.forEach((group, i) => {
      const where = `${file}: groups[${i}]`
      if (groupIds.has(group.id)) errors.push(`${where}.id: "${group.id}" is already used${program.extends ? ' (including the program it extends)' : ''}`)
      groupIds.add(group.id)
      if (group.list !== undefined && !listIds.has(group.list)) errors.push(`${where}.list: no list "${group.list}" in data/lists.yaml`)
      const seen = new Set<string>()
      group.courses?.forEach((entry, j) => {
        const ids = typeof entry === 'string' ? [entry] : entry.any
        for (const id of ids) {
          if (seen.has(id)) errors.push(`${where}.courses[${j}]: ${id} is listed twice`)
          seen.add(id)
          checkCourse(`${where}.courses[${j}]`, id)
        }
      })
    })
  }

  return {
    data: errors.length
      ? null
      : { programs: programs.map((p) => p.program).sort((a, b) => a.id.localeCompare(b.id)), lists, exceptions },
    errors,
    warnings,
  }
}
