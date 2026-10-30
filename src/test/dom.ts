// Browser APIs that jsdom lacks but React Flow and the app use. Import this
// first in any test that renders the app (with `// @vitest-environment jsdom`).

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(cleanup)

// React Flow measures its container and nodes.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

// React Flow reads the zoom from the viewport's CSS transform.
class DOMMatrixReadOnlyStub {
  m22: number
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([\d.]+)\)/)?.[1]
    this.m22 = scale !== undefined ? Number(scale) : 1
  }
}
globalThis.DOMMatrixReadOnly = DOMMatrixReadOnlyStub as unknown as typeof DOMMatrixReadOnly

// Give elements a size, so React Flow doesn't warn about a zero-size container.
Object.defineProperties(HTMLElement.prototype, {
  offsetWidth: { get: () => 1200, configurable: true },
  offsetHeight: { get: () => 800, configurable: true },
})

// Screen width for the app's media queries: wide (map default) unless set narrow.
let wide = true
export function setWide(value: boolean) {
  wide = value
}
window.matchMedia = (query: string) =>
  ({
    media: query,
    matches: query.includes('min-width') ? wide : false,
    addEventListener() {},
    removeEventListener() {},
  }) as unknown as MediaQueryList

// jsdom has <dialog> but not its modal methods.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}
