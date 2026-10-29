// The selected course and view live in the URL (?course=CSE451&view=focus),
// so links can be shared and the browser's Back button steps through earlier
// selections. Both views read the same ?course=, so switching keeps it.

import { useCallback, useMemo, useSyncExternalStore } from 'react'

export type View = 'map' | 'focus'

export interface UrlState {
  /** The `course` parameter as written, e.g. "CSE451"; null if absent. */
  course: string | null
  /** "map" (the default, no parameter) or "focus" (&view=focus). */
  view: View
}

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

export function useUrlState(): [UrlState, (next: Partial<UrlState>) => void] {
  const search = useSyncExternalStore(subscribe, getSearch)
  const state = useMemo((): UrlState => {
    const params = new URLSearchParams(search)
    return { course: params.get('course'), view: params.get('view') === 'focus' ? 'focus' : 'map' }
  }, [search])

  /** Change some of the state and add a history entry. */
  const update = useCallback((next: Partial<UrlState>) => {
    const url = new URL(window.location.href)
    if ('course' in next) {
      if (next.course) url.searchParams.set('course', next.course)
      else url.searchParams.delete('course')
    }
    if ('view' in next) {
      if (next.view === 'focus') url.searchParams.set('view', 'focus')
      else url.searchParams.delete('view')
    }
    if (url.href === window.location.href) return
    window.history.pushState(null, '', url)
    for (const listener of listeners) listener()
  }, [])

  return [state, update]
}
