// The text alternative to the graphs: the same information as nested lists
// with real headings. Every course is a link that selects it. With nothing
// selected, it lists every course alphabetically.

import type { MouseEvent, ReactNode, RefObject } from 'react'
import type { Req } from '../data/schema.ts'
import { courseData } from '../data/courses.ts'
import { toParam } from '../hooks/useUrlState.ts'
import { AUDIENCE_LABEL, isExternal, NO_UNLOCKS, type AnyCourse } from '../lib/describe.ts'
import { prereqGraph } from './flow.ts'

const allCourses = [...courseData.courses, ...courseData.external].sort((a, b) =>
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
  if (course?.status === 'retired') text += ' (retired)'
  else if (course && isExternal(course)) text += ' (outside this prototype)'
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
}) {
  const { course, onSelect, onShowAll, headingRef } = props

  if (!course) {
    return (
      <section className="list-view" id="course-list" aria-labelledby="list-heading">
        <h2 id="list-heading" ref={headingRef} tabIndex={-1}>
          All courses
        </h2>
        <p>Select a course to see its prerequisites, co-requisites, recommendations, and what it unlocks.</p>
        <ul className="list-view__all">
          {allCourses.map((c) => (
            <li key={c.id}>
              <CourseLink id={c.id} onSelect={onSelect} />
            </li>
          ))}
        </ul>
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
          ? `${course.status === 'retired' ? 'Retired course. ' : ''}Not part of this prototype.`
          : `${course.credits} credits. Audience: ${AUDIENCE_LABEL[course.audience]}.`}
      </p>

      {!external && (
        <>
          <h3>Prerequisites</h3>
          {course.prereq ? <ReqTree req={course.prereq} onSelect={onSelect} /> : <p>None listed in the catalog.</p>}

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

      <h3>Unlocks</h3>
      {unlocks.length === 0 ? (
        <p>{NO_UNLOCKS}</p>
      ) : (
        <ul>
          {unlocks.map((u) => (
            <li key={u.id}>
              <CourseLink id={u.id} onSelect={onSelect} />
              {u.relation === 'alternative' && ' — one of several options'}
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
