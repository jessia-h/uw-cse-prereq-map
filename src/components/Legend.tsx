// Key for the graph. Each line sample is drawn with the same dash pattern as
// the real edges, and every entry has a text label.

import { colors } from '../theme.ts'

function Line({ stroke, dash }: { stroke: string; dash?: string }) {
  return (
    <svg width="40" height="10" aria-hidden="true" className="legend__swatch">
      <line x1="2" y1="5" x2="38" y2="5" stroke={stroke} strokeWidth="2" strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  )
}

export function Legend({ showRecommended }: { showRecommended: boolean }) {
  return (
    <section className="legend" aria-labelledby="legend-heading">
      <h3 id="legend-heading">Key</h3>
      <ul>
        <li>
          <Line stroke={colors.edgeRequired} /> Required
        </li>
        <li>
          <Line stroke={colors.edgeOneOf} dash="8 5" /> One option in a “one of” group
        </li>
        {showRecommended && (
          <li>
            <Line stroke={colors.edgeRecommended} dash="2 5" /> Recommended, not required
          </li>
        )}
        <li>
          <span className="legend__node" aria-hidden="true" /> CSE course in this map
        </li>
        <li>
          <span className="legend__node legend__node--external" aria-hidden="true" /> Outside this map, or retired
          (labeled)
        </li>
      </ul>
    </section>
  )
}
