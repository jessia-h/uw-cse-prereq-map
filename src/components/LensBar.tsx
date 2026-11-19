// "Show my degree" (a segmented control like the view switch) and the
// collapsible Filters panel. Both write to the URL and localStorage through
// App's `onChange`.

import { DEGREES, programData, type Degree } from '../data/programs.ts'
import { DEFAULT_OPTIONS, LEVELS, type MapOptions } from '../hooks/useUrlState.ts'
import { activeFilters, DEGREE_NOTE } from './lens.ts'

const programName = (d: Degree) => programData.programs.find((p) => p.id === d)!.name

export function LensBar(props: {
  options: MapOptions
  onChange: (next: Partial<MapOptions>, how?: { replace?: boolean }) => void
  /** Show the Filters panel (whole map and List view). */
  filters: boolean
  /** "Showing 24 of 46 courses." */
  count: { shown: number; total: number } | null
}) {
  const { options, onChange, filters, count } = props
  const active = activeFilters(options)
  const toggleLevel = (level: (typeof LEVELS)[number], on: boolean) =>
    onChange({ levels: on ? [...options.levels, level] : options.levels.filter((l) => l !== level) }, { replace: true })

  return (
    <div className="lens-bar">
      <div className="lens-bar__degree">
        <span id="degree-label" className="lens-bar__label">
          Show my degree:
        </span>
        <div className="view-switch" role="group" aria-labelledby="degree-label">
          <button type="button" aria-pressed={options.degree === null} onClick={() => onChange({ degree: null })}>
            All
          </button>
          {DEGREES.map((d) => (
            <button key={d} type="button" aria-pressed={options.degree === d} onClick={() => onChange({ degree: d })}>
              {programName(d)}
            </button>
          ))}
        </div>
        <p className="lens-bar__note">{DEGREE_NOTE}</p>
      </div>

      {filters && (
        <details
          className="filters"
          // A dropdown on wide screens: Escape closes it (and only it) and returns to its summary.
          onKeyDown={(e) => {
            const details = e.currentTarget
            if (e.key !== 'Escape' || !details.open) return
            e.stopPropagation()
            details.open = false
            details.querySelector('summary')?.focus()
          }}
        >
          <summary>
            Filters{active > 0 && ` (${active} on)`}
          </summary>
          <div className="filters__body">
            <fieldset>
              <legend>Level</legend>
              {LEVELS.map((level) => (
                <label key={level}>
                  <input
                    type="checkbox"
                    checked={options.levels.includes(level)}
                    onChange={(e) => toggleLevel(level, e.target.checked)}
                  />{' '}
                  {level}
                </label>
              ))}
            </fieldset>
            {options.degree && (
              <label>
                <input
                  type="checkbox"
                  checked={options.hideUnused}
                  onChange={(e) => onChange({ hideUnused: e.target.checked }, { replace: true })}
                />{' '}
                Hide courses not used in my degree
              </label>
            )}
            <label>
              <input
                type="checkbox"
                checked={options.hideNonCse}
                onChange={(e) => onChange({ hideNonCse: e.target.checked }, { replace: true })}
              />{' '}
              Hide non-CSE courses
            </label>
            <label>
              <input
                type="checkbox"
                checked={options.simplify}
                onChange={(e) => onChange({ simplify: e.target.checked }, { replace: true })}
              />{' '}
              Simplify intro-course lines
            </label>
            <p className="filters__status" role="status">
              {count && `Showing ${count.shown} of ${count.total} courses.`}
            </p>
            <button
              type="button"
              className="link-button"
              onClick={() => onChange({ ...DEFAULT_OPTIONS, degree: options.degree }, { replace: true })}
            >
              Reset filters
            </button>
          </div>
        </details>
      )}
    </div>
  )
}
