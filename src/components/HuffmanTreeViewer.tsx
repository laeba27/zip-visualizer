/**
 * Huffman tree viewer — lays the binary tree out into an SVG.
 *
 * We do a simple two-pass layout: assign each leaf an x-slot left-to-right, then
 * set each internal node's x to the average of its children. Depth maps to y.
 * Edges are labelled 0 (left) / 1 (right) so the code for any leaf can be read
 * off by walking root -> leaf.
 */
import { motion } from 'framer-motion'
import type { HuffmanNode } from '../algorithms/types'

interface Placed {
  node: HuffmanNode
  x: number
  y: number
  depth: number
}

interface Edge {
  x1: number
  y1: number
  x2: number
  y2: number
  bit: '0' | '1'
}

const X_GAP = 46
const Y_GAP = 70
const PAD = 28
const NODE_R = 16

function layout(root: HuffmanNode): { nodes: Placed[]; edges: Edge[]; width: number; height: number } {
  const nodes: Placed[] = []
  const edges: Edge[] = []
  let leafCursor = 0
  let maxDepth = 0

  // Post-order so a node's x can be the mean of its (already-placed) children.
  function visit(node: HuffmanNode, depth: number): number {
    maxDepth = Math.max(maxDepth, depth)
    const y = PAD + depth * Y_GAP

    if (!node.left && !node.right) {
      const x = PAD + leafCursor * X_GAP
      leafCursor++
      nodes.push({ node, x, y, depth })
      return x
    }

    const childXs: number[] = []
    let leftX: number | undefined
    let rightX: number | undefined
    if (node.left) {
      leftX = visit(node.left, depth + 1)
      childXs.push(leftX)
    }
    if (node.right) {
      rightX = visit(node.right, depth + 1)
      childXs.push(rightX)
    }
    const x = childXs.reduce((a, b) => a + b, 0) / childXs.length
    nodes.push({ node, x, y, depth })

    if (leftX !== undefined) edges.push({ x1: x, y1: y, x2: leftX, y2: y + Y_GAP, bit: '0' })
    if (rightX !== undefined) edges.push({ x1: x, y1: y, x2: rightX, y2: y + Y_GAP, bit: '1' })
    return x
  }

  visit(root, 0)
  const width = PAD * 2 + Math.max(0, leafCursor - 1) * X_GAP
  const height = PAD * 2 + maxDepth * Y_GAP
  return { nodes, edges, width, height }
}

export function HuffmanTreeViewer({ tree }: { tree: HuffmanNode | null }) {
  if (!tree) {
    return <p className="text-sm text-muted">No tree yet.</p>
  }

  const { nodes, edges, width, height } = layout(tree)

  return (
    <div className="scroll-thin overflow-auto rounded-xl border border-edge bg-surfaceMuted p-3">
      <svg width={Math.max(width, 240)} height={Math.max(height, 120)} className="mx-auto block">
        {edges.map((e, i) => (
          <g key={i}>
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#cbc7e0" strokeWidth={1.5} />
            <text
              x={(e.x1 + e.x2) / 2}
              y={(e.y1 + e.y2) / 2 - 3}
              fill={e.bit === '0' ? '#0284c7' : '#d97706'}
              fontSize={10}
              fontWeight={600}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {e.bit}
            </text>
          </g>
        ))}
        {nodes.map((p, i) => {
          const isLeaf = p.node.symbol !== undefined
          return (
            <motion.g
              key={p.node.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.012 }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={NODE_R}
                fill={isLeaf ? '#e0f2fe' : '#ede9fe'}
                stroke={isLeaf ? '#38bdf8' : '#a78bfa'}
                strokeWidth={1.5}
              />
              <text x={p.x} y={p.y - 1} fill="#3b3a52" fontSize={9} fontWeight={600} textAnchor="middle" fontFamily="monospace">
                {isLeaf ? p.node.label : p.node.weight}
              </text>
              {isLeaf && (
                <text x={p.x} y={p.y + 9} fill="#75728f" fontSize={8} textAnchor="middle" fontFamily="monospace">
                  {p.node.weight}
                </text>
              )}
            </motion.g>
          )
        })}
      </svg>
    </div>
  )
}
