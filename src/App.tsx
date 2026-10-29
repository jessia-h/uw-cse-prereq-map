import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { FocusView } from './components/FocusView.tsx'
import { Legend } from './components/Legend.tsx'
import { SearchBox } from './components/SearchBox.tsx'
import { courseData } from './data/courses.ts'
import { toParam, useCourseParam } from './hooks/useCourseParam.ts'
import type { AnyCourse } from './lib/describe.ts'

const SUGGESTED = ['CSE 332', 'CSE 451', 'CSE 469']

// URL form ("CSE451", "EE271") → course.
const byParam = new Map<string, AnyCourse>(
  [...courseData.courses, ...courseData.external].map((c) => [toParam(c.id), c]),
)
const lookup = (id: string) => byParam.get(toParam(id))

function Suggestions() {
  const [, setParam] = useCourseParam()
  return (
    <section className="suggestions" aria-labelledby="suggestions-heading">
      <h2 id="suggestions-heading">Try an example</h2>
      <ul>
        {SUGGESTED.map((id) => (
          <li key={id}>
            <button type="button" onClick={() => setParam(toParam(id))}>
              <strong>{id}</strong> {lookup(id)?.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function App() {
  const [param, setParam] = useCourseParam()
  const [showRecommended, setShowRecommended] = useState(false)
  const select = useCallback((id: string) => setParam(toParam(id)), [setParam])

  const focus = param ? lookup(param) : undefined

  useEffect(() => {
    const base = 'UW CSE Prerequisite Map'
    document.title = focus ? `${focus.id} — ${base}` : base
  }, [focus])

  return (
    <>
      <header className="site-header">
        <h1>
          <a href="./" onClick={(e) => (e.preventDefault(), setParam(null))}>
            UW Allen School CSE Prerequisite Map
          </a>
        </h1>
        <SearchBox onSelect={select} />
      </header>

      <main>
        {!param && (
          <>
            <p className="intro">
              Pick a course to see what it requires (left) and what it leads to (right). Select any course in the
              graph to focus on it.
            </p>
            <Suggestions />
          </>
        )}

        {param && !focus && (
          <>
            <p className="notice" role="alert">
              “{param}” isn’t in this map yet.
            </p>
            <Suggestions />
          </>
        )}

        {focus && (
          <section aria-labelledby="focus-heading">
            <h2 id="focus-heading">
              {focus.id}
              {focus.title && `: ${focus.title}`}
            </h2>
            <div className="toolbar">
              <label>
                <input
                  type="checkbox"
                  checked={showRecommended}
                  onChange={(e) => setShowRecommended(e.target.checked)}
                />{' '}
                Show recommended courses
              </label>
            </div>
            <Legend showRecommended={showRecommended} />
            <FocusView focusId={focus.id} showRecommended={showRecommended} onSelect={select} />
          </section>
        )}
      </main>

      <footer className="site-footer">
        Created and maintained by Allen School Peer Advisers. Advising aid only — verify in the UW Course Catalog and
        MyPlan.
      </footer>
    </>
  )
}

export default App
