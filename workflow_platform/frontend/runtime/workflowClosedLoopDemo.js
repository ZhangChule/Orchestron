import { DEFAULT_STIFFNESS_FILE_PATH } from './workflowStiffnessDefaults.js'

export const CLOSED_LOOP_DEMO = Object.freeze({
  comparison_branch: Object.freeze([
    'process-app:wall-thickness-compensation-b',
    'logic:parameter-update-b-branch',
    'virtual-machining:compensated-pass-2-branch',
  ]),
  condition: Object.freeze({
    false_behavior: 'stop-before-compensation',
    true_behavior: 'continue-to-compensation',
  }),
  execution_mode: 'linear-gated-with-shared-wtc-branch',
  name: 'Multi-stage virtual machining tuning demo',
  sequence: Object.freeze([
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
  ]),
  stiffness_file_path: DEFAULT_STIFFNESS_FILE_PATH,
  virtual_parameter_sets: Object.freeze([
    Object.freeze({ axial_depth: '10', feed_rate: '48', radial_depth: '1.0', spindle_speed: '7200' }),
    Object.freeze({ axial_depth: '10', feed_rate: '48', radial_depth: '1.0', spindle_speed: '7200' }),
    Object.freeze({ axial_depth: '8', feed_rate: '40', radial_depth: '1.0', spindle_speed: '9000' }),
    Object.freeze({ axial_depth: '6', feed_rate: '36', radial_depth: '1.0', spindle_speed: '6000' }),
  ]),
})
