// Zod schemas for course data. The build script (scripts/build-data.ts) uses
// them to validate YAML; the app should only `import type` from this file.
//
// Objects are strict: an unknown key (e.g. a typo like `prereqs:`) is an error.
//
// Node runs this file directly via the build script (type stripping), so use
// only TypeScript that erases to plain JavaScript: no enums, namespaces, or
// constructor parameter properties.

import { z } from 'zod'

// "CSE 451", "E E 205", "MATH 126": department letters (words separated by
// single spaces), a space, then a three-digit number.
const courseId = z
  .string()
  .regex(/^[A-Z]+( [A-Z]+)* \d{3}$/, 'must look like "CSE 451" or "E E 205"')

const isoDate = z.iso.date('must be a date like 2026-10-22')

export type Req =
  | { all: Req[] } // AND
  | { any: Req[] } // OR
  | { course: string; minGrade?: number; timing?: 'before' | 'concurrent-ok' }
  | { other: string } // e.g. "Guided Self-Placement"

const allReq = z.strictObject({
  get all() {
    return z.array(reqSchema).min(1, 'must list at least one requirement')
  },
})
const anyReq = z.strictObject({
  get any() {
    return z.array(reqSchema).min(1, 'must list at least one requirement')
  },
})
const courseReq = z.strictObject({
  course: courseId,
  minGrade: z.number().min(0).max(4).optional(),
  timing: z.enum(['before', 'concurrent-ok']).optional(),
})
const otherReq = z.strictObject({ other: z.string().min(1) })

const reqBranches = { all: allReq, any: anyReq, course: courseReq, other: otherReq }

// A plain z.union reports a failed Req as one vague "invalid_union" error with
// an empty path. Instead, pick the branch by which key is present, so errors
// point inside it, e.g. "prereq.all[1].minGrade: expected number".
export const reqSchema: z.ZodType<Req> = z.unknown().transform((value, ctx) => {
  const key =
    value && typeof value === 'object'
      ? Object.keys(reqBranches).find((k) => k in value)
      : undefined
  if (!key) {
    ctx.addIssue({
      code: 'custom',
      message: 'must be an object with one of the keys: all, any, course, other',
    })
    return z.NEVER
  }
  const result = reqBranches[key as keyof typeof reqBranches].safeParse(value)
  if (!result.success) {
    for (const issue of result.error.issues) ctx.addIssue({ ...issue })
    return z.NEVER
  }
  return result.data as Req
})

const source = z.strictObject({ url: z.url(), retrieved: isoDate })

const verified = z.strictObject({
  date: isoDate,
  by: z.string().min(1),
  method: z.enum(['catalog', 'adviser-confirmed']),
})

export const courseSchema = z.strictObject({
  id: courseId,
  title: z.string().min(1),
  credits: z.string().min(1),
  summary: z.string().optional(),
  prereq: reqSchema.nullable(),
  prereqText: z.string(),
  recommended: reqSchema.optional(),
  coreq: reqSchema.optional(),
  jointWith: z.array(courseId).optional(),
  audience: z.enum(['majors', 'open', 'nonmajor', 'unknown']),
  status: z.enum(['active', 'retired']),
  sources: z.array(source).min(1, 'must list at least one source'),
  verified,
  conflicts: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
})

// Stubs in data/external.yaml: non-CSE and retired courses that CSE courses
// reference. They exist so references resolve; they have no prereq data.
export const externalCourseSchema = z.strictObject({
  id: courseId,
  title: z.string().min(1).optional(),
  status: z.enum(['active', 'retired']),
  url: z.url(),
  notes: z.string().optional(),
})

export const externalFileSchema = z.array(externalCourseSchema)

// Degree programs (data/programs/*.yaml) and course lists (data/lists.yaml).
// A program is a list of requirement groups; each group names its courses
// directly or points at a list. See docs/MAINTAINING.md for how to update them.

const slug = z.string().regex(/^[a-z0-9-]+$/, 'must be lowercase letters, digits, and dashes')

// One entry in a group: a course, or a choice between courses ("CSE 123 or CSE 143").
const groupEntry = z.union([courseId, z.strictObject({ any: z.array(courseId).min(2, 'a choice needs at least two courses') })])

export const programGroupSchema = z
  .strictObject({
    id: slug,
    // required: must take. choose: counts toward a specific group.
    // elective: Core or elective credit.
    role: z.enum(['required', 'choose', 'elective']),
    badge: z.string().min(1), // text on the card, e.g. "1 of 4 required"
    pick: z.number().int().positive().optional(),
    minGrade: z.number().min(0).max(4).optional(),
    note: z.string().min(1).optional(), // shown in the panel, e.g. "at least four of them 400-level"
    courses: z.array(groupEntry).optional(),
    list: slug.optional(), // a list id from data/lists.yaml
    exclude: z.array(courseId).optional(), // members of `list` that don't count here
  })
  .refine((g) => (g.courses === undefined) !== (g.list === undefined), {
    message: 'give exactly one of `courses` or `list`',
  })

export const programSchema = z.strictObject({
  id: slug,
  name: z.string().min(1), // "Computer Engineering"
  short: z.string().min(1), // "CE", the tag on cards in "All" mode
  extends: slug.optional(), // another program whose groups this one includes first
  sources: z.array(source).min(1, 'must list at least one source'),
  verified,
  groups: z.array(programGroupSchema),
})

export const courseListSchema = z.strictObject({
  id: slug,
  name: z.string().min(1),
  status: z.enum(['current', 'pending']).default('current'), // pending: not available yet, kept empty
  rule: z.string().min(1).optional(), // the list's definition in words, when it is defined by a rule
  includes: z.array(slug).optional(), // every course of these lists also belongs to this one
  courses: z.array(courseId),
  conflicts: z.array(z.string().min(1)).optional(),
})

// Per-course exceptions that apply in every program (from the Non-Major Options page).
export const exceptionSchema = z.strictObject({
  course: courseId,
  role: z.enum(['neutral', 'none']), // neutral: no fade; none: doesn't count
  label: z.string().min(1), // words in the panel and accessible name
  badge: z.string().min(1).optional(), // text on the card, if any
  note: z.string().min(1).optional(),
})

export const listsFileSchema = z.strictObject({
  sources: z.array(source).min(1, 'must list at least one source'),
  verified,
  lists: z.array(courseListSchema),
  exceptions: z.array(exceptionSchema).default([]),
})

export type ProgramGroup = z.infer<typeof programGroupSchema>
export type Program = z.infer<typeof programSchema>
export type CourseList = z.infer<typeof courseListSchema>
export type CourseException = z.infer<typeof exceptionSchema>

/** Shape of src/generated/programs.json. */
export interface ProgramData {
  programs: Program[]
  lists: CourseList[]
  exceptions: CourseException[]
}

export type Course = z.infer<typeof courseSchema>
export type ExternalCourse = z.infer<typeof externalCourseSchema>

/** Shape of src/generated/courses.json. */
export interface CourseData {
  courses: Course[]
  external: ExternalCourse[]
}
