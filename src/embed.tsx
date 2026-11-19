// Mounts the map inside a shadow root on a WordPress page (see
// src/wordpress.tsx and scripts/build-wordpress.ts). The shadow root keeps the
// theme's CSS off the map and the map's CSS off the page; the app finds its
// own elements through lib/root.ts.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setAppRoot } from './lib/root.ts'
import { cssVariables } from './theme.ts'

/** The mount point and the "View the course list as text" link in the WordPress block. */
export const MOUNT_ID = 'cse-prereq-map'
export const TEXT_LINK_ID = 'cse-prereq-map-text'

// The host element belongs to the page: reset everything it would pass down
// (theme fonts, colors, line height, alignment), then set our own base. Sizes
// are px (rem would follow the theme's root font size).
const HOST_CSS = ':host{all:initial;display:block}.cse-map-root{font-size:16px;text-align:left}'

/** The page URL with ?view=list, keeping the page's own parameters. */
function listUrl() {
  const url = new URL(window.location.href)
  url.searchParams.set('view', 'list')
  return url
}

export function mountEmbeddedMap(host: HTMLElement, css: string): { shadow: ShadowRoot; unmount: () => void } {
  if (host.shadowRoot) return { shadow: host.shadowRoot, unmount: () => {} } // already mounted
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = HOST_CSS + css
  const root = document.createElement('div')
  root.className = 'cse-map-root'
  // Theme tokens as CSS variables, on our root instead of <html>.
  for (const [name, value] of Object.entries(cssVariables())) root.style.setProperty(name, value)
  shadow.append(style, root)
  setAppRoot(shadow)
  const reactRoot = createRoot(root)
  reactRoot.render(
    <StrictMode>
      <App embed />
    </StrictMode>,
  )

  // "View the course list as text" (outside the map, after it): switch to the
  // List view in place instead of reloading the page.
  const link = document.getElementById(TEXT_LINK_ID)
  const showList = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return // new tab / window
    e.preventDefault()
    window.history.pushState(null, '', listUrl())
    window.dispatchEvent(new PopStateEvent('popstate')) // the app listens for URL changes
    host.scrollIntoView?.({ block: 'start' })
    // After React shows the list, focus its heading.
    requestAnimationFrame(() => requestAnimationFrame(() => shadow.getElementById('list-heading')?.focus()))
  }
  if (link instanceof HTMLAnchorElement) {
    link.href = listUrl().href
    link.addEventListener('click', showList)
  }
  return {
    shadow,
    unmount: () => {
      reactRoot.unmount()
      link?.removeEventListener('click', showList)
      setAppRoot(document)
    },
  }
}
