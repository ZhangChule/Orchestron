import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createInitialWorkflowState,
  createNodeResultVersion,
} from '../runtime/workflowExecutionCore.js'
import {
  RUN_MODES,
  createRunStartedEvent,
  executableNodesForRunMode,
  prepareWorkflowStateForRunMode,
  staleUpstreamNodeIdsForSelected,
} from '../runtime/workflowRunModes.js'

const nodes = [
  { id: 'virtual-1', type: 'virtual' },
  { id: 'condition-1', logicKind: 'condition', type: 'logic' },
  { id: 'wtc-1', processKind: 'wall-thickness-compensation', type: 'process' },
  { id: 'parameter-update-1', logicKind: 'parameter-update', type: 'logic' },
  { id: 'virtual-2', type: 'virtual' },
  { id: 'stop-1', logicKind: 'stop', type: 'logic' },
]

const edges = [
  { from: 'virtual-1', to: 'condition-1' },
  { from: 'condition-1', to: 'wtc-1' },
  { from: 'wtc-1', to: 'parameter-update-1' },
  { from: 'parameter-update-1', to: 'virtual-2' },
  { from: 'virtual-2', to: 'stop-1' },
]

test('executableNodesForRunMode returns all executable nodes for run all', () => {
  const runnable = executableNodesForRunMode({
    edges,
    mode: RUN_MODES.RUN_ALL,
    nodes,
  })

  assert.deepEqual(runnable.map((node) => node.id), [
    'virtual-1',
    'condition-1',
    'wtc-1',
    'parameter-update-1',
    'virtual-2',
    'stop-1',
  ])
})

