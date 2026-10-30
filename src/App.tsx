import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { DetailPanel } from './components/DetailPanel.tsx'
import { FocusView } from './components/FocusView.tsx'
import { FullMapView } from './components/FullMapView.tsx'
import { Legend, LineSample } from './components/Legend.tsx'
import { ListView } from './components/ListView.tsx'
import { SearchBox } from './components/SearchBox.tsx'
import { shownData } from './data/courses.ts'
import { useMediaQuery, WIDE } from './hooks/useMediaQuery.ts'
import { toParam, useUrlState, type View } from './hooks/useUrlState.ts'
import type { AnyCourse } from './lib/describe.ts'

const SUGGESTED = ['CSE 332', 'CSE 451', 'CSE 469']

// URL form ("CSE451", "EE271") → course. Retired courses can't be selected.
const byParam = new Map<string, AnyCourse>(
  [...shownData.courses, ...shownData.external].map((c) => [toParam(c.id), c]),
)

const PROTOTYPE_NOTICE = `${shownData.courses.length} of about 100 CSE courses. Unlocks lists and the map are incomplete.`

// The prototype strip can be dismissed; remembered per browser. Storage can
// be blocked (private windows, settings), so the strip just shows again.
const BANNER_KEY = 'prototype-banner-dismissed'
function bannerDismissed() {
  try {
    return localStorage.getItem(BANNER_KEY) === '1'
  } catch {
    return false
  }
}
function rememberBannerDismissed() {
  try {
    localStorage.setItem(BANNER_KEY, '1')
  } catch {
    // Not remembered; it's hidden until the page reloads.
  }
}
const lookup = (id: string) => byParam.get(toParam(id))

const focusCourseNode = (id: string) =>
  document.querySelector<HTMLElement>(`button.course-node[data-course-id="${id}"]`)?.focus({ preventScroll: true })

