import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BLOCK_DEFINITIONS,
  blockDefinitionForNode,
  blockIdForNode,
  executeBlock,
} from '../runtime/workflowBlockAdapters.js'

test('BLOCK_DEFINITIONS describe current executable blocks without becoming a registry loader', () => {
  assert.deepEqual(Object.keys(BLOCK_DEFINITIONS), [
    'virtual-machining.wall-error-prediction',
    'process-app.wall-thickness-compensation',
    'process-app.arppl',
  ])

  for (const definition of Object.values(BLOCK_DEFINITIONS)) {
    assert.equal(typeof definition.block_id, 'string')
    assert.match(definition.block_type, /^(virtual-machining|process-app)$/)
    assert.equal(typeof definition.display_name, 'string')
    assert.equal(typeof definition.version, 'string')
    assert.equal(typeof definition.endpoint, 'string')
    assert.equal(typeof definition.input_mapper, 'string')
    assert.equal(typeof definition.output_mapper, 'string')
    assert.equal(definition.existing_behavior_preserved, true)
  }
})

test('blockIdForNode maps existing node shapes to lightweight block ids', () => {
  assert.equal(blockIdForNode({ type: 'virtual' }), 'virtual-machining.wall-error-prediction')
  assert.equal(
    blockIdForNode({ processKind: 'wall-thickness-compensation', type: 'process' }),
    'process-app.wall-thickness-compensation',
  )
  assert.equal(blockIdForNode({ processKind: 'arppl', type: 'process' }), 'process-app.arppl')
  assert.equal(blockIdForNode({ type: 'logic' }), null)
})

test('blockDefinitionForNode returns the matching block definition', () => {
  const definition = blockDefinitionForNode({ processKind: 'wall-thickness-compensation', type: 'process' })

  assert.equal(definition.block_id, 'process-app.wall-thickness-compensation')
  assert.equal(definition.endpoint, '/workflow/run')
})

test('executeBlock calls the mapped existing runner and returns a uniform adapter envelope', async () => {
  const node = {
    data: {
      summary: { max: 0.12 },
      type: 'wall_error',
      wallErrorPoints: [{ error: 0.12 }, { error: -0.04 }],
    },
    id: 'virtual-1',
    lastResponse: {
      result: { points: [{ error: 0.12 }, { error: -0.04 }], summary: { max: 0.12 } },
      status: 'succeeded',
    },
    type: 'virtual',
  }
  const calls = []

  const output = await executeBlock(
    'virtual-machining.wall-error-prediction',
    { run_id: 'run-a' },
    node,
    {
      runners: {
        virtualMachiningWallErrorPrediction: async (receivedNode, receivedState) => {
          calls.push({ nodeId: receivedNode.id, runId: receivedState.run_id })
        },
      },
    },
  )

  assert.deepEqual(calls, [{ nodeId: 'virtual-1', runId: 'run-a' }])
  assert.equal(output.ok, true)
  assert.equal(output.block_id, 'virtual-machining.wall-error-prediction')
  assert.deepEqual(output.raw_response, node.lastResponse)
  assert.deepEqual(output.result, {
    summary: { max: 0.12 },
    type: 'wall_error',
    wallErrorPoints: [{ error: 0.12 }, { error: -0.04 }],
  })
  assert.deepEqual(output.derived_metrics, {
    max_wall_error: 0.12,
    mean_wall_error: 0.08,
  })
  assert.deepEqual(output.state_patch, {
    node_results: {
      'virtual-1': output.result,
    },
    runtime_metrics: output.derived_metrics,
    workpiece_state: {
      result_type: 'wall_error',
      source_node_id: 'virtual-1',
    },
  })
  assert.deepEqual(output.events, [])
})

test('executeBlock rejects unknown or non-executable blocks', async () => {
  await assert.rejects(
    () => executeBlock('missing-block', {}, { id: 'node-1' }, { runners: {} }),
    /Unknown block definition/,
  )
})
