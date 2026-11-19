// @vitest-environment jsdom
// The WordPress embed: the app inside a shadow root (src/embed.tsx). Checks
// that lookups, keyboard shortcuts, focus, headings and URL state still work
// when the app's elements aren't in the document's own tree.

import { setWide } from './test/dom.ts'
import { act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it } from 'vitest'
import { mountEmbeddedMap, MOUNT_ID, TEXT_LINK_ID } from './embed.tsx'

let unmount = () => {}
afterEach(() => {
  act(() => unmount())
  document.body.innerHTML = ''
})

/** The WordPress block's markup around the map, then the map mounted. */
function mount(url = '/advising/?page_id=42', { wide = true } = {}) {
  setWide(wide)
  localStorage.clear()
  window.history.replaceState(null, '', url)
  document.body.innerHTML = `
    <section aria-labelledby="h"><h2 id="h">CSE Course Prerequisite Map</h2>
      <p><a href="#${TEXT_LINK_ID}">Skip the interactive map</a></p>
      <div id="${MOUNT_ID}"></div>
      <p><a id="${TEXT_LINK_ID}" href="?view=list">View the course list as text</a></p>
    </section>`
  let shadow!: ShadowRoot
  act(() => {
    const result = mountEmbeddedMap(document.getElementById(MOUNT_ID)!, '')
    shadow = result.shadow
    unmount = result.unmount
  })
  return { shadow, user: userEvent.setup() }
}

const card = (shadow: ShadowRoot, id: string) =>
  waitFor(() => {
    const el = shadow.querySelector<HTMLElement>(`button.course-node[data-course-id="${id}"]`)
    expect(el).not.toBeNull()
    return el!
  })
const params = () => new URLSearchParams(window.location.search)

describe('WordPress embed (shadow root)', () => {
  it('renders inside the shadow root, with nothing of the app in the page itself', async () => {
    const { shadow } = mount()
    await card(shadow, 'CSE 311')
    expect(document.querySelector('.course-node')).toBeNull()
    expect(shadow.querySelector('style')).not.toBeNull()
    // Compact: no title, no banner or page landmarks; one toolbar with Options.
    expect(shadow.querySelector('h1, header, main, footer, .prototype-strip')).toBeNull()
    expect(shadow.querySelector('button.embed-bar__options')?.textContent).toBe('Options')
  })

  it('selecting a course keeps the page’s own URL parameters; the panel heading is an h3 under the page’s h2', async () => {
    const { shadow, user } = mount()
    await user.click(await card(shadow, 'CSE 311'))
    expect(params().get('course')).toBe('CSE311')
    expect(params().get('page_id')).toBe('42')
    expect(window.location.pathname).toBe('/advising/')
    const heading = shadow.getElementById('detail-heading')!
    expect(heading.tagName).toBe('H3')
    expect(shadow.activeElement).toBe(heading)
  })

  it('"/" (from inside the map) focuses search in the shadow root, and typing "/" in search still types', async () => {
    const { shadow, user } = mount()
    ;(await card(shadow, 'CSE 311')).focus() // embedded, the shortcut works from inside the map only
    await user.keyboard('/')
    const search = shadow.getElementById('course-search') as HTMLInputElement
    expect(shadow.activeElement).toBe(search)
    await user.keyboard('a/b')
    expect(search.value).toBe('a/b')
  })

  it('Escape closes the panel and returns focus to the course', async () => {
    const { shadow, user } = mount('/advising/?page_id=42&course=CSE311')
    await card(shadow, 'CSE 311')
    shadow.getElementById('detail-heading')!.focus()
    await user.keyboard('{Escape}')
    expect(params().get('course')).toBeNull()
    await waitFor(async () => expect(shadow.activeElement).toBe(await card(shadow, 'CSE 311')))
  })

  it('arrow keys move between courses inside the shadow root', async () => {
    const { shadow, user } = mount()
    ;(await card(shadow, 'CSE 311')).focus()
    await user.keyboard('{ArrowRight}')
    expect(['CSE 312', 'CSE 332', 'CSE 344', 'CSE 369']).toContain((shadow.activeElement as HTMLElement).dataset.courseId)
  })

  it('Options opens a panel with the filters and the key; Escape closes it and returns to the button', async () => {
    const { shadow, user } = mount('/advising/?course=CSE311')
    await card(shadow, 'CSE 311')
    const options = shadow.querySelector<HTMLButtonElement>('button.embed-bar__options')!
    await user.click(options)
    expect(options.getAttribute('aria-expanded')).toBe('true')
    const panel = shadow.getElementById('map-options')!
    expect(panel.hidden).toBe(false)
    expect(panel.textContent).toContain('Hide non-CSE courses')
    expect(panel.textContent).toContain('How to read this map')
    ;(panel.querySelector('input') as HTMLInputElement).focus()
    await user.keyboard('{Escape}')
    expect(panel.hidden).toBe(true)
    expect(shadow.activeElement).toBe(options)
    expect(params().get('course')).toBe('CSE311') // the course panel stayed open
  })

  it('the help dialog opens inside the shadow root and Escape closes only it', async () => {
    const { shadow, user } = mount('/advising/?course=CSE311')
    await card(shadow, 'CSE 311')
    await user.click(shadow.querySelector<HTMLButtonElement>('button.embed-bar__options')!)
    await user.click(shadow.querySelector<HTMLButtonElement>('.legend__help')!)
    const dialog = shadow.querySelector('dialog')!
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(shadow.activeElement).toBe(shadow.getElementById('help-heading'))
    expect(shadow.getElementById('help-heading')!.tagName).toBe('H3')
    await user.keyboard('{Escape}')
    expect(dialog.hasAttribute('open')).toBe(false)
    expect(params().get('course')).toBe('CSE311')
  })

  it('"View the course list as text" opens the List view in place, keeping the page’s parameters', async () => {
    const { shadow, user } = mount()
    await card(shadow, 'CSE 311')
    const link = document.getElementById(TEXT_LINK_ID) as HTMLAnchorElement
    expect(new URL(link.href).searchParams.get('page_id')).toBe('42')
    await user.click(link)
    expect(params().get('view')).toBe('list')
    expect(params().get('page_id')).toBe('42')
    await waitFor(() => expect(shadow.activeElement).toBe(shadow.getElementById('list-heading')))
    expect(shadow.getElementById('list-heading')!.tagName).toBe('H3')
  })

  it('narrow screens get only the List view, with no view switch', async () => {
    const { shadow } = mount('/advising/?view=map', { wide: false })
    await waitFor(() => expect(shadow.getElementById('list-heading')).not.toBeNull())
    expect(shadow.querySelector('[aria-label="View"]')).toBeNull()
    expect(shadow.querySelector('.react-flow')).toBeNull()
  })

  it('keys pressed elsewhere on the page are left alone', async () => {
    const { shadow, user } = mount('/advising/?course=CSE311')
    await card(shadow, 'CSE 311')
    const outside = document.createElement('input')
    document.body.append(outside)
    outside.focus()
    await user.keyboard('/')
    expect(outside.value).toBe('/')
    expect(shadow.activeElement).toBeNull()
  })

  it('axe: no violations in the shadow root', async () => {
    const { shadow } = mount('/advising/?course=CSE311')
    await card(shadow, 'CSE 311')
    const result = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } })
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
  })
})
