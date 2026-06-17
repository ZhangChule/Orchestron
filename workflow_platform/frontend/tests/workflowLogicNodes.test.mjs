import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createInitialWorkflowState,
  createNodeResultVersion,
} from '../runtime/workflowExecutionCore.js'
import {
  createProcessParameterState,
  executeLogicNode,
} from '../runtime/workflowLogicNodes.js'

test('createProcessParameterState exposes a minimal global machining parameter state', () => {
  const processParameters = createProcessParameterState([
    {
      id: 'virtual-1',
      params: {
        process: {
          axial_depth: '10',
          feed_rate: '48',
          radial_depth: '1.0',
          spindle_speed: '7200',
        },
      },
      type: 'virtual',
    },
  ])

  assert.equal(processParameters.spindle_speed, '7200')
  assert.equal(processParameters.feed_rate, '48')
  assert.equal(processParameters.axial_depth, '10')
  assert.equal(processParameters.radial_depth, '1.0')
  assert.deepEqual(processParameters.machining_coordinate_system, {
    axes: {
      x: [1, 0, 0],
      y: [0, 1, 0],
      z: [0, 0, 1],
    },
    id: 'workpiece',
    origin: [0, 0, 0],
    units: 'mm',
  })
  assert.deepEqual(processParameters.by_node['virtual-1'].process.radial_depth, '1.0')
})

test('createProcessParameterState prefers explicit virtual process base over patched runtime params', () => {
  const processParameters = createProcessParameterState([
    {
      id: 'virtual-1',
      params: {
        process: {
          axial_depth: '10',
          radial_depth: '0.72',
          spindle_speed: '7200',
        },
      },
      processParameterBase: {
        axial_depth: '10',
        radial_depth: '1.0',
        spindle_speed: '7200',
      },
      type: 'virtual',
    },
  ])

  assert.equal(processParameters.radial_depth, '1.0')
  assert.equal(processParameters.by_node['virtual-1'].process.radial_depth, '1.0')
})

test('executeLogicNode continues a linear closed loop when the condition is true', () => {
  const state = createInitialWorkflowState({
    run_id: 'run-a',
    runtime_metrics: { max_wall_error: 0.12 },
    workflow_id: 'workflow-a',
  })

  const output = executeLogicNode({
    id: 'condition-1',
    logicKind: 'condition',
    params: {
      metricPath: 'max_wall_error',
      operator: '>',
      threshold: '0.05',
    },
    type: 'logic',
  }, state)

  assert.equal(output.result.condition_result, true)
  assert.equal(output.result.metric_value, 0.12)
  assert.deepEqual(output.events.map((event) => event.event_type), ['condition_evaluated'])
  assert.equal(output.control.halt_after_node, undefined)
})

test('executeLogicNode stops a linear closed loop when the condition is false', () => {
  const state = createInitialWorkflowState({
    run_id: 'run-a',
    runtime_metrics: { max_wall_error: 0.01 },
    workflow_id: 'workflow-a',
  })

  const output = executeLogicNode({
    id: 'condition-1',
    logicKind: 'condition',
    params: {
      metricPath: 'max_wall_error',
      operator: '>',
      threshold: '0.05',
    },
    type: 'logic',
  }, state)

  assert.equal(output.result.condition_result, false)
  assert.equal(output.state_patch.status, 'stopped')
  assert.deepEqual(output.events.map((event) => event.event_type), ['condition_evaluated', 'run_stopped'])
  assert.equal(output.control.halt_after_node, true)
})

test('executeLogicNode stops a run when convergence tolerance is met', () => {
  const state = createInitialWorkflowState({
    run_id: 'run-a',
    runtime_metrics: { max_wall_error: 0.015 },
    workflow_id: 'workflow-a',
  })

  const output = executeLogicNode({
    id: 'stop-1',
    logicKind: 'stop',
    params: {
      maxIterations: '3',
      metricPath: 'max_wall_error',
      tolerance: '0.02',
    },
    type: 'logic',
  }, state)

  assert.equal(output.result.should_stop, true)
  assert.equal(output.state_patch.status, 'stopped')
  assert.deepEqual(output.events.map((event) => event.event_type), ['run_stopped'])
  assert.equal(output.control.halt_after_node, true)
})

