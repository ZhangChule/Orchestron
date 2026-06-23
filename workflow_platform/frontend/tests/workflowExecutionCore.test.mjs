import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addNodeResultVersion,
  addParameterPatch,
  addProcessParameterBaseVersion,
  applyPendingPatchesToCandidateParameters,
  appendExecutionEvent,
  createNodeInputFingerprint,
  createExecutionEvent,
  createInitialWorkflowState,
  createNodeResultVersion,
  createParameterPatch,
  createProcessParameterBaseVersion,
  exportWorkflowState,
  findLatestBaseVersionForNode,
  findLatestNodeResultVersion,
  findNodeResultVersions,
  findPatchesForBase,
  freezeProcessParameterBaseForVirtualNode,
  getNodeResult,
  markNodeAndDirectDownstreamResultsStale,
  nextExecutionIndexForNode,
  recordNodeResult,
  updateWorkflowState,
} from '../runtime/workflowExecutionCore.js'

test('createInitialWorkflowState returns the requested minimal WorkflowState shape', () => {
  const state = createInitialWorkflowState({
    now: () => '2026-06-13T00:00:00.000Z',
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  assert.deepEqual(state, {
    created_at: '2026-06-13T00:00:00.000Z',
    event_log: [],
    initial_process_parameter_base: {},
    node_context: {},
    node_results: {},
    node_result_versions: [],
    parameter_base_versions: [],
    parameter_patches: [],
    process_parameters: {},
    run_history: [],
    run_id: 'run-a',
    runtime_metrics: {},
    status: 'idle',
    updated_at: '2026-06-13T00:00:00.000Z',
    visualization_sessions: [],
    workflow_id: 'workflow-a',
    workpiece_state: {},
  })
})

test('createInitialWorkflowState records an explicit initial process parameter base', () => {
  const state = createInitialWorkflowState({
    initial_process_parameter_base: {
      feed_rate: '48',
      radial_depth: '1.0',
      spindle_speed: '7200',
    },
    process_parameters: {
      feed_rate: '48',
      radial_depth: '1.0',
      spindle_speed: '7200',
    },
  })

  state.process_parameters.radial_depth = '0.8'

  assert.deepEqual(state.initial_process_parameter_base, {
    feed_rate: '48',
    radial_depth: '1.0',
    spindle_speed: '7200',
  })
})

test('dataflow alignment constructors create minimal versioned records without mutating inputs', () => {
  const parameters = {
    axial_depth: 0.2,
    feed_rate: 800,
    radial_depth: 0.1,
    spindle_speed: 12000,
  }

  const base = createProcessParameterBaseVersion({
    base_version_id: 'base-1',
    coordinate_system: { frame: 'workpiece' },
    description: 'initial virtual machining base',
    parameters,
    run_id: 'run-a',
    source_patch_ids: ['patch-0'],
    virtual_node_id: 'virtual-1',
    now: () => '2026-06-16T00:00:00.000Z',
  })
  parameters.spindle_speed = 9000

  assert.deepEqual(base, {
    base_version_id: 'base-1',
    coordinate_system: { frame: 'workpiece' },
    created_at: '2026-06-16T00:00:00.000Z',
    description: 'initial virtual machining base',
    parameters: {
      axial_depth: 0.2,
      feed_rate: 800,
      radial_depth: 0.1,
      spindle_speed: 12000,
    },
    run_id: 'run-a',
    source_patch_ids: ['patch-0'],
    virtual_node_id: 'virtual-1',
  })

  assert.deepEqual(createParameterPatch({
    created_by_node_id: 'logic-1',
    now: () => '2026-06-16T00:00:01.000Z',
    operation: 'add',
    patch_id: 'patch-1',
    source_result_ref: { node_id: 'wtc-1', result_key: 'compensation_plan' },
    target_path: 'parameters.radial_depth',
    value: 0.01,
  }), {
    created_at: '2026-06-16T00:00:01.000Z',
    created_by_node_id: 'logic-1',
    operation: 'add',
    patch_id: 'patch-1',
    source_result_ref: { node_id: 'wtc-1', result_key: 'compensation_plan' },
    target_path: 'parameters.radial_depth',
    value: 0.01,
  })

  assert.deepEqual(createNodeResultVersion({
    created_at: '2026-06-16T00:00:02.000Z',
    execution_index: 2,
    input_fingerprint: 'fingerprint-a',
    node_id: 'virtual-2',
    node_result_version_id: 'result-version-1',
    node_run_id: 'node-run-1',
    parameter_base_version_id: 'base-2',
    raw_response_ref: 'node_results.virtual-2.raw_response',
    result_summary: { max_wall_error: 0.08 },
    stale: true,
  }), {
    created_at: '2026-06-16T00:00:02.000Z',
    execution_index: 2,
    input_fingerprint: 'fingerprint-a',
    node_id: 'virtual-2',
    node_result_version_id: 'result-version-1',
    node_run_id: 'node-run-1',
    parameter_base_version_id: 'base-2',
    raw_response_ref: 'node_results.virtual-2.raw_response',
    result_summary: { max_wall_error: 0.08 },
    stale: true,
  })
})

test('dataflow alignment add/find helpers preserve immutable state updates', () => {
  const state = createInitialWorkflowState({
    now: () => '2026-06-16T00:00:00.000Z',
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })
  const base1 = createProcessParameterBaseVersion({
    base_version_id: 'base-1',
    created_at: '2026-06-16T00:00:01.000Z',
    parameters: { radial_depth: 0.1 },
    run_id: 'run-a',
    virtual_node_id: 'virtual-1',
  })
  const base2 = createProcessParameterBaseVersion({
    base_version_id: 'base-2',
    created_at: '2026-06-16T00:00:02.000Z',
    parameters: { radial_depth: 0.2 },
    run_id: 'run-a',
    source_patch_ids: ['patch-1'],
    virtual_node_id: 'virtual-1',
  })
  const patch = createParameterPatch({
    patch_id: 'patch-1',
    target_path: 'parameters.radial_depth',
    value: 0.01,
  })
  const resultVersion = createNodeResultVersion({
    node_id: 'virtual-1',
    node_result_version_id: 'result-version-1',
  })

  const withBase1 = addProcessParameterBaseVersion(state, base1)
  const withBase2 = addProcessParameterBaseVersion(withBase1, base2)
  const withPatch = addParameterPatch(withBase2, patch)
  const withResultVersion = addNodeResultVersion(withPatch, resultVersion)

  assert.deepEqual(state.parameter_base_versions, [])
  assert.equal(findLatestBaseVersionForNode(withResultVersion, 'virtual-1').base_version_id, 'base-2')
  assert.deepEqual(findPatchesForBase(withResultVersion, 'base-2').map((item) => item.patch_id), ['patch-1'])
  assert.deepEqual(findNodeResultVersions(withResultVersion, 'virtual-1').map((item) => item.node_result_version_id), ['result-version-1'])
})

test('result version helpers create stable input fingerprints and execution indexes', () => {
  const state = {
    ...createInitialWorkflowState({
      node_result_versions: [
        createNodeResultVersion({
          execution_index: 1,
          node_id: 'virtual-1',
          node_result_version_id: 'result-version-1',
        }),
      ],
      parameter_patches: [
        createParameterPatch({
          operation: 'add',
          patch_id: 'patch-1',
          target_path: 'process_parameters.radial_depth',
          value: 0.01,
        }),
      ],
      process_parameters: { radial_depth: 1, spindle_speed: 7200 },
      run_id: 'run-a',
      workflow_id: 'workflow-a',
      workpiece_state: { result_type: 'wall_error', source_node_id: 'virtual-1' },
    }),
  }
  const node = {
    id: 'virtual-2',
    params: {
      model_version: 'v1.0',
      process: { radial_depth: 1 },
    },
    type: 'virtual',
  }

  const fingerprint = createNodeInputFingerprint(node, state, {
    block_id: 'virtual-machining.wall-error-prediction',
    block_version: '0.1.0',
    parameter_base_version_id: 'base-2',
  })
  const parsed = JSON.parse(fingerprint)

  assert.equal(nextExecutionIndexForNode(state, 'virtual-1'), 2)
  assert.equal(findLatestNodeResultVersion(state, 'virtual-1').node_result_version_id, 'result-version-1')
  assert.equal(parsed.block_id, 'virtual-machining.wall-error-prediction')
  assert.equal(parsed.block_version, '0.1.0')
  assert.equal(parsed.parameter_base_version_id, 'base-2')
  assert.deepEqual(parsed.node.config.params.process, { radial_depth: 1 })
  assert.deepEqual(parsed.parameter_patch_ids, ['patch-1'])
  assert.deepEqual(parsed.process_parameters, { radial_depth: 1, spindle_speed: 7200 })
  assert.deepEqual(parsed.workpiece_state, { result_type: 'wall_error', source_node_id: 'virtual-1' })
})

test('markNodeAndDirectDownstreamResultsStale marks changed nodes and direct downstream results', () => {
  const state = {
    ...createInitialWorkflowState({
      run_id: 'run-a',
      workflow_id: 'workflow-a',
    }),
    node_result_versions: [
      createNodeResultVersion({
        node_id: 'virtual-1',
        node_result_version_id: 'result-version-vm',
        stale: false,
      }),
      createNodeResultVersion({
        node_id: 'condition-1',
        node_result_version_id: 'result-version-condition',
        stale: false,
      }),
      createNodeResultVersion({
        node_id: 'wtc-1',
        node_result_version_id: 'result-version-wtc',
        stale: false,
      }),
    ],
  }

  const next = markNodeAndDirectDownstreamResultsStale(
    state,
    ['virtual-1'],
    [
      { from: 'virtual-1', to: 'condition-1' },
      { from: 'condition-1', to: 'wtc-1' },
    ],
    'node config changed',
    { now: () => '2026-06-16T00:00:00.000Z' },
  )

  assert.equal(state.node_result_versions[0].stale, false)
  assert.equal(next.node_result_versions.find((item) => item.node_id === 'virtual-1').stale, true)
  assert.equal(next.node_result_versions.find((item) => item.node_id === 'condition-1').stale, true)
  assert.equal(next.node_result_versions.find((item) => item.node_id === 'wtc-1').stale, false)
  assert.equal(next.node_result_versions.find((item) => item.node_id === 'virtual-1').stale_reason, 'node config changed')
  assert.deepEqual(next.event_log.map((event) => event.event_type), ['result_marked_stale', 'result_marked_stale'])
  assert.equal(next.event_log[0].payload.node_result_version_id, 'result-version-vm')
})

test('applyPendingPatchesToCandidateParameters uses base source_patch_ids for idempotence', () => {
  const state = createInitialWorkflowState({
    process_parameters: { axial_depth: 2, radial_depth: 1 },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })
  const patch = createParameterPatch({
    operation: 'add',
    patch_id: 'patch-1',
    target_path: 'process_parameters.radial_depth',
    value: 0.2,
  })
  const withPatch = addParameterPatch(state, patch)

  const first = applyPendingPatchesToCandidateParameters(withPatch, {
    base_version_id: 'base-1',
  })
  const second = applyPendingPatchesToCandidateParameters({
    ...withPatch,
    parameter_base_versions: [
      createProcessParameterBaseVersion({
        base_version_id: 'base-1',
        source_patch_ids: ['patch-1'],
      }),
    ],
  }, {
    base_version_id: 'base-1',
  })

  assert.deepEqual(first.parameters, { axial_depth: 2, radial_depth: 1.2 })
  assert.deepEqual(first.parameter_patches[0], patch)
  assert.deepEqual(first.events.map((event) => event.event_type), ['parameter_patch_applied'])
  assert.deepEqual(second.parameters, { axial_depth: 2, radial_depth: 1 })
  assert.deepEqual(second.events.map((event) => event.event_type), ['parameter_patch_skipped'])
  assert.equal(second.events[0].payload.skip_reason, 'patch already applied to base')
})

test('applyPendingPatchesToCandidateParameters reuses an immutable patch for a new virtual base', () => {
  const state = addParameterPatch(createInitialWorkflowState({
    parameter_base_versions: [
      createProcessParameterBaseVersion({
        base_version_id: 'base-old',
        source_patch_ids: ['patch-1'],
        virtual_node_id: 'virtual-2',
      }),
    ],
    process_parameters: { radial_depth: 1 },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  }), createParameterPatch({
    operation: 'add',
    patch_id: 'patch-1',
    target_path: 'process_parameters.radial_depth',
    target_virtual_node_ids: ['virtual-2'],
    value: -0.08,
  }))

  const output = applyPendingPatchesToCandidateParameters(state, {
    base_version_id: 'base-new',
    virtual_node_id: 'virtual-2',
  })

  assert.deepEqual(output.parameters, { radial_depth: 0.92 })
  assert.deepEqual(output.parameter_patches[0], state.parameter_patches[0])
  assert.deepEqual(output.applied_patch_ids, ['patch-1'])
  assert.deepEqual(output.events.map((event) => event.event_type), ['parameter_patch_applied'])
})

test('applyPendingPatchesToCandidateParameters does not reuse a patch on the same virtual base', () => {
  const state = addParameterPatch(createInitialWorkflowState({
    parameter_base_versions: [
      createProcessParameterBaseVersion({
        base_version_id: 'base-2',
        source_patch_ids: ['patch-1'],
        virtual_node_id: 'virtual-2',
      }),
    ],
    process_parameters: { radial_depth: 1 },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  }), createParameterPatch({
    operation: 'add',
    patch_id: 'patch-1',
    target_path: 'process_parameters.radial_depth',
    target_virtual_node_ids: ['virtual-2'],
    value: -0.08,
  }))

  const output = applyPendingPatchesToCandidateParameters(state, {
    base_version_id: 'base-2',
    virtual_node_id: 'virtual-2',
  })

  assert.deepEqual(output.parameters, { radial_depth: 1 })
  assert.deepEqual(output.applied_patch_ids, [])
  assert.equal(output.events[0].event_type, 'parameter_patch_skipped')
  assert.equal(output.events[0].payload.skip_reason, 'patch already applied to base')
})

test('applyPendingPatchesToCandidateParameters applies scoped patches only to their target virtual node', () => {
  const state = addParameterPatch(createInitialWorkflowState({
    process_parameters: { radial_depth: 1 },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  }), createParameterPatch({
    operation: 'add',
    patch_id: 'patch-v2',
    target_path: 'process_parameters.radial_depth',
    target_virtual_node_ids: ['virtual-2'],
    value: -0.1,
  }))

  const virtual1 = applyPendingPatchesToCandidateParameters(state, {
    base_version_id: 'base-1',
    virtual_node_id: 'virtual-1',
  })
  const virtual2 = applyPendingPatchesToCandidateParameters(state, {
    base_version_id: 'base-2',
    virtual_node_id: 'virtual-2',
  })

  assert.deepEqual(virtual1.parameters, { radial_depth: 1 })
  assert.deepEqual(virtual1.parameter_patches[0], state.parameter_patches[0])
  assert.equal(virtual1.events[0].event_type, 'parameter_patch_skipped')
  assert.equal(virtual1.events[0].payload.skip_reason, 'patch targets another virtual node')
  assert.deepEqual(virtual2.parameters, { radial_depth: 0.9 })
  assert.deepEqual(virtual2.parameter_patches[0], state.parameter_patches[0])
})

test('applyPendingPatchesToCandidateParameters ignores superseded patches from the same parameter-update node', () => {
  const withOldPatch = addParameterPatch(createInitialWorkflowState({
    process_parameters: { radial_depth: 1 },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  }), createParameterPatch({
    created_by_node_id: 'parameter-update-1',
    operation: 'add',
    patch_id: 'patch-old',
    target_path: 'process_parameters.radial_depth',
    target_virtual_node_ids: ['virtual-2'],
    value: -0.08,
  }))
  const state = addParameterPatch(withOldPatch, createParameterPatch({
    created_by_node_id: 'parameter-update-1',
    operation: 'add',
    patch_id: 'patch-new',
    target_path: 'process_parameters.radial_depth',
    target_virtual_node_ids: ['virtual-2'],
    value: -0.03,
  }))

  const output = applyPendingPatchesToCandidateParameters(state, {
    base_version_id: 'base-2',
    virtual_node_id: 'virtual-2',
  })

  assert.deepEqual(output.parameters, { radial_depth: 0.97 })
  assert.deepEqual(output.applied_patch_ids, ['patch-new'])
  assert.deepEqual(output.parameter_patches.map((patch) => patch.patch_id), ['patch-old', 'patch-new'])
  assert.deepEqual(output.events.map((event) => event.event_type), [
    'parameter_patch_skipped',
    'parameter_patch_applied',
  ])
  assert.equal(output.events[0].payload.patch_id, 'patch-old')
  assert.equal(output.events[0].payload.skip_reason, 'patch superseded by newer patch from same update node')
})

test('applyPendingPatchesToCandidateParameters rejects over-broad patch targets across virtual base boundaries', () => {
  const withOverBroadPatch = addParameterPatch(createInitialWorkflowState({
    process_parameters: { radial_depth: 1 },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  }), createParameterPatch({
    created_by_node_id: 'parameter-update-5',
    operation: 'add',
    patch_id: 'patch-overbroad',
    target_path: 'process_parameters.radial_depth',
    target_virtual_node_ids: ['virtual-machining-3', 'virtual-machining-11'],
    value: -0.09819326780921608,
  }))
  const state = addParameterPatch(withOverBroadPatch, createParameterPatch({
    created_by_node_id: 'parameter-update-10',
    operation: 'add',
    patch_id: 'patch-local',
    target_path: 'process_parameters.radial_depth',
    target_virtual_node_ids: ['virtual-machining-11'],
    value: -0.09110084238181718,
  }))

  const output = applyPendingPatchesToCandidateParameters(state, {
    base_version_id: 'base-virtual-11',
    edges: [
      { from: 'parameter-update-5', to: 'virtual-machining-3' },
      { from: 'virtual-machining-3', to: 'condition-8' },
      { from: 'condition-8', to: 'parameter-update-10' },
      { from: 'parameter-update-10', to: 'virtual-machining-11' },
    ],
    nodes: [
      { id: 'parameter-update-5', logicKind: 'parameter-update', type: 'logic' },
      { id: 'virtual-machining-3', type: 'virtual' },
      { id: 'condition-8', logicKind: 'condition', type: 'logic' },
      { id: 'parameter-update-10', logicKind: 'parameter-update', type: 'logic' },
      { id: 'virtual-machining-11', type: 'virtual' },
    ],
    virtual_node_id: 'virtual-machining-11',
  })

  assert.deepEqual(output.parameters, { radial_depth: 0.9088991576181829 })
  assert.deepEqual(output.applied_patch_ids, ['patch-local'])
  assert.equal(output.events[0].payload.patch_id, 'patch-overbroad')
  assert.equal(output.events[0].payload.skip_reason, 'patch crosses another virtual machining base boundary')
})

test('freezeProcessParameterBaseForVirtualNode records a base and applied patch relationship', () => {
  const state = addParameterPatch(createInitialWorkflowState({
    process_parameters: { radial_depth: 1 },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  }), createParameterPatch({
    operation: 'add',
    patch_id: 'patch-1',
    target_path: 'process_parameters.radial_depth',
    value: -0.08,
  }))

  const output = freezeProcessParameterBaseForVirtualNode(state, {
    id: 'virtual-2',
    type: 'virtual',
  }, {
    base_version_id: () => 'base-2',
    now: () => '2026-06-16T00:00:00.000Z',
  })

  assert.equal(output.baseVersion.base_version_id, 'base-2')
  assert.deepEqual(output.baseVersion.parameters, { radial_depth: 0.92 })
  assert.deepEqual(output.baseVersion.source_patch_ids, ['patch-1'])
  assert.equal(output.state.parameter_base_versions[0].base_version_id, 'base-2')
  assert.deepEqual(output.state.parameter_patches[0], state.parameter_patches[0])
  assert.deepEqual(output.events.map((event) => event.event_type), [
    'parameter_patch_applied',
    'base_version_created',
  ])
})

test('freezeProcessParameterBaseForVirtualNode uses the selected virtual node base before applying patches', () => {
  const state = createInitialWorkflowState({
    process_parameters: {
      by_node: {
        'virtual-1': { process: { feed_rate: '48', radial_depth: '1.0', spindle_speed: '7200' } },
        'virtual-2': { process: { feed_rate: '36', radial_depth: '0.6', spindle_speed: '6000' } },
      },
      feed_rate: '36',
      radial_depth: '0.6',
      spindle_speed: '6000',
    },
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const output = freezeProcessParameterBaseForVirtualNode(state, {
    id: 'virtual-1',
    params: {
      process: {
        feed_rate: '48',
        radial_depth: '1.0',
        spindle_speed: '7200',
      },
    },
    processParameterBase: {
      feed_rate: '48',
      radial_depth: '1.0',
      spindle_speed: '7200',
    },
    type: 'virtual',
  }, {
    base_version_id: () => 'base-virtual-1',
    now: () => '2026-06-16T00:00:00.000Z',
  })

  assert.equal(output.baseVersion.parameters.radial_depth, '1.0')
  assert.equal(output.baseVersion.parameters.feed_rate, '48')
  assert.equal(output.baseVersion.parameters.spindle_speed, '7200')
})

test('createExecutionEvent and appendExecutionEvent use the requested event fields', () => {
  const state = createInitialWorkflowState({
    now: () => '2026-06-13T00:00:00.000Z',
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })
  const event = createExecutionEvent({
    data_after_ref: 'state:after',
    data_before_ref: 'state:before',
    event_id: 'event-1',
    event_type: 'node_started',
    node_id: 'virtual-1',
    node_type: 'virtual',
    payload: { apiBase: '/api/virtual-machining' },
    run_id: 'run-a',
    summary: 'Virtual machining started',
    timestamp: '2026-06-13T00:00:01.000Z',
  })

  const next = appendExecutionEvent(state, event)

  assert.equal(state.event_log.length, 0)
  assert.equal(next.updated_at, '2026-06-13T00:00:01.000Z')
  assert.deepEqual(next.event_log, [
    {
      base_version_after: null,
      base_version_before: null,
      data_after_ref: 'state:after',
      data_before_ref: 'state:before',
      event_id: 'event-1',
      event_sequence: 1,
      event_type: 'node_started',
      execution_index: null,
      node_id: 'virtual-1',
      node_label: 'virtual-1',
      node_run_id: null,
      node_type: 'virtual',
      patch_ids: [],
      payload: { apiBase: '/api/virtual-machining' },
      result_version_id: null,
      run_id: 'run-a',
      skip_reason: null,
      state_change_summary: 'Virtual machining started',
      summary: 'Virtual machining started',
      timestamp: '2026-06-13T00:00:01.000Z',
    },
  ])
})

test('updateWorkflowState applies a patch and records a state_updated event', () => {
  const state = createInitialWorkflowState({
    now: () => '2026-06-13T00:00:00.000Z',
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const next = updateWorkflowState(
    state,
    { status: 'running', runtime_metrics: { max_wall_error: 0.12 } },
    'run started',
    {
      event_id: () => 'event-2',
      now: () => '2026-06-13T00:00:02.000Z',
    },
  )

  assert.equal(state.status, 'idle')
  assert.equal(next.status, 'running')
  assert.deepEqual(next.runtime_metrics, { max_wall_error: 0.12 })
  assert.equal(next.event_log[0].event_type, 'state_updated')
  assert.equal(next.event_log[0].summary, 'run started')
})

test('recordNodeResult stores node output and derived metrics without mutating previous state', () => {
  const state = createInitialWorkflowState({
    now: () => '2026-06-13T00:00:00.000Z',
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const next = recordNodeResult(
    state,
    'virtual-1',
    { summary: { max: 0.12 }, type: 'wall_error' },
    { max_wall_error: 0.12 },
    { now: () => '2026-06-13T00:00:03.000Z' },
  )

  assert.deepEqual(state.node_results, {})
  assert.deepEqual(next.node_results, {
    'virtual-1': { summary: { max: 0.12 }, type: 'wall_error' },
  })
  assert.deepEqual(next.runtime_metrics, { max_wall_error: 0.12 })
  assert.deepEqual(getNodeResult(next, 'virtual-1'), { summary: { max: 0.12 }, type: 'wall_error' })
  assert.equal(next.updated_at, '2026-06-13T00:00:03.000Z')
})

test('exportWorkflowState returns a deep JSON-safe snapshot', () => {
  const state = createInitialWorkflowState({
    now: () => '2026-06-13T00:00:00.000Z',
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })
  const snapshot = exportWorkflowState(state)

  snapshot.node_results.virtual = { type: 'mutated' }

  assert.deepEqual(state.node_results, {})
  assert.equal(snapshot.run_id, 'run-a')
})
