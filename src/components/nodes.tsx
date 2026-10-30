// Custom React Flow nodes. Each course node is a real <button>, so it is
// focusable and announced by its accessible name. Junction ("1 of 2" pills)
// and "other" nodes are plain text; the course buttons' names already say "one of".

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

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
  extra?: string // "Take with one of …" (co-requisites are text, not arrows), or a retired-prerequisite note
  label: string // accessible name
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

const cls = (...names: (string | false)[]) => names.filter(Boolean).join(' ')

export function CourseNode({ data }: NodeProps<CourseFlowNode>) {
  const tag = <span className="course-node__tag">{data.tag}</span>
  return (
    <>
      <Handles />
      <button
        type="button"
        className={cls(
          'course-node',
          'nopan', // React Flow: pressing a course doesn't start panning the map
          `course-node--${data.look}`,
          data.selected && 'course-node--selected',
          data.nonCse && 'course-node--non-cse',
        )}
        aria-label={data.label}
        data-course-id={data.courseId} // lets the detail panel return focus here
        aria-current={data.selected ? 'true' : undefined}
        // React Flow sets pointer-events: none on node wrappers when nodes can't
        // be selected or dragged; without this, mouse clicks fall through to the map.
        style={{ pointerEvents: 'auto' }}
        onClick={() => data.onSelect(data.courseId)}
      >
        <span className="course-node__head">
          <span className="course-node__id">{data.courseId}</span>
          {!data.external && tag}
        </span>
        {data.title && <span className="course-node__title">{data.title}</span>}
        {data.external && tag}
        {data.extra && <span className="course-node__extra">{data.extra}</span>}
      </button>
    </>
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
