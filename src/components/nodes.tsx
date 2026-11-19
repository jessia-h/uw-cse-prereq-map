// Custom React Flow nodes. Each course node is a real <button>, so it is
// focusable. Its accessible name is short ("CSE 451, Introduction to
// Operating Systems"); requirements, unlocks and notes are its description
// (aria-describedby). Junction ("1 of 2" pills) and "other" nodes are plain
// text; the course descriptions already say "one of".

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Tier } from '../lib/degree.ts'

/**
 * quiet: nothing is selected. path: on the selected course's path (or the
 * focus view). faded: something else is selected.
 */
export type Look = 'quiet' | 'path' | 'faded'

export type CourseNodeData = {
  courseId: string
  title?: string
  selected: boolean
  look: Look
  external: boolean // outside the prototype: non-CSE, or CSE not encoded yet
  nonCse: boolean
  tag: string // "300-level", "Non-CSE", "Not in prototype yet"
  /** Degree lens: the role in the selected degree (stripe + badge), or null in "All" mode. */
  role: { tier: Tier; badge?: string } | null
  /** "All" mode: programs where the course is required ("CS", "DS", "CE"). */
  programs: string[]
  /** Short tags: "Needs CSE 123 or 143", "Co-requisite", "Some prerequisites hidden", … */
  chips: string[]
  /** Filtered out, but shown because it's on the selected course's path. */
  onPathOnly: boolean
  label: string // short accessible name, plus the role when a degree is picked
  description: string // requirements, unlocks, notes: everything else the card says
  onSelect: (courseId: string) => void
}
export type JunctionNodeData = { label: string; recommended: boolean; look: Look }
export type OtherNodeData = { text: string; recommended: boolean; look: Look }

export type CourseFlowNode = Node<CourseNodeData, 'course'>
export type JunctionFlowNode = Node<JunctionNodeData, 'junction'>
export type OtherFlowNode = Node<OtherNodeData, 'other'>
export type NoteFlowNode = Node<{ text: string; width: number }, 'note'>

// Edges attach here: in on the left, out on the right. Hidden; not draggable.
function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} className="flow-handle" />
      <Handle type="source" position={Position.Right} isConnectable={false} className="flow-handle" />
    </>
  )
}

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ')

/**
 * The full title when the card cuts it off, shown on hover and on keyboard
 * focus (WCAG 1.4.13): Escape hides it without moving the pointer or focus,
 * and it stays while the pointer is over it. Decorative for screen readers:
 * the full title is already in the accessible name.
 */
function useTitleTip(titleRef: RefObject<HTMLElement | null>) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [cutOff, setCutOff] = useState(false)
  const measure = () => {
    const t = titleRef.current
    setCutOff(!!t && t.scrollWidth > t.clientWidth)
  }
  const visible = (hovered || focused) && cutOff && !dismissed

  // Escape, wherever focus is: capture it first, so it hides the tip and
  // doesn't also close the course panel.
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setDismissed(true)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [visible])
  return {
    visible,
    wrapper: {
      onMouseEnter: () => (measure(), setHovered(true)),
      // Once both the pointer and focus have left, it can show again next time.
      onMouseLeave: () => (setHovered(false), !focused && setDismissed(false)),
    },
    button: {
      onFocus: () => (measure(), setFocused(true)),
      onBlur: () => (setFocused(false), !hovered && setDismissed(false)),
    },
  }
}

export function CourseNode({ data }: NodeProps<CourseFlowNode>) {
  const tag = <span className="course-node__tag">{data.tag}</span>
  const tier = data.role?.tier
  const titleRef = useRef<HTMLSpanElement>(null)
  const tip = useTitleTip(titleRef)
  const descriptionId = `course-desc-${data.courseId.replaceAll(' ', '')}`
  return (
    // The tip sits inside this wrapper, touching the card, so the pointer can move onto it.
    <div className="course-node-wrap" {...tip.wrapper}>
      <Handles />
      <button
        type="button"
        className={cls(
          'course-node',
          'nopan', // React Flow: pressing a course doesn't start panning the map
          `course-node--${data.look}`,
          data.selected && 'course-node--selected',
          data.nonCse && 'course-node--non-cse',
          tier && `course-node--role-${tier}`, // the stripe on the left edge
          data.onPathOnly && 'course-node--path-only',
        )}
        aria-label={data.label}
        aria-describedby={descriptionId}
        data-course-id={data.courseId} // lets the detail panel return focus here
        aria-current={data.selected ? 'true' : undefined}
        // React Flow sets pointer-events: none on node wrappers when nodes can't
        // be selected or dragged; without this, mouse clicks fall through to the map.
        style={{ pointerEvents: 'auto' }}
        onClick={() => data.onSelect(data.courseId)}
        {...tip.button}
      >
        <span className="course-node__head">
          <span className="course-node__id">{data.courseId}</span>
          {!data.external && tag}
        </span>
        {data.title ? (
          <span className="course-node__title" ref={titleRef}>
            {data.title}
          </span>
        ) : (
          data.external && tag
        )}
        <span className="course-node__chips">
          {data.role?.badge && <span className={`course-node__badge course-node__badge--${tier}`}>{data.role.badge}</span>}
          {data.programs.map((p) => (
            <span key={p} className="course-node__chip course-node__chip--program">
              {p}
            </span>
          ))}
          {data.chips.map((c) => (
            <span key={c} className="course-node__chip">
              {c}
            </span>
          ))}
        </span>
      </button>
      <span id={descriptionId} className="visually-hidden">
        {data.description}
      </span>
      {tip.visible && (
        // pointer-events: React Flow turns them off on node wrappers; the tip must take the pointer to stay open.
        <span className="course-tip" aria-hidden="true" style={{ pointerEvents: 'auto' }}>
          {data.title}
        </span>
      )}
    </div>
  )
}

export function JunctionNode({ data }: NodeProps<JunctionFlowNode>) {
  return (
    <>
      <Handles />
      <div className={cls('junction-node', `junction-node--${data.look}`, data.recommended && 'junction-node--recommended')}>
        {data.label}
      </div>
    </>
  )
}

export function OtherNode({ data }: NodeProps<OtherFlowNode>) {
  return (
    <>
      <Handles />
      <div className={cls('other-node', `other-node--${data.look}`, data.recommended && 'other-node--recommended')}>
        {data.text}
      </div>
    </>
  )
}

/** A text annotation on the map (not a course and not part of the layout). */
export function NoteNode({ data }: NodeProps<NoteFlowNode>) {
  return (
    <p className="map-note" style={{ width: data.width }}>
      {data.text}
    </p>
  )
}

/** A level band behind the full map's columns (decorative). */
export function BandNode({ data }: NodeProps<Node<{ tinted: boolean }, 'band'>>) {
  return <div className={cls('level-band', data.tinted && 'level-band--tinted')} aria-hidden="true" />
}
