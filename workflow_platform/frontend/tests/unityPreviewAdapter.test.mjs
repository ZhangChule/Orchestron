import assert from 'node:assert/strict'
import test from 'node:test'

import {
  UNITY_PREVIEW_SCHEMA_VERSION,
  buildUnityMachiningJobPayload,
  buildUnityWallErrorFieldPayload,
} from '../runtime/unityPreviewAdapter.js'

test('buildUnityMachiningJobPayload creates a StartMachiningJob payload with toolpath and metadata', () => {
  const payload = buildUnityMachiningJobPayload({
    points: [
      { id: 'K1_J1_I1', x: 12, y: 40, z: 60, stiffness: 266.9, error: 0.012 },
    ],
    request: {
      process: {
        axial_depth: 10,
        cutting_mode: 'down_milling',
        feed_rate: 64,
        radial_depth: 1,
        spindle_speed: 5000,
      },
      workpiece: {
        base_height: 15,
        base_width: 120,
        height: 55,
        length: 120,
        thickness: 6,
      },
    },
    sourceNodeId: 'virtual-1',
  })

  assert.equal(payload.payload_schema_version, UNITY_PREVIEW_SCHEMA_VERSION)
  assert.equal(payload.preview_level, 'operation')
  assert.equal(payload.source_node_id, 'virtual-1')
  assert.equal(payload.process.radialDepth, 1)
  assert.equal(payload.toolpath.coordinateSpace, 'workpieceLocalMm')
  assert.ok(payload.toolpath.segments.some((segment) => segment.mode === 'cut'))
  assert.deepEqual(payload.points[0], {
    error: 0.012,
    id: 'K1_J1_I1',
    stiffness: 266.9,
    x: 39,
    y: 60,
    z: -12,
  })
})

test('buildUnityMachiningJobPayload keeps backend x on the validated Unity z sign convention', () => {
  const payload = buildUnityMachiningJobPayload({
    points: [
      { id: 'K1_J1_I1', x: 0, y: 3, z: 55, stiffness: 352.1, error: 0.083 },
      { id: 'K13_J4_I1', x: 120, y: 3, z: 15, stiffness: 442.1, error: 0.066 },
    ],
    request: {
      process: {
        axial_depth: 10,
        cutting_mode: 'down_milling',
        feed_rate: 48,
        radial_depth: 1,
        spindle_speed: 7200,
      },
      workpiece: {
        base_height: 15,
        base_width: 120,
        height: 55,
        length: 120,
        thickness: 6,
      },
    },
    toolpath: {
      coordinateSpace: 'workpieceLocalMm',
      start: { x: 0, y: 50, z: -8 },
      segments: [{ mode: 'cut', to: { x: -54, y: 30, z: 128 } }],
    },
  })

  assert.equal(Math.abs(payload.points[0].z), 0)
  assert.equal(payload.points[1].z, -120)
  assert.ok(payload.points.every((point) => point.z <= 0 && point.z >= -128))
})

test('buildUnityMachiningJobPayload preserves a supplied operation-level toolpath', () => {
  const customToolpath = {
    coordinateSpace: 'workpieceLocalMm',
    segments: [{ mode: 'cut', spindleRpm: 3000, speedMmPerSec: 15, to: { x: 1, y: 2, z: 3 } }],
    start: { x: 0, y: 0, z: 0 },
  }
  const payload = buildUnityMachiningJobPayload({
    points: [],
    request: {
      process: {
        axial_depth: 8,
        cutting_mode: 'up_milling',
        feed_rate: 40,
        radial_depth: 0.8,
        spindle_speed: 6000,
      },
      workpiece: {
        base_height: 16,
        base_width: 64,
        height: 56,
        length: 120,
        thickness: 3,
      },
    },
    toolpath: customToolpath,
  })

  assert.deepEqual(payload.toolpath, customToolpath)
})

