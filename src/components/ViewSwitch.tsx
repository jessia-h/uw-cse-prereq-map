import type { View } from '../hooks/useUrlState.ts'

/** "Whole map / Just this course / List": a segmented control; aria-pressed marks the current view. */
export function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const options: { value: View; label: string }[] = [
    { value: 'map', label: 'Whole map' },
    { value: 'focus', label: 'Just this course' },
    { value: 'list', label: 'List' },
  ]
  return (
    <div className="view-switch" role="group" aria-label="View">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={view === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
