// The text alternative to the graphs: the same information as nested lists
// with real headings. Every course is a link that selects it. With nothing
// selected, it lists every course alphabetically; with a degree picked,
// grouped by role. Roles are text after each link, like the map's badges,
// and the filters hide courses here too.

import type { MouseEvent, ReactNode, RefObject } from 'react'
import type { Req } from '../data/schema.ts'
import { shownData } from '../data/courses.ts'
import { toParam } from '../hooks/useUrlState.ts'
import { AUDIENCE_LABEL, externalLabel, isExternal, NO_UNLOCKS, RETIRED_PREREQ_NOTE, type AnyCourse } from '../lib/describe.ts'
import { degreeModel, type Degree } from '../data/programs.ts'
import type { Tier } from '../lib/degree.ts'
import { prereqGraph } from './flow.ts'
import { InYourDegree } from './InYourDegree.tsx'
import { cardLens, filteredOut, type Filters } from './lens.ts'

/** The card's badge as text after a course link: "Core", "Required: CS, DS, CE", or nothing. */
function roleText(id: string, degree: Degree | null): string | null {
  const { role, programs } = cardLens(id, degree)
  if (role) return role.badge ?? null
  return programs.length ? `Required: ${programs.join(', ')}` : null
}

function Role({ id, degree }: { id: string; degree: Degree | null }) {
  const text = roleText(id, degree)
  return text ? <span className="list-view__role"> — {text}</span> : null
}

const GROUPS: { tier: Tier; heading: string }[] = [
  { tier: 'required', heading: 'Required' },
  { tier: 'choose', heading: 'Choose from a list' },
  { tier: 'elective', heading: 'Core and electives' },
  { tier: 'neutral', heading: 'Other courses' },
  { tier: 'unused', heading: 'Not used in this degree' },
]

// No retired courses (see lib/shown.ts).
const allCourses = [...shownData.courses, ...shownData.external].sort((a, b) =>
  a.id.localeCompare(b.id, 'en', { numeric: true }),
)
const byId = new Map<string, AnyCourse>(allCourses.map((c) => [c.id, c]))

/** A link that selects a course in the list view; modifier-clicks open it normally. */
function CourseLink({ id, onSelect }: { id: string; onSelect: (id: string) => void }) {
  const course = byId.get(id)
  const onClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return // new tab / window
    e.preventDefault()
    onSelect(id)
  }
  let text = course?.title ? `${id}, ${course.title}` : id
  // Same labels as the map's cards and accessible names.
  if (course && isExternal(course)) text += ` (${externalLabel(course)})`
  return (
    <a href={`?course=${toParam(id)}&view=list`} onClick={onClick}>
      {text}
    </a>
  )
}

interface Leads {
  all: string
  any: string
}
const DEFAULT_LEADS: Leads = { all: 'All of these:', any: 'One of these:' }

/** One requirement node as list-item content; groups nest another list. */
function ReqItem({ req, onSelect }: { req: Req; onSelect: (id: string) => void }): ReactNode {
  if ('course' in req) {
    return (
      <>
        <CourseLink id={req.course} onSelect={onSelect} />
        {req.minGrade !== undefined && ` — minimum grade ${req.minGrade.toFixed(1)}`}
        {req.timing === 'concurrent-ok' && ' — before or at the same time'}
      </>
    )
  }
  if ('other' in req) return req.other
  return <ReqTree req={req} onSelect={onSelect} />
}