test('buildUnityMachiningJobPayload prefers geometry artifact metadata for workpiece dimensions', () => {
  const payload = buildUnityMachiningJobPayload({
    geometry_metadata: {
      coordinate_space: 'workpieceLocalMm',
      workpiece: {
        base_height: 15,
        base_width: 120,
        height: 55,
        length: 120,
        thickness: 6,
      },
    },
    points: [],
    request: {
      process: {
        axial_depth: 8,
        cutting_mode: 'down_milling',
        feed_rate: 40,
        radial_depth: 1,
        spindle_speed: 6000,
      },
      workpiece: {
        base_height: 12,
        base_width: 64,
        height: 42,
        length: 88,
        thickness: 3,
      },
    },
  })

  assert.deepEqual(payload.workpiece, {
    baseHeight: 15,
    baseWidth: 120,
    height: 55,
    length: 120,
    thickness: 6,
  })
})

test('buildUnityMachiningJobPayload uses artifact design surface thickness for imported geometry', () => {
  const payload = buildUnityMachiningJobPayload({
    geometry_metadata: {
      coordinate_space: 'workpieceLocalMm',
      design_surface_thickness: 5,
      workpiece: {
        base_height: 15,
        base_width: 120,
        height: 55,
        length: 120,
        thickness: 6,
      },
    },
    points: [],
    request: {
      process: {
        axial_depth: 8,
        cutting_mode: 'down_milling',
        feed_rate: 40,
        radial_depth: 1,
        spindle_speed: 6000,
      },
      workpiece: {
        base_height: 12,
        base_width: 64,
        height: 42,
        length: 88,
        thickness: 3,
      },
    },
  })

  assert.deepEqual(payload.workpiece, {
    baseHeight: 15,
    baseWidth: 120,
    height: 55,
    length: 120,
    thickness: 5,
  })
})

test('buildUnityMachiningJobPayload uses per-point execution radial depth for point placement', () => {
  const payload = buildUnityMachiningJobPayload({
    points: [
      { id: 'K1_J1_I1', x: 0, y: 40, z: 60, stiffness: 300, error: 0.02, execution_radial_depth: 0.25 },
      { id: 'K2_J1_I1', x: 10, y: 40, z: 60, stiffness: 320, error: 0.03, execution_radial_depth: 0.75 },
    ],
    request: {
      process: {
        axial_depth: 8,
        cutting_mode: 'down_milling',
        feed_rate: 40,
        radial_depth: 0.5,
        spindle_speed: 6000,
      },
      workpiece: {
        base_height: 15,
        base_width: 120,
        height: 55,
        length: 120,
        thickness: 6,
      },
    },
  })

  assert.equal(payload.points[0].x, 39.75)
  assert.equal(payload.points[1].x, 39.25)
})

test('buildUnityWallErrorFieldPayload keeps prediction point coordinates for ShowWallErrorField', () => {
  const payload = buildUnityWallErrorFieldPayload({
    nodeResultVersionId: 'result-vm2',
    points: [
      { id: 'K1_J1_I1', x: 12, y: 40, z: 60, stiffness: 266.9, error: 0.012 },
      { id: 'K2_J1_I1', x: 20, y: 42, z: 55, stiffness: 300, error: -0.032 },
    ],
    sourceNodeId: 'virtual-machining-2',
    visualizationSessionId: 'vis-vm2',
  })

  assert.equal(payload.replace_existing, true)
  assert.equal(payload.type, 'wall_error_field')
  assert.equal(payload.source_node_id, 'virtual-machining-2')
  assert.equal(payload.node_result_version_id, 'result-vm2')
  assert.equal(payload.visualization_session_id, 'vis-vm2')
  assert.deepEqual(payload.points[0], {
    error: 0.012,
    id: 'K1_J1_I1',
    stiffness: 266.9,
    x: 12,
    y: 40,
    z: 60,
  })
  assert.deepEqual(payload.summary, {
    average_error: -0.01,
    max_abs_error: 0.032,
    max_error: 0.012,
    min_error: -0.032,
    point_count: 2,
  })
})

test('buildUnityWallErrorFieldPayload can request clearing imported cloud state', () => {
  const payload = buildUnityWallErrorFieldPayload({
    clearExisting: true,
    nodeResultVersionId: 'result-vm2',
    points: [],
    sourceNodeId: 'virtual-machining-2',
    visualizationSessionId: 'vis-vm2',
  })

  assert.equal(payload.clear_existing, true)
  assert.equal(payload.replace_existing, true)
  assert.deepEqual(payload.points, [])
  assert.equal(payload.summary.point_count, 0)
})
