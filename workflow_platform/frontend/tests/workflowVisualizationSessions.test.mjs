import assert from 'node:assert/strict'
import test from 'node:test'

import {
  activateVisualizationSession,
  addVisualizationSession,
  createVisualizationSession,
  latestVisualizationSessionForNode,
  visualizationSessionDiagnostics,
} from '../runtime/workflowVisualizationSessions.js'

test('createVisualizationSession binds a Unity payload to a virtual node and result version', () => {
  const session = createVisualizationSession({
    created_at: '2026-06-18T00:00:00.000Z',
    created_by: 'workflow_auto_run',
    node_display_label: '#3 Virtual Machining',
    node_result_version_id: 'result-version-1',
    parameter_base_version_id: 'base-1',
    scene_payload: {
      type: 'virtual_machining_scene',
      workpiece: { length: 120 },
    },
    unity_payload: {
      points: [
        { error: 0.02, id: 'K1', x: 1, y: 2, z: 3 },
        { error: -0.04, id: 'K2', x: 4, y: 5, z: 6 },
      ],
      process: { radialDepth: 0.91 },
      toolpath: { segments: [{ mode: 'cut' }, { mode: 'rapid' }] },
    },
    virtual_node_id: 'virtual-7',
    visualization_session_id: 'vis-1',
  })

  assert.equal(session.visualization_session_id, 'vis-1')
  assert.equal(session.virtual_node_id, 'virtual-7')
  assert.equal(session.node_display_label, '#3 Virtual Machining')
  assert.equal(session.node_result_version_id, 'result-version-1')
  assert.equal(session.parameter_base_version_id, 'base-1')
  assert.deepEqual(session.scene_payload, {
    type: 'virtual_machining_scene',
    workpiece: { length: 120 },
  })
  assert.equal(session.status, 'ready')
  assert.equal(session.payload_summary.point_count, 2)
  assert.equal(session.payload_summary.max_abs_error, 0.04)
  assert.equal(session.payload_summary.radial_depth, 0.91)
  assert.equal(session.payload_summary.toolpath_segment_count, 2)
})

test('latestVisualizationSessionForNode returns the newest session for a virtual node', () => {
  const state = [
    createVisualizationSession({
      created_at: '2026-06-18T00:00:00.000Z',
      unity_payload: { points: [] },
      virtual_node_id: 'virtual-a',
      visualization_session_id: 'vis-old',
    }),
    createVisualizationSession({
      created_at: '2026-06-18T00:01:00.000Z',
      unity_payload: { points: [{ error: 0.01 }] },
      virtual_node_id: 'virtual-a',
      visualization_session_id: 'vis-new',
    }),
  ].reduce((nextState, session) => addVisualizationSession(nextState, session), { visualization_sessions: [] })

  const latest = latestVisualizationSessionForNode(state, 'virtual-a')

  assert.equal(latest.visualization_session_id, 'vis-new')
  assert.equal(latest.payload_summary.point_count, 1)
})

test('activateVisualizationSession marks one session as previewing and keeps others inactive', () => {
  const baseState = {
    visualization_sessions: [
      createVisualizationSession({ virtual_node_id: 'virtual-a', visualization_session_id: 'vis-a', unity_payload: { points: [] } }),
      createVisualizationSession({ virtual_node_id: 'virtual-b', visualization_session_id: 'vis-b', unity_payload: { points: [] } }),
    ],
  }

  const nextState = activateVisualizationSession(baseState, 'vis-b')

  assert.equal(nextState.active_visualization_session_id, 'vis-b')
  assert.equal(nextState.visualization_sessions.find((session) => session.visualization_session_id === 'vis-a').active, false)
  assert.equal(nextState.visualization_sessions.find((session) => session.visualization_session_id === 'vis-b').active, true)
  assert.equal(nextState.visualization_sessions.find((session) => session.visualization_session_id === 'vis-b').status, 'previewing')
})

test('visualizationSessionDiagnostics includes source identity for event logs and UI labels', () => {
  const session = createVisualizationSession({
    node_display_label: '#5 Virtual Machining',
    node_result_version_id: 'result-version-5',
    unity_payload: {
      points: [{ error: 0.012 }],
      process: { radialDepth: 1 },
      toolpath: { segments: [] },
    },
    virtual_node_id: 'virtual-5',
    visualization_session_id: 'vis-5',
  })

  assert.equal(
    visualizationSessionDiagnostics(session),
    '#5 Virtual Machining / virtual-5 / result-version-5 / points=1 / radialDepth=1',
  )
})
