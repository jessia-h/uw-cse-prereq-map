// "In your degree": a course's role in each program, the selected degree
// first. Shared by the detail panel and the List view.

import { DEGREES, degreeModel, programData, type Degree } from '../data/programs.ts'
import type { ProgramGroup } from '../data/schema.ts'
import { H } from './Heading.tsx'
import { DEGREE_NOTE } from './lens.ts'

/** Extra words about a group: its choice ("one of CSE 123 or CSE 143"), size, or courses. */
function groupDetail(group: ProgramGroup, courseId: string): string {
  const choice = group.courses?.find((e) => typeof e !== 'string' && e.any.includes(courseId))
  if (choice && typeof choice !== 'string') return ` (one of ${choice.any.join(' or ')})`
  if (group.role === 'choose' && group.courses) return ` (${group.courses.join(', ')})`
  if (group.pick && group.pick > 1) return ` (${group.pick} needed)`
  return ''
}

export function InYourDegree({ courseId, degree }: { courseId: string; degree: Degree | null }) {
  const order = degree ? [degree, ...DEGREES.filter((d) => d !== degree)] : DEGREES
  return (
    <section className="in-degree" aria-labelledby="in-degree-heading">
      <H level={3} id="in-degree-heading">
        In your degree
      </H>
      <ul>
        {order.map((d) => {
          const program = programData.programs.find((p) => p.id === d)!
          const role = degreeModel.roleOf(courseId, d)
          const [best, ...others] = role.groups
          const main = (
            <>
              {program.name}: {role.label}
              {best && best.badge === role.badge && groupDetail(best, courseId)}
            </>
          )
          const notes = [
            others.length > 0 && `Also: ${others.map((g) => `${g.badge}${groupDetail(g, courseId)}`).join('; ')}.`,
            best?.note,
            role.note,
          ].filter(Boolean)
          return (
            <li key={d}>
              {d === degree ? <strong>{main}</strong> : main}.{notes.length > 0 && ` ${notes.join(' ')}`}
            </li>
          )
        })}
      </ul>
      <p className="in-degree__note">
        {DEGREE_NOTE} Program pages:{' '}
        {programData.programs.map((p, i) => (
          <span key={p.id}>
            {i > 0 && ', '}
            <a href={p.sources[0].url} target="_blank" rel="noreferrer">
              {p.name}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </span>
        ))}
        .
      </p>
    </section>
  )
}
