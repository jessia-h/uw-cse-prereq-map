// @vitest-environment jsdom
// Keyboard, focus, and accessibility behavior of the whole app, using the
// real course data. Color contrast is checked in theme.test.ts instead,
// because jsdom doesn't compute styles.

import { setWide } from './test/dom.ts'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

function renderAt(url: string, { wide = true } = {}) {
  setWide(wide)
  localStorage.clear()
  window.history.replaceState(null, '', url)
  const user = userEvent.setup()
  render(<App />)
  return user
}

/** A course box in a graph; its accessible name starts "CSE 311, …" (or "MATH 126. …"). */
const findNode = (id: string) => screen.findByRole('button', { name: new RegExp(`^${id}[,.]`) })
const course = () => new URLSearchParams(window.location.search).get('course')

async function expectNoAxeViolations() {
  const result = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } })
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
}

describe('whole map: detail panel focus', () => {
  it('selecting a course opens the panel and focuses its heading', async () => {
    const user = renderAt('/')
    await user.click(await findNode('CSE 311'))
    const panel = screen.getByRole('region', { name: /CSE 311/ })
    expect(document.activeElement).toBe(within(panel).getByRole('heading', { level: 2 }))
    expect(course()).toBe('CSE311')
  })

  it('Escape closes the panel, clears the selection, and returns focus to the course', async () => {
    const user = renderAt('/?course=CSE311')
    await screen.findByRole('region', { name: /CSE 311/ })
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: /CSE 311/ })).toBeNull()
    expect(course()).toBeNull()
    await waitFor(async () => expect(document.activeElement).toBe(await findNode('CSE 311')))
  })

  it('the Close button does the same', async () => {
    const user = renderAt('/?course=CSE469')
    const panel = await screen.findByRole('region', { name: /CSE 469/ })
    await user.click(within(panel).getByRole('button', { name: /Close/ }))
    expect(course()).toBeNull()
    await waitFor(async () => expect(document.activeElement).toBe(await findNode('CSE 469')))
  })

  it('a course in Unlocks selects that course', async () => {
    const user = renderAt('/?course=CSE311')
    const panel = await screen.findByRole('region', { name: /CSE 311/ })
    await user.click(within(panel).getByRole('button', { name: /^CSE 312/ }))
    expect(course()).toBe('CSE312')
    const next = screen.getByRole('region', { name: /CSE 312/ })
    expect(document.activeElement).toBe(within(next).getByRole('heading', { level: 2 }))
  })

  it('an empty Unlocks section says so', async () => {
    renderAt('/?course=CSE451')
    const panel = await screen.findByRole('region', { name: /CSE 451/ })
    expect(within(panel).getByText('None among the courses in this prototype.')).toBeTruthy()
  })

  it('the panel shows the last-verified date and the disclaimer', async () => {
    renderAt('/?course=CSE451')
    const panel = await screen.findByRole('region', { name: /CSE 451/ })
    expect(within(panel).getByText(/Last verified October 22, 2026/)).toBeTruthy()
    expect(within(panel).getByText(/Advising aid only/)).toBeTruthy()
  })
})

describe('"Just this course": Close only hides the panel', () => {
  it('keeps the graph, returns focus to the course, and selecting it reopens the panel', async () => {
    const user = renderAt('/?course=CSE451&view=focus')
    const panel = await screen.findByRole('region', { name: /CSE 451/ })
    await user.click(within(panel).getByRole('button', { name: /Close/ }))
    expect(screen.queryByRole('region', { name: /CSE 451/ })).toBeNull()
    expect(course()).toBe('CSE451')
    const node = await findNode('CSE 451')
    await waitFor(() => expect(document.activeElement).toBe(node))

    await user.click(node)
    const reopened = screen.getByRole('region', { name: /CSE 451/ })
    expect(document.activeElement).toBe(within(reopened).getByRole('heading', { level: 2 }))
  })
})

