// Every color in the app is defined here. Components should reference these
// tokens (or the CSS variables from cssVariables()) instead of hex values.
//
// Contrast ratios are against `background` (#ffffff) unless noted.
// WCAG 2.1 AA: text >= 4.5:1, large text >= 3:1, UI parts (borders, edges,
// arrowheads, focus rings) >= 3:1. theme.test.ts checks these.

export const colors = {
  // Brand
  uwPurple: '#4b2e83', // 10.41:1 — OK for text, borders, edges
  uwGold: '#b7a57a', // 2.42:1 — decoration only; never text or a meaningful line

  // Surfaces
  background: '#ffffff',
  surface: '#f6f5f9', // panels; text/muted text still pass on it (16.03 / 6.45)

  // Text
  text: '#1a1a1a', // 17.40:1
  textMuted: '#595959', // 7.00:1
  textOnPurple: '#ffffff', // 10.41:1 on uwPurple (selected node)
  link: '#4b2e83', // 10.41:1

  // Graph nodes. Cards have a quiet border by default; the selected path gets
  // the purple one. Cards are identified by their text, so the quiet border is
  // decorative (like gold) and isn't held to 3:1.
  cardBorderQuiet: '#d6d3de', // 1.48:1 — decoration only
  nodeBorderCse: '#4b2e83', // 10.41:1 — cards on the selected path
  nodeFillCse: '#ffffff',
  nodeFillSelected: '#4b2e83',
  nodeBorderExternal: '#6b6b6b', // 5.33:1 — grey outline for non-CSE / retired
  nodeFillExternal: '#f2f2f2', // external text: 15.55:1, border: 4.76:1 on this fill

  // Graph edges (meaning is also carried by line style, not color alone)
  edgeRequired: '#4b2e83', // 10.41:1, solid
  edgeOneOf: '#4b2e83', // 10.41:1, dashed
  edgeRecommended: '#6b6b6b', // 5.33:1, dotted

  // Nothing selected: every line is grey and thin. Lines carry meaning, so
  // they stay >= 3:1; quiet comes from width and the absence of color.
  edgeQuiet: '#8c8c8c', // 3.36:1

  // Full map: courses outside the selection. Fill and lines fade; text keeps
  // `text` (17.40:1 on white), and faded lines/borders stay >= 3:1.
  nodeFillFaded: '#ffffff',
  nodeBorderFaded: '#8c8c8c', // 3.36:1
  edgeFaded: '#8c8c8c', // 3.36:1

  // Focus ring: drawn with an offset, so it sits on the page background
  focusRing: '#0050c8', // 7.04:1

  // Conflict / warning callout
  warningText: '#8a4b00', // 6.24:1 on warningFill
  warningFill: '#fff4e0',
  warningBorder: '#8a4b00', // 6.80:1

  // Tags on cards and lines ("300-level", "≥ 2.0"), and the "1 of 2" pills
  tagFill: '#f3f0f8', // text 15.44, muted text 6.21, purple 9.23 on it

  // Degree lens: a stripe on the card's left edge plus a badge. Badge text
  // always says the role, so color never carries it alone. Checked for
  // deuteranopia and protanopia (docs/degree-lens-proposal.md, A4): the three
  // stay distinct; the blue is close to UW purple for those users, so roles
  // use the stripe and badge, and selection uses fill and border.
  roleRequired: '#005a9c', // 7.14:1; 6.18:1 on its tint
  roleRequiredTint: '#e6f0f8',
  roleChoose: '#b04a00', // 5.49:1; 4.82:1 on its tint
  roleChooseTint: '#fbeee4',
  roleElective: '#00756a', // 5.60:1; 4.85:1 on its tint
  roleElectiveTint: '#e3f2ef',

  // Badges (audience) — the badge's text label carries the meaning
  badgeFill: '#e8e3f3',
  badgeText: '#4b2e83', // 8.28:1 on badgeFill
} as const

export type ColorToken = keyof typeof colors

/** Spacing scale in px: --space-1 (4px) … --space-7 (48px). */
export const space = [4, 8, 12, 16, 24, 32, 48] as const

/** Map tokens to CSS custom properties, e.g. uwPurple → --color-uw-purple, space[0] → --space-1. */
export function cssVariables(): Record<string, string> {
  return Object.fromEntries([
    ...Object.entries(colors).map(([name, value]) => [
      `--color-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      value,
    ]),
    ...space.map((px, i) => [`--space-${i + 1}`, `${px}px`]),
  ])
}
