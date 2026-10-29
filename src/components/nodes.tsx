// Custom React Flow nodes. Each course node is a real <button>, so it is
// focusable and announced by its accessible name. Junction and "other" nodes
// are plain text; the course buttons' names already say "one of".

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { Role } from '../lib/focusGraph.ts'

export type CourseNodeData = {
  courseId: string
  title?: string
  role: Role
  external: boolean
  retired: boolean
  label: string // accessible name
  onSelect: (courseId: string) => void
}
export type JunctionNodeData = { label: string; recommended: boolean }
export type OtherNodeData = { text: string; recommended: boolean }

export type CourseFlowNode = Node<CourseNodeData, 'course'>
export type JunctionFlowNode = Node<JunctionNodeData, 'junction'>
export type OtherFlowNode = Node<OtherNodeData, 'other'>

// Edges attach here: in on the left, out on the right. Hidden; not draggable.
function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} className="flow-handle" />
      <Handle type="source" position={Position.Right} isConnectable={false} className="flow-handle" />
    </>
  )
}

export function CourseNode({ data }: NodeProps<CourseFlowNode>) {
  const classes = ['course-node']
  if (data.role === 'focus') classes.push('course-node--focus')
  if (data.external || data.retired) classes.push('course-node--external')
  const tag = data.retired ? 'retired' : data.external ? 'outside this map' : null
  return (
    <>
      <Handles />
      <button
        type="button"
        className={classes.join(' ')}
        aria-label={data.label}
        aria-current={data.role === 'focus' ? 'true' : undefined}
        onClick={() => data.onSelect(data.courseId)}
      >
        <span className="course-node__id">{data.courseId}</span>
        {data.title && <span className="course-node__title">{data.title}</span>}
        {tag && <span className="course-node__tag">{tag}</span>}
      </button>
    </>
  )
}

export function JunctionNode({ data }: NodeProps<JunctionFlowNode>) {
  return (
    <>
      <Handles />
      <div className={`junction-node${data.recommended ? ' junction-node--recommended' : ''}`}>{data.label}</div>
    </>
  )
}

export function OtherNode({ data }: NodeProps<OtherFlowNode>) {
  return (
    <>
      <Handles />
      <div className={`other-node${data.recommended ? ' other-node--recommended' : ''}`}>{data.text}</div>
    </>
  )
}
