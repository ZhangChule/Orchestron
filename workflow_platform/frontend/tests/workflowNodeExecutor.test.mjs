import test from 'node:test'
import assert from 'node:assert/strict'

import { createInitialWorkflowState } from '../runtime/workflowExecutionCore.js'
import { executeNode } from '../runtime/workflowNodeExecutor.js'

test('executeNode runs a mapped block and records node lifecycle plus result state', async () => {
  const node = {
    data: null,
    id: 'virtual-1',
    lastResponse: null,
    type: 'virtual',
  }
  const initialState = createInitialWorkflowState({
    now: () => '2026-06-15T00:00:00.000Z',
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const output = await executeNode(node, initialState, {
    runners: {
      virtualMachiningWallErrorPrediction: async (receivedNode) => {
        receivedNode.data = {
          summary: { max: 0.12 },
          type: 'wall_error',
          wallErrorPoints: [{ error: 0.12 }, { error: -0.04 }],
        }
        receivedNode.lastResponse = {
          result: { points: receivedNode.data.wallErrorPoints, summary: receivedNode.data.summary },
          status: 'succeeded',
        }
      },
    },
  })

  assert.equal(output.result.block_id, 'virtual-machining.wall-error-prediction')
  assert.deepEqual(output.state.event_log.map((event) => event.event_type), ['node_started', 'base_version_created', 'result_version_created', 'node_completed'])
  assert.equal(output.state.event_log[0].node_id, 'virtual-1')
  assert.equal(output.state.event_log[1].payload.base_version_id, output.state.parameter_base_versions[0].base_version_id)
  assert.equal(output.state.event_log[2].payload.node_result_version_id, output.state.node_result_versions[0].node_result_version_id)
  assert.equal(output.state.event_log[3].payload.block_id, 'virtual-machining.wall-error-prediction')
  assert.equal(output.state.node_results['virtual-1'].block_id, 'virtual-machining.wall-error-prediction')
  assert.equal(output.state.node_results['virtual-1'].result_version.stale, false)
  assert.equal(output.state.node_result_versions[0].node_id, 'virtual-1')
  assert.equal(output.state.node_result_versions[0].execution_index, 1)
  assert.equal(output.state.node_result_versions[0].node_run_id, `run-a:virtual-1:1`)
  assert.equal(output.state.node_result_versions[0].parameter_base_version_id, output.state.parameter_base_versions[0].base_version_id)
  assert.equal(JSON.parse(output.state.node_result_versions[0].input_fingerprint).block_id, 'virtual-machining.wall-error-prediction')
  assert.deepEqual(output.state.runtime_metrics, {
    max_wall_error: 0.12,
    mean_wall_error: 0.08,
  })
})

test('executeNode freezes a virtual machining base and applies pending patches before calling the runner', async () => {
  const node = {
    data: null,
    id: 'virtual-2',
    lastResponse: null,
    type: 'virtual',
  }
  const initialState = {
    ...createInitialWorkflowState({
      process_parameters: { radial_depth: 1, spindle_speed: 7200 },
      run_id: 'run-a',
      workflow_id: 'workflow-a',
    }),
    parameter_patches: [{
      created_at: '2026-06-16T00:00:00.000Z',
      created_by_node_id: 'parameter-update-1',
      operation: 'add',
      patch_id: 'patch-1',
      source_result_ref: { node_id: 'wtc-1' },
      target_path: 'process_parameters.radial_depth',
      value: -0.08,
    }],
  }
  let receivedProcessParameters = null

  const output = await executeNode(node, initialState, {
    base_version_id: () => 'base-2',
    runners: {
      virtualMachiningWallErrorPrediction: async (receivedNode, workflowState) => {
        receivedProcessParameters = workflowState.process_parameters
        receivedNode.data = { type: 'wall_error', wallErrorPoints: [] }
        receivedNode.lastResponse = { result: { points: [] }, status: 'succeeded' }
      },
    },
  })

  assert.deepEqual(receivedProcessParameters, { radial_depth: 0.92, spindle_speed: 7200 })
  assert.deepEqual(output.state.parameter_base_versions[0], {
    base_version_id: 'base-2',
    coordinate_system: null,
    created_at: output.state.parameter_base_versions[0].created_at,
    description: 'Frozen process parameters for virtual node virtual-2',
    parameters: { radial_depth: 0.92, spindle_speed: 7200 },
    run_id: 'run-a',
    source_patch_ids: ['patch-1'],
    virtual_node_id: 'virtual-2',
  })
  assert.deepEqual(output.state.parameter_base_versions[0].source_patch_ids, ['patch-1'])
  assert.deepEqual(output.state.event_log.map((event) => event.event_type), [
    'node_started',
    'parameter_patch_applied',
    'base_version_created',
    'result_version_created',
    'node_completed',
  ])
})

test('executeNode reuses a fresh parameter patch when selected virtual machining freezes a new base', async () => {
  const node = {
    data: null,
    id: 'virtual-2',
    lastResponse: null,
    processParameterBase: {
      radial_depth: 1,
      spindle_speed: 7200,
    },
    params: {
      process: {
        radial_depth: 1,
        spindle_speed: 7200,
      },
    },
    type: 'virtual',
  }
  const initialState = {
    ...createInitialWorkflowState({
      process_parameters: { radial_depth: 1, spindle_speed: 7200 },
      run_id: 'run-a',
      workflow_id: 'workflow-a',
    }),
    parameter_patches: [{
      created_at: '2026-06-16T00:00:00.000Z',
      created_by_node_id: 'parameter-update-1',
      operation: 'add',
      patch_id: 'patch-1',
      source_result_ref: { node_id: 'wtc-1' },
      target_path: 'process_parameters.radial_depth',
      target_virtual_node_ids: ['virtual-2'],
      value: -0.08,
    }],
    parameter_base_versions: [{
      base_version_id: 'base-old',
      parameters: { radial_depth: 0.92, spindle_speed: 7200 },
      source_patch_ids: ['patch-1'],
      virtual_node_id: 'virtual-2',
    }],
  }
  let receivedProcessParameters = null

  const output = await executeNode(node, initialState, {
    base_version_id: () => 'base-new',
    runners: {
      virtualMachiningWallErrorPrediction: async (receivedNode, workflowState) => {
        receivedProcessParameters = workflowState.process_parameters
        receivedNode.data = { type: 'wall_error', wallErrorPoints: [] }
        receivedNode.lastResponse = { result: { points: [] }, status: 'succeeded' }
      },
    },
  })

  assert.equal(receivedProcessParameters.radial_depth, 0.92)
  assert.equal(receivedProcessParameters.spindle_speed, 7200)
  assert.deepEqual(receivedProcessParameters.by_node['virtual-2'].process, {
    radial_depth: 1,
    spindle_speed: 7200,
  })
  assert.deepEqual(output.state.parameter_patches[0], initialState.parameter_patches[0])
  assert.deepEqual(
    output.state.parameter_base_versions.find((base) => base.base_version_id === 'base-new').source_patch_ids,
    ['patch-1'],
  )
})

test('executeNode falls back to an existing node runner when no block maps', async () => {
  const node = {
    data: null,
    id: 'legacy-1',
    lastResponse: null,
    type: 'legacy-process',
  }
  const initialState = createInitialWorkflowState({ run_id: 'run-a', workflow_id: 'workflow-a' })

  const output = await executeNode(node, initialState, {
    fallback: async (receivedNode) => {
      receivedNode.data = { message: 'legacy result', type: 'legacy_result' }
      receivedNode.lastResponse = { result: receivedNode.data, status: 'succeeded' }
    },
  })

  assert.equal(output.result.block_id, null)
  assert.equal(output.result.ok, true)
  assert.deepEqual(output.result.raw_response, { result: { message: 'legacy result', type: 'legacy_result' }, status: 'succeeded' })
  assert.deepEqual(output.state.event_log.map((event) => event.event_type), ['node_started', 'result_version_created', 'node_completed'])
  assert.deepEqual(output.state.node_results['legacy-1'].result, { message: 'legacy result', type: 'legacy_result' })
})

test('executeNode runs a LogicNode without calling process or virtual runners', async () => {
  const node = {
    id: 'condition-1',
    logicKind: 'condition',
    params: {
      metricPath: 'max_wall_error',
      operator: '>',
      threshold: '0.05',
    },
    type: 'logic',
  }
  const initialState = createInitialWorkflowState({
    run_id: 'run-a',
    runtime_metrics: { max_wall_error: 0.12 },
    workflow_id: 'workflow-a',
  })

  const output = await executeNode(node, initialState)

  assert.equal(output.result.logic_kind, 'condition')
  assert.equal(output.result.result.condition_result, true)
  assert.deepEqual(output.state.event_log.map((event) => event.event_type), [
    'node_started',
    'condition_evaluated',
    'result_version_created',
    'node_completed',
  ])
  assert.equal(output.state.node_results['condition-1'].result.condition_result, true)
})

test('executeNode increments node result execution indexes on repeated runs', async () => {
  const node = {
    data: { message: 'legacy result', type: 'legacy_result' },
    id: 'legacy-1',
    type: 'legacy-process',
  }
  const initialState = createInitialWorkflowState({ run_id: 'run-a', workflow_id: 'workflow-a' })
  const first = await executeNode(node, initialState, {
    fallback: async () => ({ result: { value: 1, type: 'legacy_result' } }),
  })
  const second = await executeNode(node, first.state, {
    fallback: async () => ({ result: { value: 2, type: 'legacy_result' } }),
  })

  assert.deepEqual(second.state.node_result_versions.map((item) => item.execution_index), [1, 2])
  assert.deepEqual(second.state.node_result_versions.map((item) => item.node_run_id), [
    'run-a:legacy-1:1',
    'run-a:legacy-1:2',
  ])
})

test('executeNode blocks wall-thickness compensation when its connected wall-error result is stale', async () => {
  const node = {
    id: 'wtc-1',
    processKind: 'wall-thickness-compensation',
    type: 'process',
  }
  const initialState = {
    ...createInitialWorkflowState({
      node_results: {
        'virtual-1': {
          result: { type: 'wall_error', wallErrorPoints: [{ error: 0.1 }] },
        },
      },
      run_id: 'run-a',
      workflow_id: 'workflow-a',
    }),
    node_result_versions: [{
      created_at: '2026-06-16T00:00:00.000Z',
      execution_index: 1,
      input_fingerprint: '{}',
      node_id: 'virtual-1',
      node_result_version_id: 'result-version-stale',
      node_run_id: 'run-a:virtual-1:1',
      parameter_base_version_id: 'base-1',
      raw_response_ref: 'node_results.virtual-1.raw_response',
      result_summary: { type: 'wall_error' },
      stale: true,
      stale_reason: 'node config changed',
    }],
  }
  let called = false

  await assert.rejects(
    async () => executeNode(node, initialState, {
      edges: [
        { from: 'virtual-1', to: 'wtc-1' },
      ],
      runners: {
        wallThicknessCompensation: async () => {
          called = true
        },
      },
    }),
    /stale/i,
  )

  assert.equal(called, false)
})

test('executeNode records node_failed and exposes the failed state before rethrowing', async () => {
  const node = {
    id: 'wtc-1',
    processKind: 'wall-thickness-compensation',
    type: 'process',
  }
  const initialState = createInitialWorkflowState({ run_id: 'run-a', workflow_id: 'workflow-a' })

  await assert.rejects(
    async () => executeNode(node, initialState, {
      runners: {
        wallThicknessCompensation: async () => {
          throw new Error('backend unavailable')
        },
      },
    }),
    (error) => {
      assert.equal(error.name, 'NodeExecutionError')
      assert.equal(error.node_id, 'wtc-1')
      assert.deepEqual(error.workflowState.event_log.map((event) => event.event_type), ['node_started', 'node_failed'])
      assert.equal(error.workflowState.event_log[1].payload.error, 'backend unavailable')
      return true
    },
  )
})