/** A requirement as "All of these:" / "One of these:" followed by a list. */
function ReqTree({ req, onSelect, leads = DEFAULT_LEADS }: { req: Req; onSelect: (id: string) => void; leads?: Leads }) {
  const children = 'all' in req ? req.all : 'any' in req ? req.any : [req]
  const lead = 'all' in req ? leads.all : 'any' in req ? leads.any : null
  return (
    <>
      {lead && <p className="list-view__lead">{lead}</p>}
      <ul>
        {children.map((child, i) => (
          <li key={i}>
            <ReqItem req={child} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </>
  )
}

export function ListView(props: {
  course: AnyCourse | undefined
  onSelect: (id: string) => void
  onShowAll: () => void
  headingRef: RefObject<HTMLHeadingElement | null>
  degree: Degree | null
  filters: Filters
}) {
  const { course, onSelect, onShowAll, headingRef, degree, filters } = props

  if (!course) {
    const shown = allCourses.filter((c) => !filteredOut(c.id, filters, degree))
    const hiddenCount = allCourses.length - shown.length
    const items = (courses: AnyCourse[]) => (
      <ul className="list-view__all">
        {courses.map((c) => (
          <li key={c.id}>
            <CourseLink id={c.id} onSelect={onSelect} />
            <Role id={c.id} degree={degree} />
          </li>
        ))}
      </ul>
    )
    return (
      <section className="list-view" id="course-list" aria-labelledby="list-heading">
        <h2 id="list-heading" ref={headingRef} tabIndex={-1}>
          All courses
        </h2>
        <p>Select a course to see its prerequisites, co-requisites, recommendations, and what it unlocks.</p>
        {hiddenCount > 0 && (
          <p className="list-view__hidden">
            {hiddenCount} {hiddenCount === 1 ? 'course is' : 'courses are'} hidden by filters.
          </p>
        )}
        {degree
          ? GROUPS.map(({ tier, heading }) => {
              const group = shown.filter((c) => degreeModel.roleOf(c.id, degree).tier === tier)
              return (
                group.length > 0 && (
                  <section key={tier} aria-labelledby={`list-group-${tier}`}>
                    <h3 id={`list-group-${tier}`}>{heading}</h3>
                    {items(group)}
                  </section>
                )
              )
            })
          : items(shown)}
      </section>
    )
  }

  const unlocks = [...(prereqGraph.unlocks.get(course.id) ?? [])].sort((a, b) => a.id.localeCompare(b.id))
  const external = isExternal(course)

  return (
    <section className="list-view" id="course-list" aria-labelledby="list-heading">
      <h2 id="list-heading" ref={headingRef} tabIndex={-1}>
        {course.id}
        {course.title && `: ${course.title}`}
      </h2>
      <p>
        {external
          ? `${externalLabel(course)}. This map doesn’t list its prerequisites.`
          : `${course.credits} credits. Audience: ${AUDIENCE_LABEL[course.audience]}.`}
      </p>

      {!external && (
        <>
          <h3>Prerequisites</h3>
          {course.prereq ? (
            <ReqTree req={course.prereq} onSelect={onSelect} />
          ) : RETIRED_PREREQ_NOTE[course.id] ? (
            <p>
              {RETIRED_PREREQ_NOTE[course.id].card}. {RETIRED_PREREQ_NOTE[course.id].advice}
            </p>
          ) : (
            <p>None listed in the catalog.</p>
          )}

          {course.coreq && (
            <>
              <h3>Co-requisites</h3>
              <ReqTree
                req={course.coreq}
                onSelect={onSelect}
                leads={{ all: 'Take with all of these:', any: 'Take with one of these:' }}
              />
            </>
          )}

          {course.recommended && (
            <>
              <h3>Recommended (not required)</h3>
              <ReqTree req={course.recommended} onSelect={onSelect} />
            </>
          )}
        </>
      )}

      <InYourDegree courseId={course.id} degree={degree} />

      <h3>Unlocks</h3>
      {unlocks.length === 0 ? (
        <p>{NO_UNLOCKS}</p>
      ) : (
        <ul>
          {unlocks.map((u) => (
            <li key={u.id}>
              <CourseLink id={u.id} onSelect={onSelect} />
              {u.relation === 'alternative' && ' — one of several options'}
              <Role id={u.id} degree={degree} />
            </li>
          ))}
        </ul>
      )}

      <p className="list-view__back">
        <a
          href="?view=list"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return
            e.preventDefault()
            onShowAll()
          }}
        >
          All courses
        </a>
      </p>
    </section>
  )
}
