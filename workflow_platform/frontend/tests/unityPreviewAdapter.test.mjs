import assert from 'node:assert/strict'
import test from 'node:test'

import {
  UNITY_PREVIEW_SCHEMA_VERSION,
  buildUnityMachiningJobPayload,
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
