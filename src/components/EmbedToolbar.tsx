// The embedded map's controls (WordPress): one row with search, the degree,
// the view switch (wide screens only), and an Options button. Options opens
// a panel with the filters, "Show recommended courses", and the key.

import { useRef, useState, type ReactNode } from 'react'
import { DEGREES, programData, type Degree } from '../data/programs.ts'
import type { MapOptions, View } from '../hooks/useUrlState.ts'
import { FilterFields } from './LensBar.tsx'
import { activeFilters, DEGREE_NOTE } from './lens.ts'
import { SearchBox } from './SearchBox.tsx'
import { ViewSwitch } from './ViewSwitch.tsx'

export function EmbedToolbar(props: {
  options: MapOptions
  onChange: (next: Partial<MapOptions>, how?: { replace?: boolean }) => void
  count: { shown: number; total: number } | null
  onSelect: (id: string) => void
  /** null: List only (narrow screens), so no view switch. */
  view: View | null
  onView: (view: View) => void
  /** Extra controls for the map views: "Show recommended courses" and the key. */
  mapOptions?: ReactNode
}) {
  const { options, onChange, count, onSelect, view, onView, mapOptions } = props
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const active = activeFilters(options)

  return (
    <div className="embed-bar">
      <div className="embed-bar__row">
        <SearchBox onSelect={onSelect} />
        <label className="embed-bar__degree">
          Degree{' '}
          <select
            value={options.degree ?? ''}
            onChange={(e) => onChange({ degree: (e.target.value || null) as Degree | null })}
          >
            <option value="">All</option>
            {DEGREES.map((d) => (
              <option key={d} value={d}>
                {programData.programs.find((p) => p.id === d)!.name}
              </option>
            ))}
          </select>
        </label>
        {view && <ViewSwitch view={view} onChange={onView} />}
        <button
          ref={button}
          type="button"
          className="embed-bar__options"
          aria-expanded={open}
          aria-controls="map-options"
          onClick={() => setOpen(!open)}
        >
          Options{active > 0 && ` (${active} on)`}
        </button>
      </div>
      {options.degree && <p className="embed-bar__note">{DEGREE_NOTE}</p>}
      <div
        id="map-options"
        className="options-panel"
        role="group"
        aria-label="Map options"
        hidden={!open}
        // Escape closes the panel (and only the panel) and returns to its button.
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return
          e.stopPropagation()
          setOpen(false)
          button.current?.focus()
        }}
      >
        <div className="options-panel__filters">
          <FilterFields options={options} onChange={onChange} count={count} />
        </div>
        {mapOptions}
      </div>
    </div>
  )
}