test('executableNodesForRunMode runs only the selected node when upstream dependencies are reusable', () => {
  const workflowState = createInitialWorkflowState({
    node_result_versions: [
      createNodeResultVersion({ node_id: 'virtual-1', node_result_version_id: 'result-vm-1', stale: false }),
      createNodeResultVersion({ node_id: 'condition-1', node_result_version_id: 'result-condition-1', stale: false }),
    ],
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const runnable = executableNodesForRunMode({
    edges,
    mode: RUN_MODES.RUN_FROM_SELECTED,
    nodes,
    selectedNodeId: 'wtc-1',
    workflowState,
  })

  assert.deepEqual(runnable.map((node) => node.id), [
    'wtc-1',
  ])
})

test('executableNodesForRunMode expands run from selected to stale upstream results', () => {
  const workflowState = createInitialWorkflowState({
    node_result_versions: [
      createNodeResultVersion({
        node_id: 'virtual-1',
        node_result_version_id: 'result-virtual-stale',
        stale: true,
        stale_reason: 'virtual machining parameters changed',
      }),
    ],
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const runnable = executableNodesForRunMode({
    edges,
    mode: RUN_MODES.RUN_FROM_SELECTED,
    nodes,
    selectedNodeId: 'wtc-1',
    workflowState,
  })

  assert.deepEqual(staleUpstreamNodeIdsForSelected(workflowState, 'wtc-1', edges), ['virtual-1'])
  assert.deepEqual(runnable.map((node) => node.id), [
    'virtual-1',
    'condition-1',
    'wtc-1',
  ])
})

test('executableNodesForRunMode expands run from selected to unexecuted upstream dependencies', () => {
  const workflowState = createInitialWorkflowState({
    node_result_versions: [
      createNodeResultVersion({ node_id: 'virtual-1', node_result_version_id: 'result-vm-1', stale: false }),
      createNodeResultVersion({ node_id: 'condition-1', node_result_version_id: 'result-condition-1', stale: false }),
    ],
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const runnable = executableNodesForRunMode({
    edges,
    mode: RUN_MODES.RUN_FROM_SELECTED,
    nodes,
    selectedNodeId: 'virtual-2',
    workflowState,
  })

  assert.deepEqual(runnable.map((node) => node.id), [
    'wtc-1',
    'parameter-update-1',
    'virtual-2',
  ])
})

test('executableNodesForRunMode stops at the selected node after reusing fresh upstream results', () => {
  const workflowState = createInitialWorkflowState({
    node_result_versions: [
      createNodeResultVersion({ node_id: 'virtual-1', node_result_version_id: 'result-vm-1', stale: false }),
      createNodeResultVersion({ node_id: 'condition-1', node_result_version_id: 'result-condition-1', stale: false }),
      createNodeResultVersion({ node_id: 'wtc-1', node_result_version_id: 'result-wtc-1', stale: false }),
      createNodeResultVersion({ node_id: 'parameter-update-1', node_result_version_id: 'result-update-1', stale: false }),
    ],
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const runnable = executableNodesForRunMode({
    edges,
    mode: RUN_MODES.RUN_FROM_SELECTED,
    nodes,
    selectedNodeId: 'virtual-2',
    workflowState,
  })

  assert.deepEqual(runnable.map((node) => node.id), [
    'virtual-2',
  ])
})

test('executableNodesForRunMode reruns stale upstream and stops at the selected virtual node', () => {
  const workflowState = createInitialWorkflowState({
    node_result_versions: [
      createNodeResultVersion({
        node_id: 'virtual-1',
        node_result_version_id: 'result-virtual-stale',
        stale: true,
        stale_reason: 'virtual machining parameters changed',
      }),
    ],
    run_id: 'run-a',
    workflow_id: 'workflow-a',
  })

  const runnable = executableNodesForRunMode({
    edges,
    mode: RUN_MODES.RUN_FROM_SELECTED,
    nodes,
    selectedNodeId: 'virtual-2',
    workflowState,
  })

  assert.deepEqual(runnable.map((node) => node.id), [
    'virtual-1',
    'condition-1',
    'wtc-1',
    'parameter-update-1',
    'virtual-2',
  ])
})

test('prepareWorkflowStateForRunMode starts a fresh state for run all and resumes existing state for run from selected', () => {
  const previousState = createInitialWorkflowState({
    event_log: [
      { event_type: 'run_started', event_sequence: 1, run_id: 'run-previous', summary: 'started' },
      { event_type: 'run_completed', event_sequence: 2, run_id: 'run-previous', summary: 'completed' },
    ],
    node_result_versions: [
      createNodeResultVersion({ node_id: 'virtual-1', node_result_version_id: 'result-version-1' }),
    ],
    parameter_base_versions: [{ base_version_id: 'base-previous', virtual_node_id: 'virtual-1' }],
    parameter_patches: [{ patch_id: 'patch-previous' }],
    run_id: 'run-previous',
    workflow_id: 'workflow-a',
  })
  const nextAll = prepareWorkflowStateForRunMode({
    currentState: previousState,
    initialStateFactory: () => createInitialWorkflowState({
      run_id: 'run-new',
      workflow_id: 'workflow-a',
    }),
    mode: RUN_MODES.RUN_ALL,
  })
  const nextSelected = prepareWorkflowStateForRunMode({
    currentState: previousState,
    initialStateFactory: () => {
      throw new Error('run from selected should not create a fresh state')
    },
    mode: RUN_MODES.RUN_FROM_SELECTED,
  })

  assert.equal(nextAll.run_id, 'run-new')
  assert.deepEqual(nextAll.event_log, [])
  assert.deepEqual(nextAll.node_result_versions, [])
  assert.equal(nextAll.run_history.length, 1)
  assert.equal(nextAll.run_history[0].run_id, 'run-previous')
  assert.equal(nextAll.run_history[0].event_log.length, 2)
  assert.deepEqual(nextAll.run_history[0].node_result_versions.map((item) => item.node_result_version_id), ['result-version-1'])
  assert.deepEqual(nextAll.run_history[0].parameter_base_versions.map((item) => item.base_version_id), ['base-previous'])
  assert.deepEqual(nextAll.run_history[0].parameter_patches.map((item) => item.patch_id), ['patch-previous'])
  assert.equal(nextSelected.run_id, 'run-previous')
  assert.deepEqual(nextSelected.node_result_versions.map((item) => item.node_result_version_id), ['result-version-1'])
})

test('createRunStartedEvent exposes readable run mode metadata', () => {
  const event = createRunStartedEvent({
    expandedFromNodeIds: ['virtual-1'],
    mode: RUN_MODES.RUN_FROM_SELECTED,
    nodeCount: 4,
    selectedNodeId: 'wtc-1',
  })

  assert.equal(event.event_type, 'run_started')
  assert.equal(event.payload.run_mode, RUN_MODES.RUN_FROM_SELECTED)
  assert.equal(event.payload.selected_node_id, 'wtc-1')
  assert.deepEqual(event.payload.expanded_from_node_ids, ['virtual-1'])
  assert.equal(event.payload.node_count, 4)
  assert.equal(event.payload.state_change_summary, 'Run mode run_from_selected started with 4 nodes; expanded from upstream dependencies: virtual-1')
})