test('executeLogicNode creates a ParameterPatch from a compensation result', () => {
  const state = createInitialWorkflowState({
    node_results: {
      'wtc-1': {
        result: {
          plan: { delta_radial_depth: -0.08 },
          type: 'compensation_plan',
        },
      },
    },
    process_parameters: {
      radial_depth: 1,
    },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const output = executeLogicNode({
    id: 'parameter-update-1',
    logicKind: 'parameter-update',
    params: {
      sourcePath: 'compensation_plan.radial_depth_delta',
      targetPath: 'process_parameters.radial_depth',
      updateMode: 'add',
    },
    type: 'logic',
  }, state)

  assert.equal(output.result.source_value, -0.08)
  assert.equal(output.result.patch.target_path, 'process_parameters.radial_depth')
  assert.equal(output.result.patch.operation, 'add')
  assert.equal(output.result.patch.value, -0.08)
  assert.equal(output.result.patch.created_by_node_id, 'parameter-update-1')
  assert.deepEqual(output.state_patch.parameter_patches, [output.result.patch])
  assert.equal(output.state_patch.process_parameters, undefined)
  assert.deepEqual(output.events.map((event) => event.event_type), ['parameter_patch_created'])
})

test('executeLogicNode scopes a ParameterPatch to downstream virtual machining nodes', () => {
  const state = createInitialWorkflowState({
    node_results: {
      'wtc-1': {
        result: {
          plan: { delta_radial_depth: -0.08 },
          type: 'compensation_plan',
        },
      },
    },
    process_parameters: { radial_depth: 1 },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const output = executeLogicNode({
    id: 'parameter-update-1',
    logicKind: 'parameter-update',
    params: {
      sourcePath: 'compensation_plan.radial_depth_delta',
      targetPath: 'process_parameters.radial_depth',
      updateMode: 'add',
    },
    type: 'logic',
  }, state, {
    edges: [
      { from: 'wtc-1', to: 'parameter-update-1' },
      { from: 'parameter-update-1', to: 'virtual-2' },
      { from: 'parameter-update-1', to: 'condition-2' },
      { from: 'condition-2', to: 'virtual-3' },
    ],
    nodes: [
      { id: 'parameter-update-1', logicKind: 'parameter-update', type: 'logic' },
      { id: 'condition-2', logicKind: 'condition', type: 'logic' },
      { id: 'virtual-2', type: 'virtual' },
      { id: 'virtual-3', type: 'virtual' },
    ],
  })

  assert.deepEqual(output.result.patch.target_virtual_node_ids, ['virtual-2', 'virtual-3'])
  assert.deepEqual(output.events[0].payload.target_virtual_node_ids, ['virtual-2', 'virtual-3'])
})

test('executeLogicNode does not let a ParameterPatch cross a downstream virtual machining base boundary', () => {
  const state = createInitialWorkflowState({
    node_results: {
      'wtc-1': {
        result: {
          plan: { delta_radial_depth: -0.09819326780921608 },
          type: 'compensation_plan',
        },
      },
    },
    process_parameters: { radial_depth: 1 },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const output = executeLogicNode({
    id: 'parameter-update-1',
    logicKind: 'parameter-update',
    params: {
      sourcePath: 'compensation_plan.radial_depth_delta',
      targetPath: 'process_parameters.radial_depth',
      updateMode: 'add',
    },
    type: 'logic',
  }, state, {
    edges: [
      { from: 'wtc-1', to: 'parameter-update-1' },
      { from: 'parameter-update-1', to: 'virtual-2' },
      { from: 'virtual-2', to: 'condition-2' },
      { from: 'condition-2', to: 'parameter-update-2' },
      { from: 'parameter-update-2', to: 'virtual-3' },
    ],
    nodes: [
      { id: 'parameter-update-1', logicKind: 'parameter-update', type: 'logic' },
      { id: 'virtual-2', type: 'virtual' },
      { id: 'condition-2', logicKind: 'condition', type: 'logic' },
      { id: 'parameter-update-2', logicKind: 'parameter-update', type: 'logic' },
      { id: 'virtual-3', type: 'virtual' },
    ],
  })

  assert.deepEqual(output.result.patch.target_virtual_node_ids, ['virtual-2'])
  assert.deepEqual(output.events[0].payload.target_virtual_node_ids, ['virtual-2'])
})

test('executeLogicNode resolves compensation input from the connected upstream branch', () => {
  const state = createInitialWorkflowState({
    node_results: {
      'wtc-a': {
        result: {
          plan: { delta_radial_depth: -0.08 },
          type: 'compensation_plan',
        },
      },
      'wtc-b': {
        result: {
          plan: { delta_radial_depth: -0.2 },
          type: 'compensation_plan',
        },
      },
    },
    process_parameters: { radial_depth: 1 },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const output = executeLogicNode({
    id: 'parameter-update-a',
    logicKind: 'parameter-update',
    params: {
      sourcePath: 'compensation_plan.radial_depth_delta',
      targetPath: 'process_parameters.radial_depth',
      updateMode: 'add',
    },
    type: 'logic',
  }, state, {
    edges: [
      { from: 'wtc-a', to: 'parameter-update-a' },
      { from: 'wtc-b', to: 'parameter-update-b' },
    ],
  })

  assert.equal(output.result.source_value, -0.08)
  assert.equal(output.result.patch.source_result_ref.source, 'node_results.wtc-a.result.plan.delta_radial_depth')
})

test('executeLogicNode pauses for human review and records the prompt', () => {
  const state = createInitialWorkflowState({
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const output = executeLogicNode({
    id: 'review-1',
    logicKind: 'human-review',
    params: {
      approveLabel: 'Approve',
      prompt: 'Check wall error result',
      rejectLabel: 'Reject',
    },
    type: 'logic',
  }, state)

  assert.equal(output.result.prompt, 'Check wall error result')
  assert.equal(output.result.review_status, 'required')
  assert.equal(output.state_patch.status, 'paused')
  assert.deepEqual(output.events.map((event) => event.event_type), ['human_review_required'])
  assert.equal(output.control.halt_after_node, true)
})

test('executeLogicNode stores a supplied human review decision', () => {
  const state = createInitialWorkflowState({
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const output = executeLogicNode({
    id: 'review-1',
    logicKind: 'human-review',
    params: {
      approveLabel: 'Approve',
      prompt: 'Check wall error result',
      rejectLabel: 'Reject',
    },
    type: 'logic',
  }, state, {
    humanReview: () => 'approved',
  })

  assert.equal(output.result.decision, 'approved')
  assert.equal(output.result.review_status, 'reviewed')
  assert.equal(output.state_patch.status, 'paused')
})

test('executeLogicNode blocks condition evaluation when the source result is stale', () => {
  const state = {
    ...createInitialWorkflowState({
      node_results: {
        'virtual-1': {
          result: {
            summary: { max: 0.12 },
            type: 'wall_error',
          },
        },
      },
      run_id: 'run-a',
      workflow_id: 'workflow-a',
    }),
    node_result_versions: [
      createNodeResultVersion({
        node_id: 'virtual-1',
        node_result_version_id: 'result-version-stale',
        stale: true,
        stale_reason: 'virtual node config changed',
      }),
    ],
  }

  assert.throws(
    () => executeLogicNode({
      id: 'condition-1',
      logicKind: 'condition',
      params: {
        metricPath: 'result.summary.max',
        operator: '>',
        threshold: '0.05',
      },
      type: 'logic',
    }, state),
    /stale/i,
  )
})

test('executeLogicNode blocks parameter-update when the compensation result is stale', () => {
  const state = {
    ...createInitialWorkflowState({
      node_results: {
        'wtc-1': {
          result: {
            plan: { delta_radial_depth: -0.08 },
            type: 'compensation_plan',
          },
        },
      },
      process_parameters: { radial_depth: 1 },
      run_id: 'run-a',
      workflow_id: 'workflow-a',
    }),
    node_result_versions: [
      createNodeResultVersion({
        node_id: 'wtc-1',
        node_result_version_id: 'result-version-stale',
        stale: true,
        stale_reason: 'upstream wall-error changed',
      }),
    ],
  }

  assert.throws(
    () => executeLogicNode({
      id: 'parameter-update-1',
      logicKind: 'parameter-update',
      params: {
        sourcePath: 'compensation_plan.radial_depth_delta',
        targetPath: 'process_parameters.radial_depth',
        updateMode: 'add',
      },
      type: 'logic',
    }, state),
    /stale/i,
  )
})
