import {
  defaultWorkpieceParams,
  normalizeVirtualMachiningParams,
  parseToolpathText,
} from './virtualMachiningNodeConfig.js'

export const TRIDEXEL_EXPORT_DEMO = Object.freeze({
  name: 'Single VM TriDexel export demo',
  stiffness_file_name: 'stiffness3.1.txt',
  stiffness_file_path: 'D:\\PhD\\ARPPL_code\\process_apps\\thinwall-dt\\frontend\\public\\stiffness3.1.txt',
  toolpath_file_name: 'process1.txt',
  toolpath_file_path: 'D:\\PhD\\ARPPL_code\\process_apps\\thinwall-dt\\frontend\\public\\process1.txt',
  workpiece_preset_id: 'operation-demo-120x55x6',
})

const STIFFNESS_3_1_MATRIX = Object.freeze([
  Object.freeze([352.1, 356.5, 360.4, 363.9, 366.8, 369.2, 371.0, 368.0, 364.6, 360.8, 356.7, 352.3, 347.6]),
  Object.freeze([386.4, 391.0, 395.2, 399.0, 402.1, 404.7, 406.6, 403.5, 400.0, 396.0, 391.7, 387.0, 382.1]),
  Object.freeze([420.8, 425.7, 430.1, 434.2, 437.6, 440.4, 442.5, 439.2, 435.5, 431.3, 426.7, 421.8, 416.5]),
  Object.freeze([446.5, 451.6, 456.3, 460.5, 464.1, 467.0, 469.2, 465.8, 462.0, 457.6, 452.8, 447.6, 442.1]),
])

const TOOLPATH_PROCESS_1 = Object.freeze({
  coordinateSpace: 'workpieceLocalMm',
  start: Object.freeze({ x: 0, y: 50, z: -8 }),
  segments: Object.freeze([
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: 0, y: 30, z: -8 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: -54, y: 30, z: -8 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'cut', to: Object.freeze({ x: -54, y: 30, z: 128 }), speedMmPerSec: 15, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: -50, y: 30, z: 128 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: -50, y: 20, z: -8 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: -54, y: 20, z: -8 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'cut', to: Object.freeze({ x: -54, y: 20, z: 128 }), speedMmPerSec: 15, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: -50, y: 20, z: 128 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: -50, y: 10, z: -8 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: -54, y: 10, z: -8 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'cut', to: Object.freeze({ x: -54, y: 10, z: 128 }), speedMmPerSec: 15, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: -50, y: 10, z: 128 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: -50, y: 0, z: -8 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: -54, y: 0, z: -8 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'cut', to: Object.freeze({ x: -54, y: 0, z: 128 }), speedMmPerSec: 15, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: -54, y: 50, z: 128 }), speedMmPerSec: 50, spindleRpm: 3000 }),
    Object.freeze({ mode: 'rapid', to: Object.freeze({ x: 0, y: 50, z: -8 }), speedMmPerSec: 50, spindleRpm: 3000 }),
  ]),
})

export function createTriDexelExportDemoVirtualParams() {
  return normalizeVirtualMachiningParams({
    key_points: JSON.stringify(stiffnessMatrixToKeyPoints(STIFFNESS_3_1_MATRIX), null, 2),
    material_id: '7075-T6',
    material: {
      density: '2.81',
      elasticModulus: '71.7',
      name: '7075-T6',
      poissonRatio: '0.33',
    },
    model_version: 'v1.0',
    process: {
      axial_depth: '10',
      cutting_mode: 'down_milling',
      design_surface_thickness: '5',
      feed_rate: '48',
      radial_depth: '1.0',
      spindle_speed: '7200',
    },
    stiffness_file_name: TRIDEXEL_EXPORT_DEMO.stiffness_file_name,
    stiffness_file_path_hint: TRIDEXEL_EXPORT_DEMO.stiffness_file_path,
    tool: {
      cutter_length: '10',
      diameter: '4.0',
      helix_angle: '30',
      immersion_angle: '90',
      overall_length: '32',
      teeth: '2',
      type: 'flat_end_mill',
    },
    tool_id: 'flat_end_mill',
    toolpath: parseToolpathText(JSON.stringify(TOOLPATH_PROCESS_1)),
    toolpath_file_name: TRIDEXEL_EXPORT_DEMO.toolpath_file_name,
    toolpath_file_path_hint: TRIDEXEL_EXPORT_DEMO.toolpath_file_path,
    workpiece: defaultWorkpieceParams(TRIDEXEL_EXPORT_DEMO.workpiece_preset_id),
    workpiece_preset_id: TRIDEXEL_EXPORT_DEMO.workpiece_preset_id,
    workpiece_source: {
      mode: 'parametric',
    },
  })
}

export function stiffnessMatrixToKeyPoints(matrix) {
  return matrix.flatMap((row, rowIndex) => row.map((stiffness, colIndex) => ({
    colIndex,
    id: `K${colIndex + 1}_J${rowIndex + 1}_I1`,
    matrixIndex: 0,
    rowIndex,
    stiffness,
    x: 0,
    y: 0,
    z: 0,
  })))
}
