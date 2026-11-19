import { describe, expect, it } from 'vitest'
import { contrastRatio } from './lib/contrast.ts'
import { colors as c, cssVariables } from './theme.ts'

const TEXT = 4.5
const UI = 3

// [foreground, background, minimum ratio, what it's used for]
const pairs: [string, string, number, string][] = [
  [c.text, c.background, TEXT, 'body text'],
  [c.text, c.surface, TEXT, 'text on panel'],
  [c.textMuted, c.background, TEXT, 'muted text'],
  [c.textMuted, c.surface, TEXT, 'muted text on panel'],
  [c.link, c.background, TEXT, 'links'],
  [c.textOnPurple, c.nodeFillSelected, TEXT, 'selected node label'],
  [c.text, c.nodeFillExternal, TEXT, 'external node label'],
  [c.nodeBorderCse, c.background, UI, 'CSE node border'],
  [c.nodeBorderExternal, c.background, UI, 'external node border'],
  [c.nodeBorderExternal, c.nodeFillExternal, UI, 'external border vs its fill'],
  [c.edgeRequired, c.background, UI, 'required edge'],
  [c.edgeOneOf, c.background, UI, 'one-of edge'],
  [c.edgeRecommended, c.background, UI, 'recommended edge'],
  [c.focusRing, c.background, UI, 'focus ring'],
  [c.text, c.nodeFillFaded, TEXT, 'faded node text'],
  [c.textMuted, c.nodeFillFaded, TEXT, 'faded node tag text'],
  [c.nodeBorderFaded, c.background, UI, 'faded node border'],
  [c.edgeFaded, c.background, UI, 'faded edge'],
  [c.warningText, c.warningFill, TEXT, 'conflict text'],
  [c.warningBorder, c.background, UI, 'conflict border'],
  [c.badgeText, c.badgeFill, TEXT, 'audience badge'],
  [c.edgeQuiet, c.background, UI, 'quiet edge (nothing selected) and pill border'],
  [c.text, c.tagFill, TEXT, 'text on tags, chips, and the panel answer'],
  [c.textMuted, c.tagFill, TEXT, 'level tag and grade tag text'],
  [c.uwPurple, c.tagFill, TEXT, 'close buttons on tag fill'],
  [c.nodeBorderExternal, c.background, UI, 'search box border'],
  [c.roleRequired, c.background, UI, 'Required stripe'],
  [c.roleChoose, c.background, UI, 'Choose-from-a-list stripe'],
  [c.roleElective, c.background, UI, 'Core/Elective stripe'],
  [c.roleRequired, c.roleRequiredTint, TEXT, 'Required badge'],
  [c.roleChoose, c.roleChooseTint, TEXT, 'Choose-from-a-list badge'],
  [c.roleElective, c.roleElectiveTint, TEXT, 'Core/Elective badge'],
  [c.text, c.surface, TEXT, 'level heading on a tinted band'],
]

describe('theme contrast (WCAG 2.1 AA)', () => {
  it.each(pairs)('%s on %s ≥ %d:1 (%s)', (fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min)
  })

  it('UW gold is too light for text on white', () => {
    expect(contrastRatio(c.uwGold, c.background)).toBeLessThan(UI)
  })

  // Decorative: cards and chips are identified by their text, and cards on
  // the selected path get the purple border. Never use it for a line.
  it('the quiet card border is decoration only', () => {
    expect(contrastRatio(c.cardBorderQuiet, c.background)).toBeLessThan(UI)
  })
})

describe('cssVariables', () => {
  it('converts camelCase token names to kebab-case custom properties', () => {
    expect(cssVariables()['--color-uw-purple']).toBe(c.uwPurple)
    expect(cssVariables()['--color-node-fill-external']).toBe(c.nodeFillExternal)
    expect(cssVariables()['--space-1']).toBe('4px')
    expect(cssVariables()['--space-7']).toBe('48px')
  })
})