describe('keyboard on the map', () => {
  it('ArrowRight moves to a course it unlocks; ArrowLeft to a prerequisite', async () => {
    const user = renderAt('/')
    ;(await findNode('CSE 311')).focus()
    await user.keyboard('{ArrowRight}')
    expect(['CSE 312', 'CSE 332', 'CSE 369']).toContain(document.activeElement?.getAttribute('data-course-id'))

    ;(await findNode('CSE 311')).focus()
    await user.keyboard('{ArrowLeft}')
    expect(['CSE 123', 'CSE 143', 'MATH 126', 'MATH 135']).toContain(document.activeElement?.getAttribute('data-course-id'))
  })

  it('ArrowUp / ArrowDown move to another course', async () => {
    const user = renderAt('/')
    ;(await findNode('CSE 143')).focus()
    await user.keyboard('{ArrowDown}')
    const below = document.activeElement?.getAttribute('data-course-id')
    expect(below).toBeTruthy()
    expect(below).not.toBe('CSE 143')
  })

  it('Enter on a focused course selects it', async () => {
    const user = renderAt('/')
    ;(await findNode('CSE 332')).focus()
    await user.keyboard('{Enter}')
    expect(course()).toBe('CSE332')
  })

  it('"/" focuses the search box', async () => {
    const user = renderAt('/')
    await findNode('CSE 311')
    await user.keyboard('/')
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Search courses' }))
  })

  it('selection changes are announced politely', async () => {
    const user = renderAt('/')
    await user.click(await findNode('CSE 311'))
    expect(screen.getByText('Selected CSE 311, Foundations of Computing I.').getAttribute('aria-live')).toBe('polite')
  })
})

describe('List view', () => {
  it('lists every course alphabetically as links', async () => {
    renderAt('/?view=list')
    const list = screen.getByRole('region', { name: 'All courses' })
    const links = within(list).getAllByRole('link')
    expect(links).toHaveLength(32) // 35 courses in the data, minus 3 retired
    expect(links[0].textContent).toBe('CSE 121, Introduction to Computer Programming I')
  })

  it('a link selects the course and shows nested requirements with minimum grades', async () => {
    const user = renderAt('/?view=list')
    await user.click(screen.getByRole('link', { name: /^CSE 311,/ }))
    const region = screen.getByRole('region', { name: /CSE 311/ })
    expect(document.activeElement).toBe(within(region).getByRole('heading', { level: 2 }))
    expect(within(region).getByText('All of these:')).toBeTruthy()
    expect(within(region).getAllByText('One of these:')).toHaveLength(2)
    expect(within(region).getAllByText(/minimum grade 2\.0/)).toHaveLength(4)
    expect(course()).toBe('CSE311')
  })

  it('outside courses are labeled as on the map, in their accessible names too', async () => {
    const user = renderAt('/?view=list')
    expect(screen.getByRole('link', { name: 'MATH 126 (Non-CSE course)' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'CSE 163 (Not in prototype yet)' })).toBeTruthy()
    expect(screen.queryByText(/outside this prototype/)).toBeNull()
    // The course's own page says the same.
    await user.click(screen.getByRole('link', { name: 'CSE 163 (Not in prototype yet)' }))
    expect(screen.getByText('Not in prototype yet. This map doesn’t list its prerequisites.')).toBeTruthy()
    // And it matches the map card's accessible name.
    cleanup()
    renderAt('/')
    expect((await findNode('CSE 163')).getAttribute('aria-label')).toContain('Not in prototype yet.')
    expect((await findNode('MATH 126')).getAttribute('aria-label')).toContain('Non-CSE course.')
  })

  it('co-requisites, recommended, and unlocks (CSE 197, CSE 447)', async () => {
    const user = renderAt('/?course=CSE197&view=list')
    expect(screen.getByText('Take with one of these:')).toBeTruthy()
    await user.click(screen.getByRole('link', { name: 'All courses' }))
    await user.click(screen.getByRole('link', { name: /^CSE 447,/ }))
    expect(screen.getByRole('heading', { name: 'Recommended (not required)' })).toBeTruthy()
    expect(screen.getByText(/before or at the same time/)).toBeTruthy()
  })

  it('is the default view on narrow screens', () => {
    renderAt('/', { wide: false })
    expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('heading', { name: 'All courses' })).toBeTruthy()
  })

  it('the skip link is first and opens the list with its heading focused', async () => {
    const user = renderAt('/')
    await user.tab()
    const skip = screen.getByRole('link', { name: 'Skip to course list' })
    expect(document.activeElement).toBe(skip)
    await user.click(skip)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'All courses' })))
  })
})

