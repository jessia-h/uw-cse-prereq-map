// Where the app's elements live: the document, or a shadow root when the map
// is embedded in a WordPress page (src/wordpress.tsx). Code that looks up
// elements by id or selector, or asks what has focus, goes through here,
// because document.querySelector can't see inside a shadow root.

let root: Document | ShadowRoot = document

export function setAppRoot(next: Document | ShadowRoot) {
  root = next
}

export const appRoot = () => root

/** The focused element, inside the shadow root if there is one. */
export const focusedElement = () => root.activeElement

/** The element an event really started on (events leaving a shadow root are retargeted to its host). */
export const eventTarget = (e: Event) => (e.composedPath()[0] ?? e.target) as EventTarget | null
