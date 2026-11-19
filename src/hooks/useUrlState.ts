// The selected course and view live in the URL (?course=CSE451&view=focus),
// so links can be shared and the browser's Back button steps through earlier
// selections. All views read the same ?course=, so switching keeps it.
//
// With no `view` parameter, the view is the default for the screen width:
// the whole map on wide screens, the list under 640px. An explicit choice is
// always written to the URL, so it sticks.
//
// The degree lens and filters live in the URL too (&degree=ce&levels=300,400
// &hide=noncse,unused&simple=0; defaults are left out), and are saved in
// localStorage. A URL with any of them wins, so a shared link shows what the
// sender saw; a URL with none gets the saved choices (restoreSavedOptions).

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { DEGREES, type Degree } from '../data/programs.ts'

export type View = 'map' | 'focus' | 'list'

const VIEWS: View[] = ['map', 'focus', 'list']

/** Course levels the level filter offers (CSE courses only). */
export type Level = 100 | 300 | 400
export const LEVELS: Level[] = [100, 300, 400]

export interface MapOptions {
  /** The degree lens; null = "All". */
  degree: Degree | null
  /** CSE course levels to show; all by default. */
  levels: Level[]
  hideNonCse: boolean
  /** Hide courses not used in the selected degree (only with a degree). */
  hideUnused: boolean
  /** Hide the lines from CSE 123/143 that feed only "1 of 2" groups of those two. On by default. */
  simplify: boolean
}

export const DEFAULT_OPTIONS: MapOptions = { degree: null, levels: LEVELS, hideNonCse: false, hideUnused: false, simplify: true }

export interface UrlState {
  /** The `course` parameter as written, e.g. "CSE451"; null if absent. */
  course: string | null
  /** The `view` parameter, or null for the screen's default view. */
  view: View | null
  options: MapOptions
}

const OPTION_PARAMS = ['degree', 'levels', 'hide', 'simple']
const STORAGE_KEY = 'map-options'

// pushState doesn't fire an event, so tell subscribers ourselves.
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('popstate', onChange) // Back / Forward
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('popstate', onChange)
  }
}

// The snapshot is the raw query string: a stable string, so React can tell
// when it changed.
const getSearch = () => window.location.search

/** "CSE 451" ↔ "CSE451" (URL form, no spaces). */
export const toParam = (id: string) => id.replaceAll(' ', '')

function readOptions(params: URLSearchParams): MapOptions {
  const degree = params.get('degree') as Degree | null
  const levels = params
    .get('levels')
    ?.split(',')
    .map(Number)
    .filter((l): l is Level => LEVELS.includes(l as Level))
  const hide = new Set(params.get('hide')?.split(',') ?? [])
  return {
    degree: degree && DEGREES.includes(degree) ? degree : null,
    levels: levels ?? LEVELS,
    hideNonCse: hide.has('noncse'),
    hideUnused: hide.has('unused'),
    simplify: params.get('simple') !== '0',
  }
}

function writeOptions(url: URL, options: MapOptions) {
  const set = (name: string, value: string | null) =>
    value === null ? url.searchParams.delete(name) : url.searchParams.set(name, value)
  set('degree', options.degree)
  const levels = LEVELS.filter((l) => options.levels.includes(l))
  set('levels', levels.length === LEVELS.length ? null : levels.join(','))
  const hide = [options.hideNonCse && 'noncse', options.hideUnused && 'unused'].filter(Boolean)
  set('hide', hide.length ? hide.join(',') : null)
  set('simple', options.simplify ? null : '0')
}

/** The option parameters of a URL, e.g. "degree=ce&hide=noncse". */
const optionQuery = (url: URL) =>
  OPTION_PARAMS.flatMap((p) => (url.searchParams.has(p) ? [`${p}=${url.searchParams.get(p)}`] : [])).join('&')

function save(url: URL) {
  try {
    localStorage.setItem(STORAGE_KEY, optionQuery(url))
  } catch {
    // Storage blocked: the URL still holds the choices.
  }
}

/**
 * On page load: if the URL has no degree or filter parameters, apply the
 * saved ones (and write them into the URL, so it always matches the screen).
 */
export function restoreSavedOptions() {
  const url = new URL(window.location.href)
  if (OPTION_PARAMS.some((p) => url.searchParams.has(p))) return
  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    return
  }
  if (!saved) return
  writeOptions(url, readOptions(new URLSearchParams(saved)))
  if (url.href !== window.location.href) window.history.replaceState(null, '', url)
}

export type UrlUpdate = Partial<Pick<UrlState, 'course' | 'view'>> & { options?: Partial<MapOptions> }

export function useUrlState(): [UrlState, (next: UrlUpdate, how?: { replace?: boolean }) => void] {
  const search = useSyncExternalStore(subscribe, getSearch)
  const state = useMemo((): UrlState => {
    const params = new URLSearchParams(search)
    const view = params.get('view') as View | null
    return {
      course: params.get('course'),
      view: view && VIEWS.includes(view) ? view : null,
      options: readOptions(params),
    }
  }, [search])

  /** Change some of the state: a new history entry, or `replace` for filter tweaks. */
  const update = useCallback((next: UrlUpdate, how: { replace?: boolean } = {}) => {
    const url = new URL(window.location.href)
    if ('course' in next) {
      if (next.course) url.searchParams.set('course', next.course)
      else url.searchParams.delete('course')
    }
    if ('view' in next) {
      if (next.view) url.searchParams.set('view', next.view)
      else url.searchParams.delete('view')
    }
    if (next.options) {
      writeOptions(url, { ...readOptions(url.searchParams), ...next.options })
      save(url)
    }
    if (url.href === window.location.href) return
    if (how.replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    for (const listener of listeners) listener()
  }, [])

  return [state, update]
}