/** Example courses, as chips under the search box. */
function Suggestions({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="chips">
      <span id="chips-label">Try:</span>
      <ul aria-labelledby="chips-label">
        {SUGGESTED.map((id) => (
          <li key={id}>
            <button type="button" onClick={() => onSelect(id)}>
              {id}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const options: { value: View; label: string }[] = [
    { value: 'map', label: 'Whole map' },
    { value: 'focus', label: 'Just this course' },
    { value: 'list', label: 'List' },
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
  const [{ course: param, view: urlView }, update] = useUrlState()
  const wide = useMediaQuery(WIDE)
  // No view in the URL: the whole map on wide screens, the list on narrow ones.
  const view: View = urlView ?? (wide ? 'map' : 'list')
  const [showRecommended, setShowRecommended] = useState(false)
  const [bannerOpen, setBannerOpen] = useState(() => !bannerDismissed())

  const focus = param ? lookup(param) : undefined
  const focusId = focus?.id

  // In "Just this course", Close hides the panel but keeps the course. This
  // holds the course whose panel is hidden; selecting any course shows it again.
  const [panelHiddenFor, setPanelHiddenFor] = useState<string | null>(null)
  const panelOpen = !!focus && view !== 'list' && !(view === 'focus' && panelHiddenFor === focusId)

  const select = useCallback(
    (id: string) => {
      setPanelHiddenFor(null)
      update({ course: toParam(id) })
    },
    [update],
  )

  // After the user selects a course (or reopens its panel), move focus to the
  // panel's heading, or the list's heading in List view. Not on first page
  // load: the user hasn't acted yet, and it would scroll the page.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusKey = view === 'list' ? `list:${focusId ?? ''}` : panelOpen ? `panel:${focusId}` : null
  const lastFocusKey = useRef(focusKey)
  useEffect(() => {
    if (focusKey && focusKey !== lastFocusKey.current) headingRef.current?.focus()
    lastFocusKey.current = focusKey
  }, [focusKey])

  // Polite announcement of selection changes (skipped on first load).
  const [announcement, setAnnouncement] = useState('')
  const lastAnnounced = useRef(focusId)
  useEffect(() => {
    if (focusId === lastAnnounced.current) return
    lastAnnounced.current = focusId
    setAnnouncement(focus ? `Selected ${focus.id}${focus.title ? `, ${focus.title}` : ''}.` : 'Selection cleared.')
  }, [focusId, focus])

  /**
   * Close the panel and return focus to the course's node. On the whole map
   * this clears the selection; in "Just this course" it only hides the panel.
   */
  const closePanel = useCallback(() => {
    if (!focusId) return
    if (view === 'focus') setPanelHiddenFor(focusId)
    else update({ course: null })
    // Wait a frame for React to re-render before moving focus.
    requestAnimationFrame(() => focusCourseNode(focusId))
  }, [update, focusId, view])

  // Keyboard shortcuts: Escape closes the panel (but clears text in the
  // search box instead); "/" jumps to search from anywhere but a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      // The help dialog handles its own Escape; this is a backstop.
      if (document.querySelector('dialog[open]')) return
      if (e.key === 'Escape' && panelOpen && !inField) closePanel()
      if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        document.getElementById('course-search')?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panelOpen, closePanel])

  useEffect(() => {
    const base = 'UW CSE Prerequisite Map'
    document.title = focus ? `${focus.id} — ${base}` : base
  }, [focus])

  const panel = panelOpen && focus && (
    <DetailPanel course={focus} onClose={closePanel} onSelect={select} headingRef={headingRef} />
  )

  return (
    <>
      {/* Skip link and banner sit inside the header landmark, so nothing is outside a landmark. */}
      <header className="site-header">
        <a
          className="skip-link"
          href="?view=list"
          onClick={(e) => {
            e.preventDefault()
            update({ view: 'list' })
            requestAnimationFrame(() => document.getElementById('list-heading')?.focus())
          }}
        >
          Skip to course list
        </a>

        {bannerOpen && (
          <div className="prototype-strip">
            <p>
              <strong>Prototype:</strong> {PROTOTYPE_NOTICE}
            </p>
            <button
              type="button"
              aria-label="Dismiss prototype notice"
              onClick={() => {
                setBannerOpen(false)
                rememberBannerDismissed()
                // The button is gone; continue from the title.
                document.querySelector<HTMLElement>('.topbar h1 a')?.focus()
              }}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}

        <div className="topbar">
          <h1>
            <a href="./" onClick={(e) => (e.preventDefault(), update({ course: null, view: null }))}>
              UW Allen School CSE Prerequisite Map
            </a>
          </h1>
          <div className="topbar__search">
            <SearchBox onSelect={select} />
            <Suggestions onSelect={select} />
          </div>
          <ViewSwitch view={view} onChange={(v) => update({ view: v })} />
        </div>
      </header>

      {/* Announces selection changes to screen readers. */}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <main>
        {param && !focus && (
          <p className="notice" role="alert">
            “{param}” isn’t in this map yet.
          </p>
        )}

        {(view === 'map' || (view === 'focus' && focus)) && (
          <div className="map-bar">
            <Legend />
            <label className="map-bar__toggle">
              <input type="checkbox" checked={showRecommended} onChange={(e) => setShowRecommended(e.target.checked)} />{' '}
              Show recommended courses <LineSample dash="2 4" width={32} />
            </label>
          </div>
        )}

        {view === 'map' && (
          <FullMapView selectedId={focusId ?? null} showRecommended={showRecommended} onSelect={select} panel={panel} />
        )}

        {view === 'focus' &&
          (focus ? (
            <div className={panel ? 'focus-with-panel' : undefined}>
              <FocusView focusId={focus.id} showRecommended={showRecommended} onSelect={select} />
              {panel}
            </div>
          ) : (
            <p className="intro">
              Pick a course with search or one of the examples above to see only what it requires (left) and what it
              leads to (right). Select any course in the graph to focus on it.
            </p>
          ))}

        {view === 'list' && (
          <ListView course={focus} onSelect={select} onShowAll={() => update({ course: null })} headingRef={headingRef} />
        )}
      </main>

      <footer className="site-footer">
        <p>
          <strong>Prototype:</strong> {PROTOTYPE_NOTICE}
        </p>
        <p>
          Created and maintained by Allen School Peer Advisers. Advising aid only — verify in the UW Course Catalog and
          MyPlan.
        </p>
      </footer>
    </>
  )
}

export default App
