import { describe, expect, it } from 'vitest'
import { courseData } from '../data/courses.ts'
import { coreqText, courseLabel, describeReq } from './describe.ts'
import { buildFocusGraph, buildFullGraph, type FocusGraph } from './focusGraph.ts'
import { layoutFocusGraph, nodeSize } from './layout.ts'
import { buildGraph } from './prereq.ts'
import { searchCourses } from './search.ts'

// Uses the real course data (rebuilt by `npm test`).

const graph = buildGraph(courseData)
const all = [...courseData.courses, ...courseData.external]
const course = (id: string) => all.find((c) => c.id === id)!
const focus = (id: string, showRecommended = false) => buildFocusGraph(id, courseData, graph, { showRecommended })

const courseIds = (g: FocusGraph, role?: string) =>
  g.nodes
    .filter((n) => n.kind === 'course' && (!role || n.role === role))
    .map((n) => n.id)
    .sort()
const edge = (g: FocusGraph, source: string, target: string) =>
  g.edges.find((e) => e.source === source && e.target === target)?.kind
const junctions = (g: FocusGraph) => g.nodes.filter((n) => n.kind === 'junction')

describe('buildFocusGraph', () => {
  it('CSE 451: all ancestors, required edges solid, no junction for a plain AND', () => {
    const g = focus('CSE 451')
    expect(courseIds(g, 'ancestor')).toEqual(
      ['CSE 123', 'CSE 142', 'CSE 143', 'CSE 311', 'CSE 332', 'CSE 333', 'CSE 351', 'MATH 126', 'MATH 135'],
    )
    expect(edge(g, 'CSE 332', 'CSE 451')).toBe('required')
    expect(edge(g, 'CSE 333', 'CSE 451')).toBe('required')
    expect(edge(g, 'CSE 351', 'CSE 451')).toBe('required')
    expect(courseIds(g, 'descendant')).toEqual([]) // nothing in the map needs CSE 451
  })

  it('CSE 469: two "one of 2" junctions with dashed edges from each option', () => {
    const g = focus('CSE 469')
    const into469 = g.edges.filter((e) => e.target === 'CSE 469')
    expect(into469).toHaveLength(2)
    expect(into469.every((e) => e.kind === 'required')).toBe(true)
    for (const e of into469) {
      const j = g.nodes.find((n) => n.id === e.source)!
      expect(j).toMatchObject({ kind: 'junction', label: 'one of 2' })
    }
    const options = g.edges.filter((e) => into469.some((j) => j.source === e.target)).map((e) => [e.source, e.kind])
    expect(options.sort()).toEqual([
      ['CSE 123', 'one-of'],
      ['CSE 143', 'one-of'],
      ['CSE 369', 'one-of'],
      ['E E 271', 'one-of'],
    ])
  })

  it('CSE 311: direct descendants only, with the focus course drawn as one option where it is one', () => {
    const g = focus('CSE 311')
    expect(courseIds(g, 'descendant')).toEqual(['CSE 312', 'CSE 332', 'CSE 369'])
    expect(edge(g, 'CSE 311', 'CSE 312')).toBe('required')

    const g123 = focus('CSE 123')
    const to351 = g123.edges.find((e) => e.target === 'CSE 351')!
    expect(g123.nodes.find((n) => n.id === to351.source)).toMatchObject({ kind: 'junction', label: 'one of 2' })
    // Only the focus course feeds the junction; CSE 143 isn't drawn on the right.
    expect(g123.edges.filter((e) => e.target === to351.source).map((e) => e.source)).toEqual(['CSE 123'])
    expect(courseIds(g123)).not.toContain('CSE 143')
  })

  it('CSE 414: three options → "one of 3", including external CSE 163', () => {
    const g = focus('CSE 414')
    expect(junctions(g).map((j) => j.kind === 'junction' && j.label)).toEqual(['one of 3'])
    expect(edge(g, 'CSE 163', junctions(g)[0].id)).toBe('one-of')
  })

  it('CSE 461: retired alternatives appear as nodes', () => {
    const g = focus('CSE 461')
    expect(courseIds(g)).toEqual(expect.arrayContaining(['CSE 303', 'CSE 326']))
  })

  it('recommended edges are hidden by default and dotted when shown (CSE 447)', () => {
    expect(courseIds(focus('CSE 447'))).not.toContain('CSE 446')
    const g = focus('CSE 447', true)
    expect(courseIds(g, 'recommended')).toEqual(['CSE 446', 'MATH 208'])
    expect(edge(g, 'CSE 446', 'CSE 447')).toBe('recommended')
    expect(edge(g, 'MATH 208', 'CSE 447')).toBe('recommended')
  })

  it('shows courses that recommend the focus course (CSE 446 → 447)', () => {
    const g = focus('CSE 446', true)
    expect(edge(g, 'CSE 446', 'CSE 447')).toBe('recommended')
  })

  it('recommended OR with an other leaf (CSE 122)', () => {
    const g = focus('CSE 122', true)
    const j = junctions(g)[0]
    expect(j).toMatchObject({ label: 'one of 2', recommended: true })
    expect(g.nodes.find((n) => n.kind === 'other')).toMatchObject({ text: 'Guided Self-Placement' })
    expect(g.edges.filter((e) => e.target === j.id).every((e) => e.kind === 'recommended')).toBe(true)
  })

  it('an other leaf is not drawn for courses that merely recommend the focus course', () => {
    // CSE 122 recommends "CSE 121 or Guided Self-Placement"; focused on 121, GSP isn't shown.
    const g = focus('CSE 121', true)
    expect(edge(g, 'CSE 121', junctions(g)[0]?.id)).toBe('recommended')
    expect(g.nodes.filter((n) => n.kind === 'other').map((n) => n.id)).toEqual(['CSE 121/recommended'])
  })

  it('external focus: MATH 126 shows what it unlocks', () => {
    const g = focus('MATH 126')
    expect(courseIds(g, 'descendant')).toEqual(['CSE 311'])
  })

  it('unknown course → empty graph', () => {
    expect(focus('CSE 999')).toEqual({ nodes: [], edges: [] })
  })
})

