import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SNAPSHOT_SCHEMA_VERSION,
  createRunSnapshot,
  parseRunSnapshot,
  restoreRunSnapshot,
} from '../runtime/workflowSnapshot.js'

test('createRunSnapshot exports graph, WorkflowState, results, metrics, parameters, and events', () => {
  const workflowState = {
    event_log: [{ event_type: 'run_completed', node_id: null, summary: 'done', timestamp: '2026-06-15T00:00:01.000Z' }],
    initial_process_parameter_base: { radial_depth: '1.0' },
    node_result_versions: [{ node_id: 'virtual-1', node_result_version_id: 'result-version-1' }],
    node_results: { 'virtual-1': { result: { type: 'wall_error' } } },
    parameter_base_versions: [{ base_version_id: 'base-1', source_patch_ids: ['patch-1'], virtual_node_id: 'virtual-1' }],
    parameter_patches: [{ patch_id: 'patch-1', target_path: 'process_parameters.radial_depth', value: -0.08 }],
    process_parameters: { radial_depth: 0.92 },
    run_history: [],
    run_id: 'run-a',
    runtime_metrics: { max_wall_error: 0.12 },
    status: 'completed',
    visualization_sessions: [{
      node_result_version_id: 'result-version-1',
      status: 'ready',
      virtual_node_id: 'virtual-1',
      visualization_session_id: 'vis-1',
    }],
    workflow_id: 'workflow-a',
  }

  const snapshot = createRunSnapshot({
    appVersion: 'test-app',
    edges: [{ from: 'virtual-1', to: 'stop-1' }],
    nodes: [{ id: 'virtual-1', params: { process: { radial_depth: '1.0' } }, type: 'virtual' }],
    selectedNodeId: 'virtual-1',
    workflowState,
    runMode: 'run_from_selected',
    runtimeVersion: 'test-runtime-v2',
  }, {
    now: () => '2026-06-15T00:00:02.000Z',
  })

  assert.equal(snapshot.schema_version, SNAPSHOT_SCHEMA_VERSION)
  assert.equal(snapshot.app_version, 'test-app')
  assert.equal(snapshot.runtime_version, 'test-runtime-v2')
  assert.equal(snapshot.exported_at, '2026-06-15T00:00:02.000Z')
  assert.equal(snapshot.run_mode, 'run_from_selected')
  assert.equal(snapshot.timestamp, '2026-06-15T00:00:02.000Z')
  assert.deepEqual(snapshot.run_history, [])
  assert.deepEqual(snapshot.workflow_graph.nodes.map((node) => node.id), ['virtual-1'])
  assert.deepEqual(snapshot.workflow_graph.edges, [{ from: 'virtual-1', to: 'stop-1' }])
  assert.deepEqual(snapshot.workflow_state, { ...workflowState, run_mode: 'run_all' })
  assert.deepEqual(snapshot.node_results, workflowState.node_results)
  assert.deepEqual(snapshot.initial_process_parameter_base, workflowState.initial_process_parameter_base)
  assert.deepEqual(snapshot.parameter_base_versions, workflowState.parameter_base_versions)
  assert.deepEqual(snapshot.parameter_patches, workflowState.parameter_patches)
  assert.deepEqual(snapshot.node_result_versions, workflowState.node_result_versions)
  assert.deepEqual(snapshot.runtime_metrics, workflowState.runtime_metrics)
  assert.deepEqual(snapshot.process_parameters, workflowState.process_parameters)
  assert.deepEqual(snapshot.visualization_sessions, workflowState.visualization_sessions)
  assert.deepEqual(snapshot.event_log, workflowState.event_log)
})

test('createRunSnapshot deep-clones exported data', () => {
  const input = {
    edges: [{ from: 'a', to: 'b' }],
    nodes: [{ id: 'a', params: { value: 1 }, type: 'logic' }],
    workflowState: {
      event_log: [],
      node_results: {},
      process_parameters: {},
      runtime_metrics: {},
    },
  }

  const snapshot = createRunSnapshot(input)

  snapshot.workflow_graph.nodes[0].params.value = 2
  assert.equal(input.nodes[0].params.value, 1)
})