describe('axe: no accessibility violations', () => {
  it('whole map, nothing selected', async () => {
    renderAt('/')
    await findNode('CSE 311')
    await expectNoAxeViolations()
  })

  it('whole map with the panel open', async () => {
    renderAt('/?course=CSE461')
    await screen.findByRole('region', { name: /CSE 461/ })
    await expectNoAxeViolations()
  })

  it('"Just this course" with the panel open', async () => {
    renderAt('/?course=CSE469&view=focus')
    await findNode('CSE 469')
    await expectNoAxeViolations()
  })

  it('"Just this course" start screen', async () => {
    renderAt('/?view=focus')
    await expectNoAxeViolations()
  })

  it('List view, all courses and one course', async () => {
    renderAt('/?view=list')
    await expectNoAxeViolations()
  })

  it('List view, one course', async () => {
    renderAt('/?course=CSE311&view=list')
    await expectNoAxeViolations()
  })
})

describe('"How to read this map" dialog', () => {
  it('opens with focus on its heading; Escape closes only the dialog and returns focus', async () => {
    const user = renderAt('/?course=CSE311')
    const panel = await screen.findByRole('region', { name: /CSE 311/ })
    const trigger = screen.getByRole('button', { name: 'How to read this map' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'How to read this map' })
    expect(document.activeElement).toBe(within(dialog).getByRole('heading', { level: 2 }))
    await expectNoAxeViolations()

    await user.keyboard('{Escape}')
    expect(dialog.hasAttribute('open')).toBe(false)
    expect(document.activeElement).toBe(trigger)
    expect(panel.isConnected).toBe(true) // the panel stays open
    expect(course()).toBe('CSE311')
  })

  it('the Close button closes it', async () => {
    const user = renderAt('/')
    await user.click(screen.getByRole('button', { name: 'How to read this map' }))
    const dialog = screen.getByRole('dialog', { name: 'How to read this map' })
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(dialog.hasAttribute('open')).toBe(false)
  })
})

describe('prototype strip', () => {
  it('can be dismissed, and stays dismissed', async () => {
    const user = renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Dismiss prototype notice' }))
    expect(screen.queryByRole('button', { name: 'Dismiss prototype notice' })).toBeNull()
    expect(localStorage.getItem('prototype-banner-dismissed')).toBe('1')
    // The notice is still in the footer.
    expect(within(screen.getByRole('contentinfo')).getByText(/of about 100 CSE courses/)).toBeTruthy()
  })

  it('works when storage is blocked', async () => {
    const user = renderAt('/')
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    cleanup()
    render(<App />)
    expect(screen.getByRole('button', { name: 'Dismiss prototype notice' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Dismiss prototype notice' }))
    expect(screen.queryByRole('button', { name: 'Dismiss prototype notice' })).toBeNull()
    get.mockRestore()
    set.mockRestore()
  })
})

describe('retired courses and CSE 143', () => {
  it('search and the URL never reach a retired course', async () => {
    const user = renderAt('/?course=CSE142')
    expect(screen.getByRole('alert').textContent).toMatch(/isn’t in this map/)
    await user.type(screen.getByRole('searchbox', { name: 'Search courses' }), '142')
    expect(screen.getByText('0 matching courses')).toBeTruthy()
  })

  it('CSE 143: the card note is in its name, and the panel gives the advice', async () => {
    const user = renderAt('/')
    const node = await findNode('CSE 143')
    expect(node.getAttribute('aria-label')).toContain('For students who already completed an earlier intro course')
    await user.click(node)
    const panel = screen.getByRole('region', { name: /CSE 143/ })
    expect(within(panel).getByText(/Most students should take CSE 122 or CSE 123 instead\./)).toBeTruthy()
    // CSE 142 appears only in the collapsed catalog wording, quoted exactly.
    expect(within(panel).getByText('Prerequisite: CSE 142.').closest('details')).toBeTruthy()
    const outside = panel.cloneNode(true) as HTMLElement
    outside.querySelector('details')!.remove()
    expect(outside.textContent).not.toContain('CSE 142')
  })
})

describe('"Just this course": stable positions', () => {
  it('toggling recommended courses moves nothing', async () => {
    const user = renderAt('/?course=CSE446&view=focus')
    await findNode('CSE 446')
    const positions = () =>
      Object.fromEntries(
        [...document.querySelectorAll<HTMLElement>('.react-flow__node')].map((n) => [n.dataset.id, n.style.transform]),
      )
    const before = positions()
    await user.click(screen.getByRole('checkbox', { name: /Show recommended courses/ }))
    await findNode('CSE 447')
    const after = positions()
    expect(Object.keys(after).length).toBeGreaterThan(Object.keys(before).length)
    for (const [id, transform] of Object.entries(before)) expect(after[id], id).toBe(transform)
  })
})
