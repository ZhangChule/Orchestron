import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_STIFFNESS_AVERAGE,
  DEFAULT_STIFFNESS_FILE_NAME,
  DEFAULT_STIFFNESS_FILE_PATH,
  defaultVirtualStiffnessPoints,
} from '../runtime/workflowStiffnessDefaults.js'

test('defaultVirtualStiffnessPoints mirrors the six-point stiffness.txt baseline', () => {
  const points = defaultVirtualStiffnessPoints()

  assert.equal(DEFAULT_STIFFNESS_FILE_NAME, 'stiffness.txt')
  assert.equal(DEFAULT_STIFFNESS_FILE_PATH, 'D:\\PhD\\ARPPL_code\\process_apps\\thinwall-dt\\frontend\\public\\stiffness.txt')
  assert.ok(Math.abs(DEFAULT_STIFFNESS_AVERAGE - 407.7824362166667) < 1e-12)
  assert.deepEqual(points.map((point) => point.id), [
    'K1_J1_I1',
    'K2_J1_I1',
    'K3_J1_I1',
    'K4_J1_I1',
    'K5_J1_I1',
    'K6_J1_I1',
  ])
  assert.deepEqual(points.map((point) => point.stiffness), [
    266.9039146,
    464.8856381,
    543.6949509,
    529.904264,
    427.4478514,
    213.8579983,
  ])
})
