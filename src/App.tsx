import { useCallback, useEffect, useState } from 'react'
import './App.css'
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
          {view === 'map' && focus && (
            <button type="button" className="link-button" onClick={() => update({ course: null })}>
              Clear selection
            </button>
          )}
        </div>

        {param && !focus && (
          <p className="notice" role="alert">
            “{param}” isn’t in this map yet.
          </p>
        )}

        {focus ? (
          <h2 className="selection-heading">
            {focus.id}
            {focus.title && `: ${focus.title}`}
          </h2>
        ) : view === 'map' ? (
          <div className="map-intro">
            <p>Select any course to highlight what it requires (left) and what it leads to (right).</p>
            <Suggestions onSelect={select} compact />
          </div>
        ) : null}

        {view === 'map' && (
          <>
            <Legend showRecommended={showRecommended} highlighting />
            <FullMapView selectedId={focus?.id ?? null} showRecommended={showRecommended} onSelect={select} />
          </>
        )}

        {view === 'focus' &&
          (focus ? (
            <>
              <Legend showRecommended={showRecommended} />
              <FocusView focusId={focus.id} showRecommended={showRecommended} onSelect={select} />
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
