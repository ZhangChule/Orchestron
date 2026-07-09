import assert from 'node:assert/strict'
import test from 'node:test'

import {
  WORKPIECE_PRESETS,
  defaultWorkpieceParams,
  normalizeVirtualMachiningParams,
  parseToolpathText,
  workpiecePresetById,
} from '../runtime/virtualMachiningNodeConfig.js'

test('WORKPIECE_PRESETS includes the original and operation demo workpiece dimensions', () => {
  assert.deepEqual(workpiecePresetById('default-thinwall').workpiece, {
    base_height: '16',
    base_width: '64',
    height: '56',
    length: '120',
    thickness: '3',
  })
  assert.deepEqual(workpiecePresetById('operation-demo-120x55x6').workpiece, {
    base_height: '15',
    base_width: '120',
    height: '55',
    length: '120',
    thickness: '6',
  })
  assert.equal(WORKPIECE_PRESETS.length, 2)
})

test('defaultWorkpieceParams returns a clone of the selected preset', () => {
  const workpiece = defaultWorkpieceParams('operation-demo-120x55x6')
  workpiece.thickness = '999'

  assert.equal(defaultWorkpieceParams('operation-demo-120x55x6').thickness, '6')
})

test('parseToolpathText accepts the Unity operation-level toolpath shape', () => {
  const toolpath = parseToolpathText(JSON.stringify({
    coordinateSpace: 'workpieceLocalMm',
    start: { x: 0, y: 50, z: -8 },
    segments: [
      { mode: 'rapid', to: { x: 0, y: 30, z: -8 }, speedMmPerSec: 50, spindleRpm: 3000 },
      { mode: 'cut', to: { x: -54, y: 30, z: 128 }, speedMmPerSec: 15, spindleRpm: 3000 },
    ],
  }))

  assert.equal(toolpath.coordinateSpace, 'workpieceLocalMm')
  assert.equal(toolpath.segments.length, 2)
})

test('parseToolpathText rejects missing cut segments', () => {
  assert.throws(
    () => parseToolpathText(JSON.stringify({
      coordinateSpace: 'workpieceLocalMm',
      segments: [{ mode: 'rapid', to: { x: 0, y: 0, z: 0 } }],
      start: { x: 0, y: 0, z: 0 },
    })),
    /at least one cut segment/i,
  )
})

test('normalizeVirtualMachiningParams backfills parametric workpiece source and design surface thickness for legacy params', () => {
  const input = {
    process: {
      radial_depth: '1.0',
      spindle_speed: '7200',
    },
    workpiece: {
      thickness: '6',
    },
  }

  const params = normalizeVirtualMachiningParams(input)
  input.process.radial_depth = '999'

  assert.deepEqual(params.workpiece_source, {
    file_name: null,
    geometry_artifact_id: null,
    mode: 'parametric',
    upstream_virtual_node_id: null,
  })
  assert.equal(params.process.design_surface_thickness, '5')
  assert.equal(params.design_surface_thickness, '5')
})

test('normalizeVirtualMachiningParams preserves an upstream-node geometry source', () => {
  const params = normalizeVirtualMachiningParams({
    process: {
      design_surface_thickness: '5.0',
      radial_depth: '1.0',
    },
    workpiece_source: {
      geometry_artifact_id: 'geo-1',
      mode: 'upstream_node',
      upstream_virtual_node_id: 'virtual-1',
    },
  })

  assert.deepEqual(params.workpiece_source, {
    file_name: null,
    geometry_artifact_id: 'geo-1',
    mode: 'upstream_node',
    upstream_virtual_node_id: 'virtual-1',
  })
  assert.equal(params.process.design_surface_thickness, '5.0')
})
