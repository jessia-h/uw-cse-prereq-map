// A course's role in a degree program ("degree lens"). Pure functions over
// the course data and src/generated/programs.json.
//
// Strength order: required > choose (a specific group, e.g. "1 of 4
// required") > elective (Core or Elective) > neutral > unused. Within one
// strength, the group that comes first in the program file wins; the panel
// lists every group.
//
// Neutral means "no badge, no fade, never hidden by the 'not used' filter":
// an exception from the Non-Major Options page (CSE 374, 414), a course that
// leads to a required course (CSE 121 → 122 → 123), or a non-CSE course.

import type { CourseData, CourseException, CourseList, Program, ProgramData, ProgramGroup, Req } from '../data/schema.ts'

export type Tier = 'required' | 'choose' | 'elective' | 'neutral' | 'unused'

export interface DegreeRole {
  tier: Tier
  /** Text on the card, if any: "Required", "1 of 4 required", "Core", "Check with adviser". */
  badge?: string
  /** The role in words, for the panel and accessible names. */
  label: string
  /** Every group the course belongs to, strongest first. */
  groups: ProgramGroup[]
  /** Extra explanation for the panel (from an exception). */
  note?: string
}

const STRENGTH: Record<ProgramGroup['role'], number> = { required: 0, choose: 1, elective: 2 }

export interface DegreeModel {
  programs: Program[]
  /** A program's groups, including those of the program it extends (first). */
  groupsOf: (programId: string) => ProgramGroup[]
  /** Course ids in a group, after resolving its list and exclusions. */
  membersOf: (group: ProgramGroup) => ReadonlySet<string>
  roleOf: (courseId: string, programId: string) => DegreeRole
  /** Programs in which the course is Required. */
  requiredIn: (courseId: string) => Program[]
}

/** Every course a requirement names. */
function leaves(req: Req | null | undefined): string[] {
  if (!req) return []
  if ('course' in req) return [req.course]
  if ('other' in req) return []
  return ('all' in req ? req.all : req.any).flatMap(leaves)
}

export function buildDegreeModel(data: ProgramData, courses: CourseData): DegreeModel {
  const programs = data.programs
  const lists = new Map<string, CourseList>(data.lists.map((l) => [l.id, l]))
  const exceptions = new Map<string, CourseException>(data.exceptions.map((e) => [e.course, e]))

  const listMembers = (id: string, seen = new Set<string>()): Set<string> => {
    const list = lists.get(id)
    if (!list || seen.has(id)) return new Set()
    seen.add(id)
    return new Set([...list.courses, ...(list.includes ?? []).flatMap((ref) => [...listMembers(ref, seen)])])
  }

  const members = new Map<ProgramGroup, Set<string>>()
  const membersOf = (group: ProgramGroup) => {
    let set = members.get(group)
    if (!set) {
      const base = group.list
        ? listMembers(group.list)
        : new Set((group.courses ?? []).flatMap((e) => (typeof e === 'string' ? [e] : e.any)))
      for (const id of group.exclude ?? []) base.delete(id)
      set = base
      members.set(group, set)
    }
    return set
  }

  const groupsOf = (programId: string, seen = new Set<string>()): ProgramGroup[] => {
    const program = programs.find((p) => p.id === programId)
    if (!program || seen.has(programId)) return []
    seen.add(programId)
    return [...(program.extends ? groupsOf(program.extends, seen) : []), ...program.groups]
  }

  // Prerequisites and recommendations, so "leads to a required course" can
  // follow CSE 121 → 122 → 123 (recommendations) as well as prerequisites.
  const before = new Map<string, string[]>(
    courses.courses.map((c) => [c.id, [...leaves(c.prereq), ...leaves(c.recommended)]]),
  )
  const leadsToRequired = new Map<string, Set<string>>()
  const leadsTo = (programId: string) => {
    let set = leadsToRequired.get(programId)
    if (!set) {
      set = new Set()
      const queue = groupsOf(programId)
        .filter((g) => g.role === 'required')
        .flatMap((g) => [...membersOf(g)])
      while (queue.length) {
        for (const id of before.get(queue.pop()!) ?? []) {
          if (!set.has(id)) {
            set.add(id)
            queue.push(id)
          }
        }
      }
      leadsToRequired.set(programId, set)
    }
    return set
  }

  const roleOf = (courseId: string, programId: string): DegreeRole => {
    const groups = groupsOf(programId)
      .filter((g) => membersOf(g).has(courseId))
      // Stable sort: same strength keeps file order.
      .sort((a, b) => STRENGTH[a.role] - STRENGTH[b.role])
    const best = groups[0]
    const exception = exceptions.get(courseId)
    const minGrade = (g: ProgramGroup) => (g.minGrade !== undefined ? ` (minimum grade ${g.minGrade.toFixed(1)})` : '')

    if (best && best.role !== 'elective') {
      return { tier: best.role, badge: best.badge, label: `${best.badge}${minGrade(best)}`, groups }
    }
    // Exceptions outrank Core and Elective, but not Required or a specific group.
    if (exception) {
      return {
        tier: exception.role === 'none' ? 'unused' : 'neutral',
        badge: exception.badge,
        label: exception.label,
        groups,
        note: exception.note,
      }
    }
    if (best) return { tier: 'elective', badge: best.badge, label: best.badge, groups }
    if (leadsTo(programId).has(courseId)) return { tier: 'neutral', label: 'Leads to a required course', groups }
    if (!courseId.startsWith('CSE ')) return { tier: 'neutral', label: 'Not part of the CSE requirements', groups }
    return { tier: 'unused', label: 'Not used in the CSE requirements', groups }
  }

  const requiredIn = (courseId: string) => programs.filter((p) => roleOf(courseId, p.id).tier === 'required')

  return { programs, groupsOf, membersOf, roleOf, requiredIn }
}
