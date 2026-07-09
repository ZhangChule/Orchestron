import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  createTriDexelExportDemoVirtualParams,
} from '../runtime/workflowTriDexelExportDemo.js'

test('createTriDexelExportDemoVirtualParams configures a single VM for operation demo export', () => {
  const params = createTriDexelExportDemoVirtualParams()

  assert.equal(params.workpiece_preset_id, 'operation-demo-120x55x6')
  assert.deepEqual(params.workpiece, {
    base_height: '15',
    base_width: '120',
    height: '55',
    length: '120',
    thickness: '6',
  })
  assert.equal(params.process.design_surface_thickness, '5')
  assert.equal(params.design_surface_thickness, '5')
  assert.equal(params.stiffness_file_name, 'stiffness3.1.txt')
  assert.match(params.stiffness_file_path_hint, /stiffness3\.1\.txt$/)
  assert.equal(params.toolpath_file_name, 'process1.txt')
  assert.equal(params.toolpath.coordinateSpace, 'workpieceLocalMm')
  assert.equal(params.toolpath.segments.filter((segment) => segment.mode === 'cut').length, 4)
  assert.equal(JSON.parse(params.key_points).length, 52)
  assert.equal(params.workpiece_source.mode, 'parametric')
})
