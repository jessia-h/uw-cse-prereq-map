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
  verified: z.strictObject({
    date: isoDate,
    by: z.string().min(1),
    method: z.enum(['catalog', 'adviser-confirmed']),
  }),
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

export type Course = z.infer<typeof courseSchema>
export type ExternalCourse = z.infer<typeof externalCourseSchema>

/** Shape of src/generated/courses.json. */
export interface CourseData {
  courses: Course[]
  external: ExternalCourse[]
}
