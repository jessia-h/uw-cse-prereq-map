import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { DetailPanel } from './components/DetailPanel.tsx'
import { FocusView } from './components/FocusView.tsx'
import { FullMapView } from './components/FullMapView.tsx'
import { Legend } from './components/Legend.tsx'
import { SearchBox } from './components/SearchBox.tsx'
import { courseData } from './data/courses.ts'
import { toParam, useUrlState, type View } from './hooks/useUrlState.ts'
import type { AnyCourse } from './lib/describe.ts'

const SUGGESTED = ['CSE 332', 'CSE 451', 'CSE 469']

// URL form ("CSE451", "EE271") → course.
const byParam = new Map<string, AnyCourse>(
  [...courseData.courses, ...courseData.external].map((c) => [toParam(c.id), c]),
)
const lookup = (id: string) => byParam.get(toParam(id))

function Suggestions({ onSelect, compact }: { onSelect: (id: string) => void; compact?: boolean }) {
  return (
    <section className={compact ? 'suggestions suggestions--compact' : 'suggestions'} aria-labelledby="suggestions-heading">
      <h2 id="suggestions-heading">{compact ? 'Try:' : 'Try an example'}</h2>
      <ul>
        {SUGGESTED.map((id) => (
          <li key={id}>
            <button type="button" onClick={() => onSelect(id)}>
              <strong>{id}</strong> {!compact && lookup(id)?.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const options: { value: View; label: string }[] = [
    { value: 'map', label: 'Full map' },
    { value: 'focus', label: 'Focus' },
  ]
  return (
    <div className="view-switch" role="group" aria-label="View">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={view === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function App() {
  const [{ course: param, view }, update] = useUrlState()
  const [showRecommended, setShowRecommended] = useState(false)
  const select = useCallback((id: string) => update({ course: toParam(id) }), [update])

  const focus = param ? lookup(param) : undefined
  const focusId = focus?.id

  // When the user selects a course, move focus to the panel heading. Not on
  // first page load: the user hasn't acted yet, and it would scroll the page.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const lastFocusId = useRef(focusId)
  useEffect(() => {
    if (focusId && focusId !== lastFocusId.current) headingRef.current?.focus()
    lastFocusId.current = focusId
  }, [focusId])

  /** Close the panel: clear the selection and return focus to the course's node. */
  const closePanel = useCallback(() => {
    update({ course: null })
    // Wait a frame for React to re-render. In the Focus view the node is gone
    // (back to the start screen), so focus goes to search instead.
    requestAnimationFrame(() => {
      const node = focusId && document.querySelector<HTMLElement>(`button.course-node[data-course-id="${focusId}"]`)
      if (node) node.focus({ preventScroll: true }) // don't let the browser scroll the map
      else document.getElementById('course-search')?.focus()
    })
  }, [update, focusId])

  // Escape closes the panel, except in the search box, where it clears the text.
  useEffect(() => {
    if (!focusId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [focusId, closePanel])

  const panel = focus && (
    <DetailPanel course={focus} onClose={closePanel} onSelect={select} headingRef={headingRef} />
  )

  useEffect(() => {
    const base = 'UW CSE Prerequisite Map'
    document.title = focus ? `${focus.id} — ${base}` : base
  }, [focus])

  return (
    <>
      <header className="site-header">
        <h1>
          <a href="./" onClick={(e) => (e.preventDefault(), update({ course: null, view: 'map' }))}>
            UW Allen School CSE Prerequisite Map
          </a>
        </h1>
        <SearchBox onSelect={select} />
      </header>

      <main>
        <div className="toolbar">
          <ViewSwitch view={view} onChange={(v) => update({ view: v })} />
          <label>
            <input type="checkbox" checked={showRecommended} onChange={(e) => setShowRecommended(e.target.checked)} />{' '}
            Show recommended courses
          </label>
        </div>

        {param && !focus && (
          <p className="notice" role="alert">
            “{param}” isn’t in this map yet.
          </p>
        )}

        {!focus && view === 'map' && (
          <div className="map-intro">
            <p>Select any course to highlight what it requires (left) and what it leads to (right).</p>
            <Suggestions onSelect={select} compact />
          </div>
        )}

        {view === 'map' && (
          <>
            <Legend showRecommended={showRecommended} highlighting />
            <FullMapView
              selectedId={focus?.id ?? null}
              showRecommended={showRecommended}
              onSelect={select}
              panel={panel}
            />
          </>
        )}

        {view === 'focus' &&
          (focus ? (
            <>
              <Legend showRecommended={showRecommended} />
              <div className="focus-with-panel">
                <FocusView focusId={focus.id} showRecommended={showRecommended} onSelect={select} />
                {panel}
              </div>
            </>
          ) : (
            <>
              <p className="intro">
                Pick a course to see only what it requires (left) and what it leads to (right). Select any course in
                the graph to focus on it.
              </p>
              <Suggestions onSelect={select} />
            </>
          ))}
      </main>

      <footer className="site-footer">
        Created and maintained by Allen School Peer Advisers. Advising aid only — verify in the UW Course Catalog and
        MyPlan.
      </footer>
    </>
  )
}

export default App