describe('buildFullGraph', () => {
  const full = buildFullGraph(courseData)
  const ids = new Set([...full.nodes.map((n) => n.id), ...full.edges.map((e) => e.id)])

  it('has every course and outside course', () => {
    expect(courseIds(full)).toEqual(all.map((c) => c.id).sort())
    expect(courseIds(full)).toHaveLength(35)
  })

  it('every focus graph is a subset of the full map, so highlighting matches the Focus view', () => {
    for (const c of all) {
      for (const showRecommended of [false, true]) {
        const g = focus(c.id, showRecommended)
        for (const x of [...g.nodes, ...g.edges]) expect(ids, `${c.id}: ${x.id}`).toContain(x.id)
      }
    }
  })

  it('co-requisites are never drawn as edges (CSE 197)', () => {
    expect(full.edges.filter((e) => e.target === 'CSE 197' || e.source === 'CSE 197')).toEqual([])
  })
})

describe('minimum grades on edges', () => {
  const grades = (g: FocusGraph, target: string) =>
    g.edges
      .filter((e) => e.minGrade !== undefined && (e.target === target || e.target.startsWith(`${target}/`)))
      .map((e) => [e.source, e.minGrade])
      .sort()

  it('CSE 311: 2.0 on all four options', () => {
    expect(grades(focus('CSE 311'), 'CSE 311')).toEqual([
      ['CSE 123', 2],
      ['CSE 143', 2],
      ['MATH 126', 2],
      ['MATH 135', 2],
    ])
  })

  it('CSE 331: 2.0; CSE 414: 2.5 — in both views', () => {
    const full = buildFullGraph(courseData)
    expect(grades(full, 'CSE 331')).toEqual([['CSE 123', 2], ['CSE 143', 2]])
    expect(grades(full, 'CSE 414')).toEqual([['CSE 123', 2.5], ['CSE 143', 2.5], ['CSE 163', 2.5]])
    expect(grades(focus('CSE 414'), 'CSE 414')).toEqual(grades(full, 'CSE 414'))
  })

  it('a descendant edge keeps its grade (CSE 123 → CSE 331 shows 2.0)', () => {
    expect(grades(focus('CSE 123'), 'CSE 331')).toEqual([['CSE 123', 2]])
  })

  it('elk places a label for each graded edge', async () => {
    const g = focus('CSE 311')
    const { labels } = await layoutFocusGraph(g)
    const graded = g.edges.filter((e) => e.minGrade !== undefined)
    expect(graded).toHaveLength(4)
    for (const e of graded) expect(labels.has(e.id)).toBe(true)
  })
})

