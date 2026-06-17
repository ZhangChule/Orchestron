import test from 'node:test'
import assert from 'node:assert/strict'

import { addWorkflowEdge } from '../runtime/workflowGraph.js'

test('addWorkflowEdge allows multiple inputs and outputs while deduplicating exact edges', () => {
  let edges = []
  edges = addWorkflowEdge(edges, { from: 'virtual-1', to: 'condition-1' })
  edges = addWorkflowEdge(edges, { from: 'virtual-2', to: 'condition-1' })
  edges = addWorkflowEdge(edges, { from: 'virtual-1', to: 'wtc-input-1' })
  edges = addWorkflowEdge(edges, { from: 'virtual-1', to: 'condition-1' })

  assert.deepEqual(edges, [
    { from: 'virtual-1', to: 'condition-1' },
    { from: 'virtual-2', to: 'condition-1' },
    { from: 'virtual-1', to: 'wtc-input-1' },
  ])
})
