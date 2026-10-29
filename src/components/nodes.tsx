// Custom React Flow nodes. Each course node is a real <button>, so it is
// focusable and announced by its accessible name. Junction and "other" nodes
// are plain text; the course buttons' names already say "one of".

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

export type CourseNodeData = {
  courseId: string
  title?: string
  selected: boolean
  faded: boolean
  external: boolean
  retired: boolean
  coreq?: string // "Take with one of …"; co-requisites are text, not arrows
  label: string // accessible name
  onSelect: (courseId: string) => void
}
export type JunctionNodeData = { label: string; recommended: boolean; faded: boolean }
export type OtherNodeData = { text: string; recommended: boolean; faded: boolean }

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

const cls = (...names: (string | false)[]) => names.filter(Boolean).join(' ')

export function CourseNode({ data }: NodeProps<CourseFlowNode>) {
  const tag = data.retired ? 'retired' : data.external ? 'outside this map' : null
  return (
    <>
      <Handles />
      <button
        type="button"
        className={cls(
          'course-node',
          data.selected && 'course-node--selected',
          (data.external || data.retired) && 'course-node--external',
          data.faded && 'course-node--faded',
        )}
        aria-label={data.label}
        aria-current={data.selected ? 'true' : undefined}
        onClick={() => data.onSelect(data.courseId)}
      >
        <span className="course-node__id">{data.courseId}</span>
        {data.title && <span className="course-node__title">{data.title}</span>}
        {tag && <span className="course-node__tag">{tag}</span>}
        {data.coreq && <span className="course-node__coreq">{data.coreq}</span>}
      </button>
    </>
  )
}

export function JunctionNode({ data }: NodeProps<JunctionFlowNode>) {
  return (
    <>
      <Handles />
      <div
        className={cls(
          'junction-node',
          data.recommended && 'junction-node--recommended',
          data.faded && 'junction-node--faded',
        )}
      >
        {data.label}
      </div>
    </>
  )
}

export function OtherNode({ data }: NodeProps<OtherFlowNode>) {
  return (
    <>
      <Handles />
      <div className={cls('other-node', data.recommended && 'other-node--recommended', data.faded && 'other-node--faded')}>
        {data.text}
      </div>
    </>
  )
}
