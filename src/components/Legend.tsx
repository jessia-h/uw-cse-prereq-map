// Key for the graph: four items, each with a small sample drawn like the real
// thing and a short label that carries the meaning. Everything else is in
// the "How to read this map" dialog.

import { useRef } from 'react'
import { colors } from '../theme.ts'

/** A short line with an arrowhead, in the quiet (nothing selected) style. */
export function LineSample({ dash, width = 40 }: { dash?: string; width?: number }) {
  return (
    <svg width={width} height="12" aria-hidden="true" className="legend__swatch">
      <line x1="1" y1="6" x2={width - 7} y2="6" stroke={colors.edgeQuiet} strokeWidth="1.5" strokeDasharray={dash} />
      <path d={`M ${width - 8} 2 L ${width - 1} 6 L ${width - 8} 10 Z`} fill={colors.edgeQuiet} />
    </svg>
  )
}

/** Two dashed lines meeting at a "1 of 2" pill. */
function ChooseOneSample() {
  return (
    <span className="legend__choose" aria-hidden="true">
      <svg width="22" height="24" className="legend__swatch">
        <path d="M 1 3 H 8 V 12 H 21 M 1 21 H 8 V 12" fill="none" stroke={colors.edgeQuiet} strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
      <span className="legend__pill">1 of 2</span>
    </span>
  )
}

function HowToRead() {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  const open = () => {
    dialog.current?.showModal()
    heading.current?.focus()
  }
  const close = () => {
    dialog.current?.close()
    trigger.current?.focus()
  }

  return (
    <>
      {/* A button, not a link: it opens a dialog rather than going somewhere. */}
      <button ref={trigger} type="button" className="link-button legend__help" onClick={open}>
        How to read this map
      </button>
      <dialog
        ref={dialog}
        className="help-dialog"
        aria-labelledby="help-heading"
        // Escape closes only the dialog; stopping it here keeps App's Escape
        // handler from also closing the course panel.
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return
          e.preventDefault()
          e.stopPropagation()
          close()
        }}
      >
        <h2 id="help-heading" ref={heading} tabIndex={-1}>
          How to read this map
        </h2>
        <h3>Lines and cards</h3>
        <ul>
          <li>Prerequisites are on the left; the courses they lead to are on the right. Arrows point to the course that needs them.</li>
          <li>Solid line: required.</li>
          <li>Dashed lines that meet at a “1 of 2” pill: any one of those courses is enough.</li>
          <li>“≥ 2.0” on a line: the minimum grade needed in that course.</li>
          <li>Grey card marked “Non-CSE”: a course from another department. A white card marked “Not in prototype yet”: a CSE course this prototype doesn’t include yet.</li>
          <li>“Take with …” on a card: a co-requisite, written on the card instead of drawn as a line.</li>
          <li>Show recommended courses: adds dotted lines for courses the catalog recommends but doesn’t require.</li>
          <li>Retired courses aren’t shown. Each course’s “Official catalog wording” still quotes the catalog exactly.</li>
        </ul>
        <h3>Selecting a course</h3>
        <p>
          The course turns purple, along with everything it requires and the courses it directly unlocks. Everything
          else turns grey. Its details open in a panel.
        </p>
        <h3>Keyboard</h3>
        <ul>
          <li>Tab to a course. Left arrow: a prerequisite. Right arrow: a course it unlocks. Up and down arrows: nearby courses.</li>
          <li>Enter: open its details. Escape: close them.</li>
          <li>“/”: jump to search.</li>
        </ul>
        <button type="button" className="help-dialog__close" onClick={close}>
          Close
        </button>
      </dialog>
    </>
  )
}

export function Legend() {
  return (
    <section className="legend" aria-labelledby="legend-heading">
      <h2 id="legend-heading" className="visually-hidden">
        Key
      </h2>
      <ul className="legend__items">
        <li>
          <LineSample /> Required
        </li>
        <li>
          <ChooseOneSample /> Choose one
        </li>
        <li>
          <span className="legend__grade" aria-hidden="true">
            ≥ 2.0
          </span>{' '}
          Minimum grade
        </li>
        <li>
          <span className="legend__card" aria-hidden="true" /> Non-CSE course
        </li>
      </ul>
      <p className="legend__hint">Select a course to see what it needs and what it unlocks.</p>
      <HowToRead />
    </section>
  )
}
