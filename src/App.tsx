import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { DetailPanel } from './components/DetailPanel.tsx'
import { FocusView } from './components/FocusView.tsx'
import { FullMapView } from './components/FullMapView.tsx'
import { Legend, LineSample } from './components/Legend.tsx'
import { ListView } from './components/ListView.tsx'
import { SearchBox } from './components/SearchBox.tsx'
import { shownData } from './data/courses.ts'
import { useMediaQuery, WIDE } from './hooks/useMediaQuery.ts'
import { restoreSavedOptions, toParam, useUrlState, type MapOptions, type View } from './hooks/useUrlState.ts'
import { EmbedToolbar } from './components/EmbedToolbar.tsx'
import { HeadingOffset } from './components/headingLevel.ts'
import { LensBar } from './components/LensBar.tsx'
import { filteredOut } from './components/lens.ts'
import { ViewSwitch } from './components/ViewSwitch.tsx'
import type { AnyCourse } from './lib/describe.ts'
import { appRoot, eventTarget } from './lib/root.ts'

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
  appRoot().querySelector<HTMLElement>(`button.course-node[data-course-id="${id}"]`)?.focus({ preventScroll: true })

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

// Courses the List view lists (no retired courses).
const listedIds = [...shownData.courses, ...shownData.external].map((c) => c.id)

/**
 * The whole app. `embed`: the compact version for a WordPress page
 * (src/wordpress.tsx): no title, banner, or page landmarks; one toolbar row
 * with an Options panel; headings one level down (under the page's h2); and
 * List view only on narrow screens.
 */
function App({ embed = false }: { embed?: boolean }) {
  // Before the URL is first read: saved degree and filters, if the URL has none.
  useState(restoreSavedOptions)
  const [{ course: param, view: urlView, options }, update] = useUrlState()
  const wide = useMediaQuery(WIDE)
  // No view in the URL: the whole map on wide screens, the list on narrow ones.
  // Embedded, narrow screens get only the list.
  const view: View = embed && !wide ? 'list' : (urlView ?? (wide ? 'map' : 'list'))
  const [showRecommended, setShowRecommended] = useState(false)
  const [bannerOpen, setBannerOpen] = useState(() => !bannerDismissed())
  const setOptions = useCallback(
    (next: Partial<MapOptions>, how?: { replace?: boolean }) => update({ options: next }, how),
    [update],
  )
  const { degree, levels, hideNonCse, hideUnused, simplify } = options
  const filters = useMemo(() => ({ levels, hideNonCse, hideUnused }), [levels, hideNonCse, hideUnused])

  // "Showing 24 of 46 courses": the map reports what it draws (it may show
  // filtered courses on the selected path); the list counts directly.
  const [mapCount, setMapCount] = useState<{ shown: number; total: number } | null>(null)
  const onMapCount = useCallback((shown: number, total: number) => setMapCount({ shown, total }), [])
  const listCount = useMemo(
    () => ({ shown: listedIds.filter((id) => !filteredOut(id, filters, degree)).length, total: listedIds.length }),
    [filters, degree],
  )

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
      // The real target: embedded, events reach the document retargeted to the shadow host.
      const target = eventTarget(e)
      const inField =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
      // The help dialog and the Filters dropdown handle their own Escape; this is a backstop.
      if (appRoot().querySelector('dialog[open]')) return
      if (e.key === 'Escape' && (target as HTMLElement | null)?.closest?.('details.filters[open], .options-panel')) return
      // Embedded, keys pressed elsewhere on the WordPress page aren't ours.
      if (embed && !(target instanceof Node && appRoot().contains(target))) return
      if (e.key === 'Escape' && panelOpen && !inField) closePanel()
      if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        appRoot().getElementById('course-search')?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panelOpen, closePanel, embed])

  // The page title names the selected course (not when embedded: that's the WordPress page's title).
  useEffect(() => {
    if (embed) return
    const base = 'UW CSE Prerequisite Map'
    document.title = focus ? `${focus.id} — ${base}` : base
  }, [focus, embed])

  const panel = panelOpen && focus && (
    <DetailPanel course={focus} onClose={closePanel} onSelect={select} headingRef={headingRef} degree={degree} />
  )

  const notFound = param && !focus && (
    <p className="notice" role="alert">
      “{param}” isn’t in this map yet.
    </p>
  )
  // Announces selection changes to screen readers.
  const liveRegion = (
    <p className="visually-hidden" aria-live="polite" aria-atomic="true">
      {announcement}
    </p>
  )
  const showsGraph = view === 'map' || (view === 'focus' && !!focus)
  const recommendedToggle = (
    <label className="map-bar__toggle">
      <input type="checkbox" checked={showRecommended} onChange={(e) => setShowRecommended(e.target.checked)} />{' '}
      Show recommended courses <LineSample dash="2 4" width={32} />
    </label>
  )
  const filterCount = view === 'list' ? listCount : mapCount

  const views = (
    <>
      {view === 'map' && (
        <FullMapView
          selectedId={focusId ?? null}
          showRecommended={showRecommended}
          onSelect={select}
          panel={panel}
          degree={degree}
          filters={filters}
          simplify={simplify}
          onCount={onMapCount}
        />
      )}

      {view === 'focus' &&
        (focus ? (
          <div className={panel ? 'focus-with-panel' : undefined}>
            <FocusView focusId={focus.id} showRecommended={showRecommended} onSelect={select} degree={degree} />
            {panel}
          </div>
        ) : (
          <p className="intro">
            {embed
              ? 'Search for a course to see only what it requires (left) and what it leads to (right).'
              : 'Pick a course with search or one of the examples above to see only what it requires (left) and what it leads to (right).'}{' '}
            Select any course in the graph to focus on it.
          </p>
        ))}

      {view === 'list' && (
        <ListView
          course={focus}
          onSelect={select}
          onShowAll={() => update({ course: null })}
          headingRef={headingRef}
          degree={degree}
          filters={filters}
        />
      )}
    </>
  )

  if (embed) {
    // Inside the WordPress page's own section: no landmarks of our own, and
    // headings one level below the page's h2.
    return (
      <HeadingOffset.Provider value={1}>
        <div className="embed">
          <EmbedToolbar
            options={options}
            onChange={setOptions}
            count={filterCount}
            onSelect={select}
            view={wide ? view : null}
            onView={(v) => update({ view: v })}
            mapOptions={
              showsGraph && (
                <>
                  {recommendedToggle}
                  <Legend degree={degree} />
                </>
              )
            }
          />
          {liveRegion}
          {notFound}
          {views}
          <p className="embed__notice">
            <strong>Prototype:</strong> {PROTOTYPE_NOTICE}
          </p>
        </div>
      </HeadingOffset.Provider>
    )
  }

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
            requestAnimationFrame(() => appRoot().getElementById('list-heading')?.focus())
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
                appRoot().querySelector<HTMLElement>('.topbar h1 a')?.focus()
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

      {liveRegion}

      <main>
        {notFound}

        <LensBar options={options} onChange={setOptions} filters={view !== 'focus'} count={filterCount} />

        {showsGraph && (
          <div className="map-bar">
            <Legend degree={degree} />
            {recommendedToggle}
          </div>
        )}

        {views}
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
