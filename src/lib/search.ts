// Course search: by full number ("CSE 451", "cse451"), number alone ("451"),
// or words in the title ("operating").

import type { AnyCourse } from './describe.ts'

const compact = (s: string) => s.toLowerCase().replace(/\s+/g, '')

export function searchCourses(query: string, courses: AnyCourse[], limit = 8): AnyCourse[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const qCompact = compact(q)

  // Lower rank = better match.
  const rank = (c: AnyCourse): number | null => {
    const id = compact(c.id)
    if (id === qCompact) return 0
    if (id.startsWith(qCompact)) return 1
    if (/^\d+$/.test(qCompact) && c.id.split(' ').at(-1)!.startsWith(qCompact)) return 2
    if (q.length >= 2 && c.title?.toLowerCase().includes(q)) return 3
    return null
  }

  return courses
    .map((c) => ({ c, r: rank(c) }))
    .filter((x): x is { c: AnyCourse; r: number } => x.r !== null)
    .sort((a, b) => a.r - b.r || a.c.id.localeCompare(b.c.id))
    .slice(0, limit)
    .map((x) => x.c)
}