test('parseRunSnapshot accepts JSON text and restoreRunSnapshot returns graph plus state', () => {
  const json = JSON.stringify(createRunSnapshot({
    edges: [{ from: 'a', to: 'b' }],
    nodes: [{ id: 'a', type: 'logic' }, { id: 'b', type: 'logic' }],
    selectedNodeId: 'b',
    workflowState: {
      event_log: [{ event_type: 'node_completed', node_id: 'a', summary: 'ok', timestamp: '2026-06-15T00:00:00.000Z' }],
      initial_process_parameter_base: { radial_depth: '1.0' },
      node_result_versions: [{ node_id: 'a', node_result_version_id: 'result-version-a' }],
      node_results: { a: { result: true } },
      parameter_base_versions: [{ base_version_id: 'base-a', source_patch_ids: ['patch-a'], virtual_node_id: 'a' }],
      parameter_patches: [{ patch_id: 'patch-a', target_path: 'process_parameters.radial_depth', value: -0.08 }],
      process_parameters: { radial_depth: 1 },
      run_id: 'run-a',
      runtime_metrics: { max_wall_error: 0.04 },
      status: 'paused',
      visualization_sessions: [{ virtual_node_id: 'a', visualization_session_id: 'vis-a' }],
      workflow_id: 'workflow-a',
    },
  }))

  const restored = restoreRunSnapshot(parseRunSnapshot(json))

  assert.deepEqual(restored.nodes.map((node) => node.id), ['a', 'b'])
  assert.deepEqual(restored.edges, [{ from: 'a', to: 'b' }])
  assert.equal(restored.selectedNodeId, 'b')
  assert.equal(restored.workflowState.status, 'paused')
  assert.equal(restored.workflowState.node_results.a.result, true)
  assert.equal(restored.workflowState.event_log[0].event_type, 'node_completed')
  assert.deepEqual(restored.workflowState.initial_process_parameter_base, { radial_depth: '1.0' })
  assert.deepEqual(restored.workflowState.parameter_base_versions.map((item) => item.base_version_id), ['base-a'])
  assert.deepEqual(restored.workflowState.parameter_patches.map((item) => item.patch_id), ['patch-a'])
  assert.deepEqual(restored.workflowState.node_result_versions.map((item) => item.node_result_version_id), ['result-version-a'])
  assert.deepEqual(restored.workflowState.visualization_sessions.map((item) => item.visualization_session_id), ['vis-a'])
})

test('restoreRunSnapshot backfills P1 dataflow arrays for old snapshots', () => {
  const legacySnapshot = {
    event_log: [],
    node_results: {},
    process_parameters: {},
    runtime_metrics: {},
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    timestamp: '2026-06-15T00:00:02.000Z',
    workflow_graph: {
      edges: [],
      nodes: [{ id: 'legacy-1', type: 'logic' }],
      selected_node_id: 'legacy-1',
    },
    workflow_state: {
      event_log: [],
      node_results: {},
      process_parameters: {},
      runtime_metrics: {},
      status: 'completed',
    },
  }

  const restored = restoreRunSnapshot(legacySnapshot)

  assert.deepEqual(restored.workflowState.parameter_base_versions, [])
  assert.deepEqual(restored.workflowState.initial_process_parameter_base, {})
  assert.deepEqual(restored.workflowState.parameter_patches, [])
  assert.deepEqual(restored.workflowState.node_result_versions, [])
  assert.deepEqual(restored.workflowState.visualization_sessions, [])
})

test('restoreRunSnapshot accepts legacy snapshots without schema_version', () => {
  const legacySnapshot = {
    event_log: [{ event_type: 'run_completed', summary: 'legacy done' }],
    node_results: { legacy: { result: true } },
    runtime_metrics: {},
    workflow_graph: {
      edges: [],
      nodes: [{ id: 'legacy', type: 'logic' }],
      selected_node_id: 'legacy',
    },
    workflow_state: {
      node_results: { legacy: { result: true } },
      status: 'completed',
    },
  }

  const restored = restoreRunSnapshot(legacySnapshot)

  assert.equal(restored.selectedNodeId, 'legacy')
  assert.equal(restored.workflowState.status, 'completed')
  assert.deepEqual(restored.workflowState.parameter_base_versions, [])
  assert.deepEqual(restored.workflowState.parameter_patches, [])
  assert.deepEqual(restored.workflowState.node_result_versions, [])
  assert.deepEqual(restored.workflowState.visualization_sessions, [])
  assert.equal(restored.workflowState.node_results.legacy.result, true)
})

test('parseRunSnapshot rejects unknown snapshot schemas', () => {
  assert.throws(
    () => parseRunSnapshot(JSON.stringify({ schema_version: 'unknown' })),
    /Unsupported snapshot schema/,
  )
})
