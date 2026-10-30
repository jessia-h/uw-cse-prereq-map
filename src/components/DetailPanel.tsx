// Details for the selected course. A labelled region whose heading receives
// focus when it opens; App handles Escape and returning focus on close.
// It opens with a one-sentence answer, then the details.

import type { RefObject } from 'react'
import { shownData } from '../data/courses.ts'
import {
  AUDIENCE_LABEL,
  NO_UNLOCKS,
  RETIRED_PREREQ_NOTE,
  answerSentence,
  catalogUrl,
  coreqText,
  formatDate,
  isExternal,
  isNonCse,
  keepCourseIdsTogether,
  reqItems,
  type AnyCourse,
} from '../lib/describe.ts'
import { prereqGraph } from './flow.ts'

const byId = new Map<string, AnyCourse>([...shownData.courses, ...shownData.external].map((c) => [c.id, c]))

/** One requirement as a sentence, or a list when it has several parts. */
function ReqList({ items, lead }: { items: string[]; lead?: string }) {
  if (items.length === 1) return <p>{items[0]}</p>
  return (
    <>
      {lead && <p>{lead}</p>}
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  )
}

export function DetailPanel(props: {
  course: AnyCourse
  onClose: () => void
  onSelect: (id: string) => void
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const { course, onClose, onSelect, headingRef } = props
  const external = isExternal(course)
  const unlocks = [...(prereqGraph.unlocks.get(course.id) ?? [])].sort((a, b) => a.id.localeCompare(b.id))

  return (
    <section className="detail-panel" aria-labelledby="detail-heading">
      <div className="detail-panel__top">
        <h2 id="detail-heading" ref={headingRef} tabIndex={-1}>
          {course.id}
          {/* The space keeps "CSE 311 Foundations…" apart in the accessible name. */}
          {course.title && <span className="detail-panel__title"> {course.title}</span>}
        </h2>
        <button type="button" className="detail-panel__close" onClick={onClose}>
          Close<span className="visually-hidden"> details for {course.id}</span>
        </button>
      </div>

      {external ? (
        <p className="detail-panel__answer">
          {isNonCse(course)
            ? 'Non-CSE course. This map doesn’t list its prerequisites.'
            : 'Not in prototype yet. This map doesn’t list its prerequisites.'}
        </p>
      ) : (
        <p className="detail-panel__answer">{keepCourseIdsTogether(answerSentence(course))}</p>
      )}
      {!external && (
        <p className="detail-panel__meta">
          {course.credits} credits <span className="badge">Audience: {AUDIENCE_LABEL[course.audience]}</span>
        </p>
      )}
      {course.notes && <p className="detail-panel__notes">{course.notes}</p>}

      {!external && (
        <>
          <h3>Prerequisites</h3>
          {course.prereq ? (
            <ReqList items={reqItems(course.prereq)} lead="All of these:" />
          ) : RETIRED_PREREQ_NOTE[course.id] ? (
            <p>{RETIRED_PREREQ_NOTE[course.id].card}. See the official catalog wording below.</p>
          ) : (
            <p>None listed in the catalog.</p>
          )}

          {course.coreq && (
            <>
              <h3>Co-requisites</h3>
              <p>{coreqText(course.coreq)}</p>
            </>
          )}

          {course.recommended && (
            <>
              <h3>Recommended (not required)</h3>
              <ReqList items={reqItems(course.recommended)} />
            </>
          )}

          <details className="detail-panel__wording">
            <summary>Official catalog wording</summary>
            {course.prereqText ? (
              <blockquote>{course.prereqText}</blockquote>
            ) : (
              <p>The catalog lists no prerequisite text.</p>
            )}
          </details>
        </>
      )}

      <h3>Unlocks</h3>
      {unlocks.length === 0 ? (
        <p>{NO_UNLOCKS}</p>
      ) : (
        <ul className="detail-panel__unlocks">
          {unlocks.map((u) => (
            <li key={u.id}>
              <button type="button" className="link-button" onClick={() => onSelect(u.id)}>
                {u.id}
                {byId.get(u.id)?.title && ` — ${byId.get(u.id)!.title}`}
              </button>
              {u.relation === 'alternative' && <span className="detail-panel__hint"> (one of several options)</span>}
            </li>
          ))}
        </ul>
      )}

      <h3>Source</h3>
      <p>
        <a href={catalogUrl(course)} target="_blank" rel="noreferrer">
          {course.id} in the UW Course Catalog<span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        {!external && (
          <>
            <br />
            Last verified {formatDate(course.verified.date)}
            {course.verified.method === 'catalog' ? ' against the catalog.' : ' with an Allen School adviser.'}
          </>
        )}
      </p>

      {!external && course.conflicts && course.conflicts.length > 0 && (
        <div className="note" role="note" aria-labelledby="conflict-heading">
          <h3 id="conflict-heading">Note: prerequisites differ</h3>
          <p>The Allen School elective list shows different prerequisites; the catalog version is shown here.</p>
          <ul>
            {course.conflicts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="detail-panel__disclaimer">
        Created and maintained by Allen School Peer Advisers. Advising aid only — verify in the UW Course Catalog and
        MyPlan.
      </p>
    </section>
  )
}
