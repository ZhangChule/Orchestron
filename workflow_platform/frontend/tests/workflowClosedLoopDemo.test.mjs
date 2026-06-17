import test from 'node:test'
import assert from 'node:assert/strict'

import { CLOSED_LOOP_DEMO } from '../runtime/workflowClosedLoopDemo.js'

test('CLOSED_LOOP_DEMO describes a multi-stage virtual tuning and comparison sequence', () => {
  assert.deepEqual(CLOSED_LOOP_DEMO.sequence, [
    'virtual-machining:baseline',
    'logic:condition-a',
    'process-app:wall-thickness-compensation-a',
    'logic:parameter-update-a',
    'virtual-machining:compensated-pass-1',
    'logic:condition-b',
    'process-app:wall-thickness-compensation-b',
    'logic:parameter-update-b',
    'virtual-machining:compensated-pass-2',
    'logic:parameter-update-b-branch',
    'virtual-machining:compensated-pass-2-branch',
    'logic:stop',
  ])
  assert.deepEqual(CLOSED_LOOP_DEMO.comparison_branch, [
    'process-app:wall-thickness-compensation-b',
    'logic:parameter-update-b-branch',
    'virtual-machining:compensated-pass-2-branch',
  ])
  assert.equal(CLOSED_LOOP_DEMO.execution_mode, 'linear-gated-with-shared-wtc-branch')
  assert.equal(CLOSED_LOOP_DEMO.condition.false_behavior, 'stop-before-compensation')
  assert.equal(CLOSED_LOOP_DEMO.condition.true_behavior, 'continue-to-compensation')
  assert.equal(CLOSED_LOOP_DEMO.stiffness_file_path, 'D:\\PhD\\ARPPL_code\\process_apps\\thinwall-dt\\frontend\\public\\stiffness.txt')
  assert.equal(CLOSED_LOOP_DEMO.virtual_parameter_sets.length, 4)
})
