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

  // Graph nodes
  nodeBorderCse: '#4b2e83', // 10.41:1
  nodeFillCse: '#ffffff',
  nodeFillSelected: '#4b2e83',
  nodeBorderExternal: '#6b6b6b', // 5.33:1 — grey outline for non-CSE / retired
  nodeFillExternal: '#f2f2f2', // external text: 15.55:1, border: 4.76:1 on this fill

  // Graph edges (meaning is also carried by line style, not color alone)
  edgeRequired: '#4b2e83', // 10.41:1, solid
  edgeOneOf: '#4b2e83', // 10.41:1, dashed
  edgeRecommended: '#6b6b6b', // 5.33:1, dotted

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

  // Badges (audience) — the badge's text label carries the meaning
  badgeFill: '#e8e3f3',
  badgeText: '#4b2e83', // 8.28:1 on badgeFill
} as const

export type ColorToken = keyof typeof colors

/** Map tokens to CSS custom properties, e.g. uwPurple → --color-uw-purple. */
export function cssVariables(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([name, value]) => [
      `--color-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      value,
    ]),
  )
}
