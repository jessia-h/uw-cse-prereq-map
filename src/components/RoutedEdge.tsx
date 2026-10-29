// Draws an edge along the route elk computed (orthogonal, around nodes),
// with slightly rounded corners. Falls back to React Flow's curve if elk
// gave no route.

import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'
import type { Point } from '../lib/layout.ts'

export type RoutedFlowEdge = Edge<{ points: Point[] }, 'routed'>

const RADIUS = 8

function roundedPath(points: Point[]): string {
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const [prev, at, next] = [points[i - 1], points[i], points[i + 1]]
    // Shorten each corner by up to RADIUS on both sides, then curve through it.
    const r = Math.min(RADIUS, Math.hypot(at.x - prev.x, at.y - prev.y) / 2, Math.hypot(next.x - at.x, next.y - at.y) / 2)
    const toward = (from: Point, to: Point) => {
      const len = Math.hypot(to.x - from.x, to.y - from.y) || 1
      return { x: from.x + ((to.x - from.x) / len) * r, y: from.y + ((to.y - from.y) / len) * r }
    }
    const a = toward(at, prev)
    const b = toward(at, next)
    d += ` L ${a.x} ${a.y} Q ${at.x} ${at.y} ${b.x} ${b.y}`
  }
  const last = points[points.length - 1]
  return `${d} L ${last.x} ${last.y}`
}

export function RoutedEdge(props: EdgeProps<RoutedFlowEdge>) {
  const points = props.data?.points ?? []
  const path =
    points.length >= 2
      ? roundedPath(points)
      : getBezierPath({
          sourceX: props.sourceX,
          sourceY: props.sourceY,
          sourcePosition: props.sourcePosition,
          targetX: props.targetX,
          targetY: props.targetY,
          targetPosition: props.targetPosition,
        })[0]
  return <BaseEdge path={path} style={props.style} markerEnd={props.markerEnd} />
}
