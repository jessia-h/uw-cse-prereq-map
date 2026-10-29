// The course data the app and tests use: src/generated/courses.json, written
// by `npm run data` after validation. The cast is safe because the build
// script checked every file against the Zod schemas in schema.ts.

import raw from '../generated/courses.json'
import type { CourseData } from './schema.ts'

export const courseData = raw as unknown as CourseData
