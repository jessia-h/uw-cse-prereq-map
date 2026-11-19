import { describe, expect, it } from 'vitest'
import { courseData as rawData, shownData as courseData } from '../data/courses.ts'
import {
  AUDIENCE_LABEL,
  answerSentence,
  catalogUrl,
  coreqText,
  courseDescription,
  courseName,
  describeReq,
  externalLabel,
  externalTag,
  formatDate,
  keepCourseIdsTogether,
  levelTag,
  reqItems,
  RETIRED_PREREQ_NOTE,
} from './describe.ts'
import { buildFocusGraph, buildFullGraph, introLinkIds, type FocusGraph } from './focusGraph.ts'
import { LABEL_SIZE, layoutFocusGraph, levelOf, nodeSize } from './layout.ts'
import { buildGraph } from './prereq.ts'
import { searchCourses } from './search.ts'

// Uses the real course data (rebuilt by `npm test`), as the interface shows
// it: without retired courses (lib/shown.ts). `rawData` is the full data.

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
      ['CSE 123', 'CSE 143', 'CSE 311', 'CSE 332', 'CSE 333', 'CSE 351', 'MATH 126', 'MATH 135'],
    )
    expect(edge(g, 'CSE 332', 'CSE 451')).toBe('required')
    expect(edge(g, 'CSE 333', 'CSE 451')).toBe('required')
    expect(edge(g, 'CSE 351', 'CSE 451')).toBe('required')
    expect(courseIds(g, 'descendant')).toEqual([]) // nothing in the map needs CSE 451
  })

  it('CSE 469: two "1 of 2" junctions with dashed edges from each option', () => {
    const g = focus('CSE 469')
    const into469 = g.edges.filter((e) => e.target === 'CSE 469')
    expect(into469).toHaveLength(2)
    expect(into469.every((e) => e.kind === 'required')).toBe(true)
    for (const e of into469) {
      const j = g.nodes.find((n) => n.id === e.source)!
      expect(j).toMatchObject({ kind: 'junction', label: '1 of 2' })
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
    expect(courseIds(g, 'descendant')).toEqual(['CSE 312', 'CSE 332', 'CSE 344', 'CSE 369'])
    expect(edge(g, 'CSE 311', 'CSE 312')).toBe('required')

    const g123 = focus('CSE 123')
    const to351 = g123.edges.find((e) => e.target === 'CSE 351')!
    expect(g123.nodes.find((n) => n.id === to351.source)).toMatchObject({ kind: 'junction', label: '1 of 2' })
    // Only the focus course feeds the junction; CSE 143 isn't drawn on the right.
    expect(g123.edges.filter((e) => e.target === to351.source).map((e) => e.source)).toEqual(['CSE 123'])
    expect(courseIds(g123)).not.toContain('CSE 143')
  })

  it('CSE 414: three options → "1 of 3", including CSE 163', () => {
    const g = focus('CSE 414')
    const into414 = g.nodes.find((n) => n.id === 'CSE 414/prereq')!
    expect(into414).toMatchObject({ kind: 'junction', label: '1 of 3' })
    expect(edge(g, 'CSE 163', into414.id)).toBe('one-of')
    // CSE 163 is an ancestor with its own group; retired CSE 142 isn't counted.
    expect(g.nodes.find((n) => n.id === 'CSE 163/prereq')).toMatchObject({ kind: 'junction', label: '1 of 4' })
  })

  it('CSE 461: retired alternatives are not drawn; 332 and 333 are solid required lines', () => {
    const g = focus('CSE 461')
    expect(courseIds(g)).not.toContain('CSE 303')
    expect(courseIds(g)).not.toContain('CSE 326')
    // No "1 of 1" pills: both lines into CSE 461 come straight from courses.
    expect(g.edges.filter((e) => e.target === 'CSE 461').map((e) => e.source).sort()).toEqual(['CSE 332', 'CSE 333'])
    expect(edge(g, 'CSE 332', 'CSE 461')).toBe('required')
    expect(edge(g, 'CSE 333', 'CSE 461')).toBe('required')
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
    const j = junctions(g).find((n) => n.id === 'CSE 122/recommended')!
    expect(j).toMatchObject({ label: '1 of 2', recommended: true })
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
    expect(courseIds(full)).toHaveLength(46) // 36 courses + 13 stubs in the data, minus 3 retired stubs
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
  it('every course card is the same size; CSE 197\'s "Take with" line is in its description instead', () => {
    const sizes = new Set(buildFullGraph(courseData).nodes.filter((n) => n.kind === 'course').map((n) => JSON.stringify(nodeSize(n))))
    expect([...sizes]).toEqual([JSON.stringify({ width: 200, height: 96 })])
    expect(courseDescription(course('CSE 197'), 0)).toContain('Take with one of CSE 121, CSE 122, CSE 123.')
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
  // A card's accessible name is short; everything else is its description (aria-describedby).
  it('names are short: number and title only', () => {
    expect(courseName(course('CSE 451'))).toBe('CSE 451, Introduction to Operating Systems')
    expect(courseName(course('MATH 126'))).toBe('MATH 126')
    for (const c of all) expect(courseName(c), c.id).not.toMatch(/Requires|Unlocks|minimum grade/)
  })

  it('description for CSE 451', () => {
    expect(courseDescription(course('CSE 451'), 0)).toBe('Requires CSE 332, CSE 333, and CSE 351.')
  })

  it('nested ORs read with commas', () => {
    expect(courseDescription(course('CSE 469'), 0)).toBe(
      'Requires one of E E 271 or CSE 369, and one of CSE 123 or CSE 143.',
    )
  })

  it('minimum grades inline, unlock count', () => {
    expect(courseDescription(course('CSE 311'), 3)).toBe(
      'Requires one of CSE 123 (minimum grade 2.0) or CSE 143 (minimum grade 2.0), ' +
        'and one of MATH 126 (minimum grade 2.0) or MATH 135 (minimum grade 2.0). Unlocks 3 courses.',
    )
  })

  it('courses outside the prototype: non-CSE, and CSE not yet encoded', () => {
    expect(courseDescription(course('MATH 126'), 1)).toBe('Non-CSE course. Unlocks 1 course.')
    // No CSE stub is left in the real data (CSE 163 is now encoded), so this uses a made-up one.
    const stub = { id: 'CSE 999', status: 'active', url: 'https://www.washington.edu/students/crscat/cse.html' } as const
    expect(courseDescription(stub, 1)).toBe('Not in prototype yet. Unlocks 1 course.')
    expect(externalLabel(stub)).toBe('Not in prototype yet')
    expect(externalTag(stub)).toBe('Not in prototype yet')
  })

  it('minimum grades are in the descriptions (CSE 331, CSE 414)', () => {
    expect(courseDescription(course('CSE 331'), 0)).toBe(
      'Requires one of CSE 123 (minimum grade 2.0) or CSE 143 (minimum grade 2.0).',
    )
    expect(courseDescription(course('CSE 414'), 0)).toBe(
      'Requires one of CSE 123 (minimum grade 2.5), CSE 143 (minimum grade 2.5), or CSE 163 (minimum grade 2.5).',
    )
  })

  it('co-requisite text and description (CSE 197)', () => {
    const c197 = courseData.courses.find((c) => c.id === 'CSE 197')!
    expect(coreqText(c197.coreq!)).toBe('Take with one of CSE 121, CSE 122, CSE 123')
    expect(courseDescription(c197, 0)).toBe('No prerequisites. Take with one of CSE 121, CSE 122, CSE 123.')
  })

  it('concurrent-ok and other leaves', () => {
    const rec447 = courseData.courses.find((c) => c.id === 'CSE 447')!.recommended!
    expect(describeReq(rec447)).toBe('MATH 208 and CSE 446 (before or at the same time)')
    expect(courseDescription(course('CSE 121'), 0)).toBe('No prerequisites.')
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
    expect(ids('Programming')).toEqual(['CSE 121', 'CSE 122', 'CSE 123', 'CSE 143', 'CSE 154', 'CSE 160', 'CSE 163', 'CSE 333'])
  })

  it('number prefix matches courses from every department', () => {
    expect(ids('12')).toEqual(['CSE 121', 'CSE 122', 'CSE 123', 'MATH 126'])
  })

  it('empty query → nothing', () => {
    expect(ids('')).toEqual([])
    expect(ids('   ')).toEqual([])
  })
})

describe('intro sequence links', () => {
  it('121 → 122 → 123 through their "one of" junctions, without Guided Self-Placement boxes', () => {
    const ids = [...introLinkIds(buildFullGraph(courseData))].sort()
    expect(ids).toEqual([
      'CSE 121->CSE 122/recommended:recommended',
      'CSE 122->CSE 123/recommended:recommended',
      'CSE 122/recommended',
      'CSE 122/recommended->CSE 122:recommended',
      'CSE 123/recommended',
      'CSE 123/recommended->CSE 123:recommended',
    ])
  })
})

describe('detail panel text', () => {
  it('top-level AND becomes list items, grades inline (CSE 311, CSE 469)', () => {
    const c = (id: string) => courseData.courses.find((x) => x.id === id)!
    expect(reqItems(c('CSE 311').prereq!)).toEqual([
      'One of CSE 123 (minimum grade 2.0) or CSE 143 (minimum grade 2.0)',
      'One of MATH 126 (minimum grade 2.0) or MATH 135 (minimum grade 2.0)',
    ])
    expect(reqItems(c('CSE 469').prereq!)).toEqual(['One of E E 271 or CSE 369', 'One of CSE 123 or CSE 143'])
    expect(reqItems(c('CSE 312').prereq!)).toEqual(['CSE 311'])
  })

  it('"unknown" audience reads "Not yet confirmed"', () => {
    expect(AUDIENCE_LABEL.unknown).toBe('Not yet confirmed')
  })

  it('catalog links use the course anchor', () => {
    expect(catalogUrl(course('CSE 451'))).toBe('https://www.washington.edu/students/crscat/cse.html#cse451')
    expect(catalogUrl(course('E E 271'))).toBe('https://www.washington.edu/students/crscat/ee.html#ee271')
  })

  it('dates are formatted without a time zone shift', () => {
    expect(formatDate('2026-10-22')).toBe('October 22, 2026')
  })
})

describe('minimum-grade labels stay readable', () => {
  type Box = { id: string; x: number; y: number; w: number; h: number }
  const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

  async function problems(g: FocusGraph, options = {}) {
    const layout = await layoutFocusGraph(g, options)
    const labels: Box[] = [...layout.labels].map(([id, c]) => ({
      id,
      x: c.x - LABEL_SIZE.width / 2,
      y: c.y - LABEL_SIZE.height / 2,
      w: LABEL_SIZE.width,
      h: LABEL_SIZE.height,
    }))
    const nodes: Box[] = g.nodes.map((n) => ({ id: n.id, ...layout.positions.get(n.id)!, w: nodeSize(n).width, h: nodeSize(n).height }))
    const found: string[] = []
    labels.forEach((a, i) => {
      for (const b of labels.slice(i + 1)) if (overlaps(a, b)) found.push(`${a.id} overlaps ${b.id}`)
      for (const n of nodes) if (overlaps(a, n)) found.push(`${a.id} overlaps node ${n.id}`)
    })
    return found
  }

  it('no overlaps on the full map', async () => {
    expect(await problems(buildFullGraph(courseData))).toEqual([])
  })

  it('no overlaps on the full map with level bands (what the map draws)', async () => {
    expect(await problems(buildFullGraph(courseData), { levelBands: true })).toEqual([])
  })

  it('no overlaps in any focus view', async () => {
    for (const c of all) expect(await problems(focus(c.id)), c.id).toEqual([])
  })
})

describe('retired courses are hidden from the interface', () => {
  const retired = rawData.external.filter((c) => c.status === 'retired').map((c) => c.id)
  const mentions = (value: unknown) => retired.filter((id) => JSON.stringify(value).includes(`"${id}"`))

  it('the data still has them, and eligibility logic still uses the full data', () => {
    expect(retired).toEqual(['CSE 142', 'CSE 303', 'CSE 326'])
  })

  it('no graph, requirement, or search result mentions one', () => {
    expect(mentions(buildFullGraph(courseData))).toEqual([])
    for (const c of all) expect(mentions(focus(c.id, true)), c.id).toEqual([])
    expect(mentions(courseData)).toEqual([])
    expect(searchCourses('CSE 142', all).map((c) => c.id)).not.toContain('CSE 142')
  })

  it('accessible names and panel sentences never name one', () => {
    for (const c of all) {
      for (const text of [courseName(c), courseDescription(c, 0), 'prereq' in c ? answerSentence(c) : '']) {
        for (const id of retired) expect(text, c.id).not.toContain(id)
      }
    }
  })

  it('the catalog wording is still verbatim', () => {
    expect(courseData.courses.find((c) => c.id === 'CSE 461')!.prereqText).toBe(
      'Prerequisite: either CSE 326 or CSE 332; either CSE 303 or CSE 333.',
    )
  })

  it('every course whose only prerequisites are retired has a note (CSE 143)', () => {
    const emptied = rawData.courses
      .filter((c) => c.status === 'active' && c.prereq && !courseData.courses.find((s) => s.id === c.id)!.prereq)
      .map((c) => c.id)
    expect(emptied).toEqual(['CSE 143'])
    for (const id of emptied) expect(RETIRED_PREREQ_NOTE[id], id).toBeDefined()
    expect(courseDescription(course('CSE 143'), 0)).toBe('For students who already completed an earlier intro course.')
  })
})

describe('panel answer sentence', () => {
  const answer = (id: string) => answerSentence(courseData.courses.find((c) => c.id === id)!)

  it('a shared minimum grade is said once (CSE 311)', () => {
    expect(answer('CSE 311')).toBe(
      'To take CSE 311, you need one of CSE 123 or CSE 143, and one of MATH 126 or MATH 135, each with a minimum grade of 2.0.',
    )
  })

  it('no grades (CSE 469); retired options gone (CSE 461)', () => {
    expect(answer('CSE 469')).toBe('To take CSE 469, you need one of E E 271 or CSE 369, and one of CSE 123 or CSE 143.')
    expect(answer('CSE 461')).toBe('To take CSE 461, you need CSE 332 and CSE 333.')
  })

  it('no prerequisites, co-requisites, and the CSE 143 note', () => {
    expect(answer('CSE 121')).toBe('CSE 121 has no prerequisites listed in the catalog.')
    expect(answer('CSE 197')).toBe(
      'CSE 197 has no prerequisites listed in the catalog. Take with one of CSE 121, CSE 122, CSE 123.',
    )
    expect(answer('CSE 143')).toBe(
      'For students who already completed an earlier intro course. Most students should take CSE 122 or CSE 123 instead.',
    )
  })

  it('batch 1: retired CSE 142 is left out of CSE 154 and CSE 163', () => {
    expect(answer('CSE 154')).toBe(
      'To take CSE 154, you need one of CSE 122, CSE 123, CSE 143, CSE 160, or CSE 163, each with a minimum grade of 2.0.',
    )
    expect(answer('CSE 163')).toBe('To take CSE 163, you need one of CSE 122, CSE 123, CSE 143, or CSE 160.')
  })

  it('batch 1: "CSE 331; CSE 332" and "CSE 332 and CSE 351" are both AND; CSE 160 has none', () => {
    expect(answer('CSE 403')).toBe('To take CSE 403, you need CSE 331 and CSE 332.')
    expect(answer('CSE 401')).toBe('To take CSE 401, you need CSE 332 and CSE 351.')
    expect(answer('CSE 160')).toBe('CSE 160 has no prerequisites listed in the catalog.')
  })

  it('course numbers stay together when the sentence wraps', () => {
    expect(keepCourseIdsTogether('one of E E 271 or CSE 369')).toBe('one of E\u00a0E\u00a0271 or CSE\u00a0369')
  })

  it('level tags', () => {
    expect(levelTag(course('CSE 197'))).toBe('100-level')
    expect(levelTag(course('CSE 311'))).toBe('300-level')
  })
})

describe('level bands', () => {
  it('each level gets its own columns on the full map, including courses with no lines (CSE 480, SOC 225)', async () => {
    const g = buildFullGraph(courseData)
    const { positions } = await layoutFocusGraph(g, { levelBands: true })
    const spans = new Map<number, [number, number]>()
    for (const n of g.nodes) {
      const { x } = positions.get(n.id)!
      const [lo, hi] = spans.get(levelOf(n.id)) ?? [Infinity, -Infinity]
      spans.set(levelOf(n.id), [Math.min(lo, x), Math.max(hi, x + nodeSize(n).width)])
    }
    const ordered = [...spans].sort(([a], [b]) => a - b)
    expect(ordered.map(([level]) => level)).toEqual([1, 2, 3, 4])
    for (let i = 1; i < ordered.length; i++) expect(ordered[i][1][0], `level ${ordered[i][0]}`).toBeGreaterThan(ordered[i - 1][1][1])
  })

  it('no prerequisite line goes from a higher level to a lower one', () => {
    const g = buildFullGraph(courseData)
    for (const e of g.edges) expect(levelOf(e.source), e.id).toBeLessThanOrEqual(levelOf(e.target))
  })
})
