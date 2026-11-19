// @vitest-environment jsdom
// Keyboard, focus, and accessibility behavior of the whole app, using the
// real course data. Color contrast is checked in theme.test.ts instead,
// because jsdom doesn't compute styles.

import { setWide } from './test/dom.ts'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

/**
 * A course box in a graph; its accessible name is "CSE 311, …" (or just
 * "MATH 126"). Only course cards count: the "Try:" chips are buttons named "CSE 451".
 */
const findNode = (id: string) =>
  waitFor(() => {
    const cards = screen
      .getAllByRole('button', { name: new RegExp(`^${id}(,|$)`) })
      .filter((b) => b.classList.contains('course-node'))
    expect(cards).toHaveLength(1)
    return cards[0]
  })
/** The text a course box's aria-describedby points to: requirements, role, notes, unlocks. */
const description = (el: HTMLElement) => document.getElementById(el.getAttribute('aria-describedby') ?? '')?.textContent ?? ''
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
    expect(links).toHaveLength(46) // 36 courses + 13 stubs in the data, minus 3 retired stubs
    expect(links[0].textContent).toBe('CSE 121, Introduction to Computer Programming I')
  })

  it('a link selects the course and shows nested requirements with minimum grades', async () => {
    const user = renderAt('/?view=list')
    await user.click(screen.getByRole('link', { name: /^CSE 311,/ }))
    const region = screen.getByRole('region', { name: /CSE 311/ })
    expect(document.activeElement).toBe(within(region).getByRole('heading', { level: 2 }))
    expect(within(region).getByText('All of these:')).toBeTruthy()
    expect(within(region).getAllByText('One of these:')).toHaveLength(2)
    // Four in the prerequisite lists; "In your degree" also says it, for each degree.
    const grades = within(region).getAllByText(/minimum grade 2\.0/)
    expect(grades.filter((el) => !el.closest('.in-degree'))).toHaveLength(4)
    expect(grades.filter((el) => el.closest('.in-degree'))).toHaveLength(3)
    expect(course()).toBe('CSE311')
  })

  // The real data has no "Not in prototype yet" course any more (CSE 163 is now
  // encoded); externalLabel covers that wording in focusGraph.test.ts.
  it('outside courses are labeled as on the map, in their accessible names too', async () => {
    const user = renderAt('/?view=list')
    expect(screen.getByRole('link', { name: 'MATH 126 (Non-CSE course)' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /^CSE 163, Intermediate Data Programming$/ })).toBeTruthy()
    expect(screen.queryByText(/outside this prototype/)).toBeNull()
    // The course's own page says the same.
    await user.click(screen.getByRole('link', { name: 'MATH 126 (Non-CSE course)' }))
    expect(screen.getByText('Non-CSE course. This map doesn’t list its prerequisites.')).toBeTruthy()
    // And it matches the map card's accessible name.
    cleanup()
    renderAt('/')
    expect(description(await findNode('MATH 126'))).toContain('Non-CSE course.')
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

  it('CSE 154 and CSE 163: CSE 142 appears only in the catalog wording', async () => {
    for (const [id, quote] of [
      ['CSE154', 'Prerequisite: a minimum grade of 2.0 in either CSE 122, CSE 123, CSE 142, CSE 143, CSE 160, or CSE 163.'],
      ['CSE163', 'Prerequisite: either CSE 122, CSE 123, CSE 142, CSE 143, or CSE 160.'],
    ]) {
      renderAt(`/?course=${id}`)
      const panel = await screen.findByRole('region', { name: new RegExp(id.replace('CSE', 'CSE ')) })
      expect(within(panel).getByText(quote).closest('details')).toBeTruthy()
      const outside = panel.cloneNode(true) as HTMLElement
      outside.querySelector('details')!.remove()
      expect(outside.textContent, id).not.toContain('CSE 142')
      const node = await findNode(id.replace('CSE', 'CSE '))
      expect(node.getAttribute('aria-label')).not.toContain('CSE 142')
      expect(description(node)).not.toContain('CSE 142')
      cleanup()
    }
  })

  it('CSE 143: the card note is in its name, and the panel gives the advice', async () => {
    const user = renderAt('/')
    const node = await findNode('CSE 143')
    expect(description(node)).toContain('For students who already completed an earlier intro course')
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

describe('degree lens', () => {
  const degreeGroup = () => screen.getByRole('group', { name: 'Show my degree:' })
  const params = () => new URLSearchParams(window.location.search)
  const positions = () =>
    Object.fromEntries([...document.querySelectorAll<HTMLElement>('.react-flow__node')].map((n) => [n.dataset.id, n.style.transform]))

  it('picking a degree writes &degree=, and cards show the role as a badge and in their names', async () => {
    const user = renderAt('/')
    await findNode('CSE 474')
    const before = positions()
    await user.click(within(degreeGroup()).getByRole('button', { name: 'Computer Engineering' }))
    expect(params().get('degree')).toBe('ce')
    const node = await findNode('CSE 474')
    expect(node.textContent).toContain('1 of 4 required')
    // Short name with the role; the details are in the description.
    expect(node.getAttribute('aria-label')).toBe('CSE 474, Introduction to Embedded Systems, 1 of 4 required for Computer Engineering')
    expect(description(node)).toContain('In Computer Engineering: 1 of 4 required.')
    expect(description(await findNode('CSE 373'))).toContain(
      'In Computer Engineering: Does not count (majors must take CSE 332).',
    )
    // Switching degree moves nothing.
    expect(positions()).toEqual(before)
    expect(within(degreeGroup()).getByRole('button', { name: 'Computer Engineering' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('"All": CS / DS / CE tags where the course is required, and no role legend', async () => {
    renderAt('/')
    const node = await findNode('CSE 311')
    expect([...node.querySelectorAll('.course-node__chip--program')].map((c) => c.textContent)).toEqual(['CS', 'DS', 'CE'])
    expect(node.getAttribute('aria-label')).toBe('CSE 311, Foundations of Computing I')
    expect(description(node)).toContain(
      'Required for Computer Science, Computer Science: Data Science, and Computer Engineering.',
    )
    expect(screen.queryByRole('list', { name: 'Degree roles' })).toBeNull()
    expect(screen.getByText('Degree roles are a guide. Confirm your requirements in MyPlan’s degree audit.')).toBeTruthy()
  })

  it('the legend gets a role row only when a degree is picked', async () => {
    renderAt('/?degree=cs')
    await findNode('CSE 311')
    expect(within(screen.getByRole('list', { name: 'Degree roles' })).getAllByRole('listitem')).toHaveLength(4)
  })

  it('the panel lists the role in each degree, the picked one first, with every group', async () => {
    renderAt('/?course=CSE474&degree=ce')
    const panel = await screen.findByRole('region', { name: /CSE 474/ })
    const section = within(panel).getByRole('region', { name: 'In your degree' })
    const items = within(section).getAllByRole('listitem').map((li) => li.textContent)
    expect(items[0]).toBe(
      'Computer Engineering: 1 of 4 required (CSE 403, CSE 474, CSE 480, CSE 484). Also: CE systems elective (3 needed); Core (2 needed).',
    )
    expect(items.slice(1)).toEqual([
      'Computer Science: Core (6 needed). Also: Elective. Six courses from the CSE Core list, at least four of them 400-level; plus one more Core course or one Capstone course.',
      'Computer Science: Data Science: Core (6 needed). Also: Elective. Six courses from the CSE Core list, at least four of them 400-level; plus one more Core course or one Capstone course.',
    ])
  })

  it('CSE 414: "Check with adviser" badge, not faded, and the note in the panel', async () => {
    renderAt('/?course=CSE414&degree=cs')
    const node = await findNode('CSE 414')
    expect(node.textContent).toContain('Check with adviser')
    expect(node.className).not.toContain('course-node--role-unused')
    const panel = screen.getByRole('region', { name: /CSE 414/ })
    expect(within(panel).getAllByText(/May substitute for a 300-level Core course/).length).toBeGreaterThan(0)
  })

  it('"Just this course" shows roles too', async () => {
    renderAt('/?course=CSE474&view=focus&degree=ce')
    expect((await findNode('CSE 474')).textContent).toContain('1 of 4 required')
  })

  it('List view: grouped by role, with the badge as text', async () => {
    renderAt('/?view=list&degree=ce')
    const list = screen.getByRole('region', { name: 'All courses' })
    expect(within(list).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Required',
      'Choose from a list',
      'Core and electives',
      'Other courses',
      'Not used in this degree',
    ])
    const choose = within(list).getByRole('region', { name: 'Choose from a list' })
    expect(within(choose).getByRole('link', { name: /^CSE 474,/ }).closest('li')!.textContent).toMatch(/— 1 of 4 required$/)
  })

  it('List view in "All": "Required: CS, DS, CE" after the link', () => {
    renderAt('/?view=list')
    const link = screen.getByRole('link', { name: /^CSE 311,/ })
    expect(link.closest('li')!.textContent).toBe('CSE 311, Foundations of Computing I — Required: CS, DS, CE')
  })
})

describe('remembering choices', () => {
  const params = () => new URLSearchParams(window.location.search)

  it('a URL with no choices gets the saved ones; a URL with choices wins', () => {
    setWide(true)
    window.history.replaceState(null, '', '/')
    localStorage.setItem('map-options', 'degree=ds&hide=noncse')
    render(<App />)
    expect(params().get('degree')).toBe('ds')
    expect(params().get('hide')).toBe('noncse')
    cleanup()

    window.history.replaceState(null, '', '/?degree=cs')
    render(<App />)
    expect(params().get('degree')).toBe('cs')
    expect(params().get('hide')).toBeNull()
    localStorage.clear()
  })

  it('choices are saved as they change, and storage that throws is fine', async () => {
    const user = renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Computer Science' }))
    expect(localStorage.getItem('map-options')).toBe('degree=cs')

    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    cleanup()
    window.history.replaceState(null, '', '/')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Computer Engineering' }))
    expect(params().get('degree')).toBe('ce')
    get.mockRestore()
    set.mockRestore()
  })
})

describe('filters and simplified lines', () => {
  const openFilters = async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByText('Filters'))
  const pill = (id: string) => document.querySelector(`.react-flow__node[data-id="${id}"]`)

  it('"Hide non-CSE courses": MATH cards go, CSE 311 says some prerequisites are hidden, and the count updates', async () => {
    const user = renderAt('/')
    await findNode('MATH 126')
    await openFilters(user)
    await user.click(screen.getByRole('checkbox', { name: 'Hide non-CSE courses' }))
    expect(screen.queryByRole('button', { name: /^MATH 126$/ })).toBeNull()
    const c311 = await findNode('CSE 311')
    expect(description(c311)).toContain('Some prerequisites hidden.')
    expect(c311.textContent).toContain('Some prerequisites hidden')
    // MATH 126 and 135 were CSE 311's only options in that group, so its pill goes too.
    expect(pill('CSE 311/prereq.all1')).toBeNull()
    expect(screen.getByText(/^Showing \d+ of 46 courses\.$/).textContent).toMatch(/Showing 3[0-9] of 46/)
    expect(screen.getByText('Filters (1 on)')).toBeTruthy()
  })

  it('a filtered-out course on the selected path still appears, with a note', async () => {
    renderAt('/?course=CSE311&hide=noncse')
    const math = await findNode('MATH 126')
    expect(description(math)).toContain('Shown because it’s on this course’s path.')
    expect(math.className).toContain('course-node--path-only')
  })

  it('"Hide courses not used in my degree" never hides courses that lead to a required course, or non-CSE courses', async () => {
    renderAt('/?degree=cs&hide=unused')
    await findNode('CSE 311')
    expect(screen.queryByRole('button', { name: /^CSE 373,/ })).toBeNull()
    expect(await findNode('CSE 121')).toBeTruthy() // leads to CSE 123
    expect(await findNode('MATH 126')).toBeTruthy()
    expect(await findNode('CSE 374')).toBeTruthy() // free elective: neutral
  })

  it('the level filter hides CSE courses of that level only', async () => {
    const user = renderAt('/')
    await findNode('CSE 121')
    await openFilters(user)
    await user.click(screen.getByRole('checkbox', { name: '100' }))
    expect(new URLSearchParams(window.location.search).get('levels')).toBe('300,400')
    expect(screen.queryByRole('button', { name: /^CSE 121,/ })).toBeNull()
    expect(await findNode('MATH 126')).toBeTruthy()
  })

  it('simplified by default: no CSE 123/143-only pills, a "Needs" tag instead; selecting brings the lines back', async () => {
    const user = renderAt('/')
    const c311 = await findNode('CSE 311')
    expect(pill('CSE 311/prereq.all0')).toBeNull()
    expect(c311.textContent).toContain('Needs CSE 123 or 143 (≥ 2.0)')
    // Mixed groups keep their lines.
    expect(pill('CSE 154/prereq')).not.toBeNull()
    await user.click(c311)
    expect(pill('CSE 311/prereq.all0')).not.toBeNull()
  })

  it('turning simplify off draws every line', async () => {
    renderAt('/?simple=0')
    await findNode('CSE 311')
    expect(pill('CSE 311/prereq.all0')).not.toBeNull()
    expect((await findNode('CSE 311')).textContent).not.toContain('Needs CSE 123 or 143')
  })

  it('Escape inside Filters closes it, not the course panel', async () => {
    const user = renderAt('/?course=CSE311')
    await screen.findByRole('region', { name: /CSE 311/ })
    await openFilters(user)
    const box = screen.getByRole('checkbox', { name: 'Hide non-CSE courses' })
    box.focus()
    await user.keyboard('{Escape}')
    expect((box.closest('details') as HTMLDetailsElement).open).toBe(false)
    expect(document.activeElement?.textContent).toBe('Filters')
    expect(screen.getByRole('region', { name: /CSE 311/ })).toBeTruthy()
  })

  it('arrow keys skip hidden courses', async () => {
    const user = renderAt('/?hide=noncse')
    ;(await findNode('CSE 311')).focus()
    await user.keyboard('{ArrowLeft}')
    expect(['CSE 123', 'CSE 143']).toContain(document.activeElement?.getAttribute('data-course-id'))
  })

  it('axe: a degree picked and the filters open', async () => {
    const user = renderAt('/?degree=ce&course=CSE474')
    await findNode('CSE 474')
    await openFilters(user)
    await expectNoAxeViolations()
  })

  it('axe: List view grouped by degree', async () => {
    renderAt('/?view=list&degree=ds')
    await expectNoAxeViolations()
  })
})

describe('accessible names and descriptions', () => {
  it('a course card has a short name; requirements, grades and unlocks are its description', async () => {
    renderAt('/')
    const node = await findNode('CSE 311')
    expect(node.getAttribute('aria-label')).toBe('CSE 311, Foundations of Computing I')
    const desc = description(node)
    expect(desc).toMatch(/^Requires one of CSE 123 \(minimum grade 2\.0\) or CSE 143 \(minimum grade 2\.0\)/)
    expect(desc).toMatch(/Unlocks 4 courses\.$/)
    // The description is visually hidden and outside the button, so the button's text is just what it shows.
    expect(node.textContent).not.toContain('Requires')
  })

  it('the selected state is aria-current; the name stays short', async () => {
    renderAt('/?course=CSE451')
    const node = await findNode('CSE 451')
    expect(node.getAttribute('aria-current')).toBe('true')
    expect(node.getAttribute('aria-label')).toBe('CSE 451, Introduction to Operating Systems')
  })

  it('with a degree picked, the name adds the role', async () => {
    renderAt('/?degree=cs')
    expect((await findNode('CSE 311')).getAttribute('aria-label')).toBe('CSE 311, Foundations of Computing I, Required for Computer Science')
    expect((await findNode('CSE 333')).getAttribute('aria-label')).toBe('CSE 333, Systems Programming, Core for Computer Science')
    // No badge (CSE 121 leads to a required course): no role in the name; the description says it.
    const c121 = await findNode('CSE 121')
    expect(c121.getAttribute('aria-label')).toBe('CSE 121, Introduction to Computer Programming I')
    expect(description(c121)).toContain('In Computer Science: Leads to a required course.')
  })
})

describe('full titles on hover and focus (WCAG 1.4.13)', () => {
  // jsdom doesn't lay out text, so pretend every title is cut off.
  const cutOff = () => {
    const sw = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(300)
    const cw = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(150)
    return () => (sw.mockRestore(), cw.mockRestore())
  }
  const tip = () => document.querySelector('.course-tip')

  it('shows on hover, sits in the same hover area, and Escape hides it without closing the panel', async () => {
    const restore = cutOff()
    const user = renderAt('/?course=CSE311')
    await screen.findByRole('region', { name: /CSE 311/ })
    const node = await findNode('CSE 333')
    await user.hover(node)
    expect(tip()?.textContent).toBe('Systems Programming')
    // Hoverable: the tip is inside the same hover area as the card. (Moving the
    // pointer onto it is checked in Chrome: user-event's mouseout has no
    // relatedTarget, which React reads as leaving the window.)
    expect(tip()!.closest('.course-node-wrap')).toBe(node.closest('.course-node-wrap'))
    await user.keyboard('{Escape}')
    expect(tip()).toBeNull() // dismissed, pointer not moved
    expect(screen.getByRole('region', { name: /CSE 311/ })).toBeTruthy() // the panel stayed open
    await user.unhover(node)
    await user.hover(node)
    expect(tip()).not.toBeNull() // shows again next time
    restore()
  })

  it('shows on keyboard focus too, and hides on blur', async () => {
    const restore = cutOff()
    renderAt('/')
    const node = await findNode('CSE 351')
    fireEvent.focus(node)
    expect(tip()?.textContent).toBe('The Hardware/Software Interface')
    fireEvent.blur(node)
    expect(tip()).toBeNull()
    restore()
  })

  it('titles that fit get no tip', async () => {
    const user = renderAt('/')
    await user.hover(await findNode('CSE 333'))
    expect(tip()).toBeNull()
  })
})

describe('scrolling over the map', () => {
  it('a plain scroll shows "Use Ctrl + scroll to zoom"; Ctrl + scroll does not', async () => {
    renderAt('/')
    await findNode('CSE 311')
    const map = document.querySelector('.react-flow') as HTMLElement
    fireEvent.wheel(map, { deltaY: 100, ctrlKey: true })
    expect(screen.queryByText('Use Ctrl + scroll to zoom')).toBeNull()
    fireEvent.wheel(map, { deltaY: 100 })
    expect(screen.getByText('Use Ctrl + scroll to zoom')).toBeTruthy()
  })
})
