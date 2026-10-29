// Key for the graph. Each line sample is drawn with the same dash pattern as
// the real edges, and every entry says what it means in words.

import { colors } from '../theme.ts'

function Line({ stroke, dash, width = 2 }: { stroke: string; dash?: string; width?: number }) {
  return (
    <svg width="40" height="10" aria-hidden="true" className="legend__swatch">
      <line x1="2" y1="5" x2="38" y2="5" stroke={stroke} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  )
}

export function Legend({ showRecommended, highlighting }: { showRecommended: boolean; highlighting?: boolean }) {
  return (
    <section className="legend" aria-labelledby="legend-heading">
      <h3 id="legend-heading">Key</h3>
      <ul>
        <li>
          <Line stroke={colors.edgeRequired} /> Solid line: required
        </li>
        <li>
          <Line stroke={colors.edgeOneOf} dash="8 5" /> Dashed line into a “one of N” box: any one of those options
        </li>
        {showRecommended && (
          <li>
            <Line stroke={colors.edgeRecommended} dash="2 5" /> Dotted line: recommended, not required
          </li>
        )}
        <li>
          <span className="legend__text-sample" aria-hidden="true">
            ≥ 2.0
          </span>{' '}
          on a line: minimum grade needed in that course
        </li>
        <li>
          <span className="legend__text-sample" aria-hidden="true">
            Take with …
          </span>{' '}
          on a course: co-requisite, shown as text instead of a line
        </li>
        <li>
          <span className="legend__node" aria-hidden="true" /> CSE course in this map
        </li>
        <li>
          <span className="legend__node legend__node--external" aria-hidden="true" /> Grey box labeled “outside this
          map” or “retired”
        </li>
        {highlighting && (
          <li>
            <span className="legend__node legend__node--selected" aria-hidden="true" />
            <Line stroke={colors.edgeRequired} width={3} />
            <Line stroke={colors.edgeFaded} width={1.5} /> When a course is selected: it is filled in; its
            prerequisites (left) and the courses it directly unlocks (right) keep thick, full-strength lines; everything
            else turns thin and grey
          </li>
        )}
      </ul>
    </section>
  )
}