describe('layoutFocusGraph', () => {
  it('CSE 197 gets a taller box for its "Take with" line', () => {
    const node = buildFullGraph(courseData).nodes.find((n) => n.id === 'CSE 197')!
    expect(nodeSize(node).height).toBeGreaterThan(64)
  })

  it('ancestors left of the focus course, descendants right (CSE 311)', async () => {
    const g = focus('CSE 311')
    const pos = (await layoutFocusGraph(g)).positions
    const x = (id: string) => pos.get(id)!.x
    for (const id of courseIds(g, 'ancestor')) expect(x(id)).toBeLessThan(x('CSE 311'))
    for (const id of courseIds(g, 'descendant')) expect(x(id)).toBeGreaterThan(x('CSE 311'))
  })

  it('every edge points left to right (CSE 451)', async () => {
    const g = focus('CSE 451')
    const pos = (await layoutFocusGraph(g)).positions
    for (const e of g.edges) expect(pos.get(e.source)!.x).toBeLessThan(pos.get(e.target)!.x)
  })

  it('every edge gets a route from elk', async () => {
    const { routes } = await layoutFocusGraph(focus('CSE 469'))
    expect([...routes.values()].every((points) => points.length >= 2)).toBe(true)
  })
})

describe('describe', () => {
  it('accessible name for CSE 451', () => {
    expect(courseLabel(course('CSE 451'), 0)).toBe(
      'CSE 451, Introduction to Operating Systems. Requires CSE 332, CSE 333, and CSE 351.',
    )
  })

  it('nested ORs read with commas', () => {
    expect(courseLabel(course('CSE 469'), 0)).toBe(
      'CSE 469, Computer Architecture I. Requires one of E E 271 or CSE 369, and one of CSE 123 or CSE 143.',
    )
  })

  it('minimum grades inline, unlock count', () => {
    expect(courseLabel(course('CSE 311'), 3)).toBe(
      'CSE 311, Foundations of Computing I. Requires one of CSE 123 (minimum grade 2.0) or CSE 143 (minimum grade 2.0), ' +
        'and one of MATH 126 (minimum grade 2.0) or MATH 135 (minimum grade 2.0). Unlocks 3 courses.',
    )
  })

  it('external and retired stubs', () => {
    expect(courseLabel(course('MATH 126'), 1)).toBe('MATH 126. Not part of this map. Unlocks 1 course.')
    expect(courseLabel(course('CSE 142'), 1)).toBe('CSE 142. Retired course. Not part of this map. Unlocks 1 course.')
  })

  it('minimum grades are in the accessible names (CSE 331, CSE 414)', () => {
    expect(courseLabel(course('CSE 331'), 0)).toBe(
      'CSE 331, Software Design and Implementation. Requires one of CSE 123 (minimum grade 2.0) or CSE 143 (minimum grade 2.0).',
    )
    expect(courseLabel(course('CSE 414'), 0)).toBe(
      'CSE 414, Introduction to Database Systems. Requires one of CSE 123 (minimum grade 2.5), CSE 143 (minimum grade 2.5), or CSE 163 (minimum grade 2.5).',
    )
  })

  it('co-requisite text and accessible name (CSE 197)', () => {
    const c197 = courseData.courses.find((c) => c.id === 'CSE 197')!
    expect(coreqText(c197.coreq!)).toBe('Take with one of CSE 121, CSE 122, CSE 123')
    expect(courseLabel(c197, 0)).toBe(
      'CSE 197, Problem Solving for Computer Science and Engineering. No prerequisites. Take with one of CSE 121, CSE 122, CSE 123.',
    )
  })

  it('concurrent-ok and other leaves', () => {
    const rec447 = courseData.courses.find((c) => c.id === 'CSE 447')!.recommended!
    expect(describeReq(rec447)).toBe('MATH 208 and CSE 446 (before or at the same time)')
    expect(courseLabel(course('CSE 121'), 0)).toBe('CSE 121, Introduction to Computer Programming I. No prerequisites.')
  })
})

describe('searchCourses', () => {
  const ids = (q: string) => searchCourses(q, all).map((c) => c.id)

  it('matches full number with or without a space, any case', () => {
    expect(ids('CSE 451')[0]).toBe('CSE 451')
    expect(ids('cse451')[0]).toBe('CSE 451')
  })

  it('matches the number without "CSE"', () => {
    expect(ids('451')).toEqual(['CSE 451'])
    expect(ids('271')).toEqual(['E E 271'])
  })

  it('matches E E with or without spaces', () => {
    expect(ids('ee271')).toEqual(['E E 271'])
    expect(ids('e e 271')).toEqual(['E E 271'])
  })

  it('matches title words', () => {
    expect(ids('operating')).toEqual(['CSE 451'])
    expect(ids('Programming')).toEqual(['CSE 121', 'CSE 122', 'CSE 123', 'CSE 143', 'CSE 333'])
  })

  it('number prefix matches courses from every department', () => {
    expect(ids('12')).toEqual(['CSE 121', 'CSE 122', 'CSE 123', 'MATH 126'])
  })

  it('empty query → nothing', () => {
    expect(ids('')).toEqual([])
    expect(ids('   ')).toEqual([])
  })
})
