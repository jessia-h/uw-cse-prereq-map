// The selected course lives in the URL (?course=CSE451), so links can be
// shared and the browser's Back button steps through earlier courses.

import { useCallback, useSyncExternalStore } from 'react'

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

const getParam = () => new URLSearchParams(window.location.search).get('course')

/** "CSE 451" ↔ "CSE451" (URL form, no spaces). */
export const toParam = (id: string) => id.replaceAll(' ', '')

/** The `course` URL parameter as written (e.g. "CSE451"), and a setter that adds a history entry. */
export function useCourseParam(): [string | null, (param: string | null) => void] {
  const param = useSyncExternalStore(subscribe, getParam)
  const setParam = useCallback((next: string | null) => {
    const url = new URL(window.location.href)
    if (next) url.searchParams.set('course', next)
    else url.searchParams.delete('course')
    if (url.href === window.location.href) return
    window.history.pushState(null, '', url)
    for (const listener of listeners) listener()
  }, [])
  return [param, setParam]
}
