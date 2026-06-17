import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveUpstreamNodeResultOfType } from '../runtime/workflowResultResolution.js'

test('resolveUpstreamNodeResultOfType reads the result connected to the consumer branch', () => {
  const workflowState = {
    node_results: {
      'virtual-a': {
        result: {
          type: 'wall_error',
          wallErrorPoints: [{ id: 'a', error: 0.1 }],
        },
      },
      'virtual-b': {
        result: {
          type: 'wall_error',
          wallErrorPoints: [{ id: 'b', error: 0.2 }],
        },
      },
    },
  }
  const edges = [
    { from: 'virtual-a', to: 'wtc-a-input' },
    { from: 'wtc-a-input', to: 'wtc-a-process' },
    { from: 'virtual-b', to: 'wtc-b-input' },
    { from: 'wtc-b-input', to: 'wtc-b-process' },
  ]

  const result = resolveUpstreamNodeResultOfType(workflowState, 'wall_error', {
    consumerNodeId: 'wtc-a-process',
    edges,
  })

  assert.equal(result.nodeId, 'virtual-a')
  assert.equal(result.result.wallErrorPoints[0].id, 'a')
})

test('resolveUpstreamNodeResultOfType does not fall back to unrelated latest results in strict edge mode', () => {
  const workflowState = {
    node_results: {
      'virtual-b': {
        result: {
          type: 'wall_error',
          wallErrorPoints: [{ id: 'b', error: 0.2 }],
        },
      },
    },
  }
  const edges = [
    { from: 'virtual-a', to: 'wtc-a-input' },
    { from: 'wtc-a-input', to: 'wtc-a-process' },
    { from: 'virtual-b', to: 'wtc-b-input' },
    { from: 'wtc-b-input', to: 'wtc-b-process' },
  ]

  const result = resolveUpstreamNodeResultOfType(workflowState, 'wall_error', {
    consumerNodeId: 'wtc-a-process',
    edges,
  })

  assert.equal(result, null)
})
