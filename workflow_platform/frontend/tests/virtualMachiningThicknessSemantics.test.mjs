import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildThicknessSemanticsForPrediction,
  normalizeCompensationWorkflowResponse,
  postprocessWallErrorPointsForDesignSurface,
  requestWithCompatibleRadialDepth,
  validateThicknessSemanticsForPrediction,
} from '../runtime/virtualMachiningThicknessSemantics.js'

test('normalizeCompensationWorkflowResponse makes compensation same sign as average_error', () => {
  const response = normalizeCompensationWorkflowResponse({
    result: {
      average_error: 0.08558,
      compensation_plan: {
        delta_radial_depth: -0.08558,
        radial_depth_delta: -0.08558,
      },
      suggestion_value: -0.08558,
    },
  })

  assert.equal(response.result.suggestion_value, 0.08558)
  assert.equal(response.result.compensation_plan.delta_radial_depth, 0.08558)
  assert.equal(response.result.compensation_plan.radial_depth_delta, 0.08558)
})

test('buildThicknessSemanticsForPrediction derives per-point execution radial depth and compatible scalar', () => {
  const semantics = buildThicknessSemanticsForPrediction({
    current_thickness_field: {
      K1: 1.2,
      K2: 1.18,
    },
    design_surface_thickness: 1,
    compensation_value: 0.08558,
    key_points: [
      { id: 'K1' },
      { id: 'K2' },
    ],
    process: {
      radial_depth: 1,
    },
  })

  assert.equal(semantics.design_surface_thickness, 1)
  assert.equal(semantics.execution_surface_thickness, 0.91442)
  assert.deepEqual(
    semantics.execution_radial_depth_field.map((point) => [point.id, Number(point.execution_radial_depth.toFixed(5))]),
    [
      ['K1', 0.28558],
      ['K2', 0.26558],
    ],
  )
  assert.equal(Number(semantics.compatible_radial_depth.toFixed(5)), 0.27558)
})

test('buildThicknessSemanticsForPrediction consumes artifact current thickness field values', () => {
  const semantics = buildThicknessSemanticsForPrediction({
    current_thickness_field: {
      field_type: 'current_thickness_field',
      point_refs: [{ id: 'K1_J1_I1' }, { id: 'K2_J1_I1' }],
      summary: {
        count: 2,
        max: 5.25,
        mean: 5.2,
        min: 5.15,
      },
      values: [5.25, 5.15],
    },
    design_process: {
      design_surface_thickness: 4,
      radial_depth: 1,
    },
    key_points: [
      { id: 'K1_J1_I1' },
      { id: 'K2_J1_I1' },
    ],
    process: {
      radial_depth: 1,
    },
    workpiece: {
      thickness: 3,
    },
  })

  assert.deepEqual(
    semantics.current_thickness_field.map((point) => [point.id, point.current_thickness]),
    [
      ['K1_J1_I1', 5.25],
      ['K2_J1_I1', 5.15],
    ],
  )
  assert.deepEqual(
    semantics.execution_radial_depth_field.map((point) => [point.id, Number(point.execution_radial_depth.toFixed(5))]),
    [
      ['K1_J1_I1', 1.25],
      ['K2_J1_I1', 1.15],
    ],
  )
})

test('buildThicknessSemanticsForPrediction derives design surface from workpiece thickness and authored design radial depth', () => {
  const semantics = buildThicknessSemanticsForPrediction({
    design_process: {
      radial_depth: 1,
    },
    key_points: [{ id: 'K1' }],
    process: {
      radial_depth: 1.08558,
    },
    workpiece: {
      thickness: 6,
    },
  })
  const points = postprocessWallErrorPointsForDesignSurface(
    [{ id: 'K1', error: 0.02 }],
    semantics,
  )

  assert.equal(semantics.design_surface_thickness, 5)
  assert.equal(Number(semantics.compensation_value.toFixed(5)), 0.08558)
  assert.equal(Number(semantics.execution_surface_thickness.toFixed(5)), 4.91442)
  assert.equal(Number(semantics.execution_radial_depth_field[0].execution_radial_depth.toFixed(5)), 1.08558)
  assert.equal(Number(points[0].design_surface_error.toFixed(5)), -0.06558)
  assert.notEqual(Number(points[0].execution_surface_error.toFixed(5)), Number(points[0].design_surface_error.toFixed(5)))
})

test('buildThicknessSemanticsForPrediction reads design surface thickness from authored process base', () => {
  const semantics = buildThicknessSemanticsForPrediction({
    design_process: {
      design_surface_thickness: 5,
      radial_depth: 1,
    },
    key_points: [{ id: 'K1' }],
    process: {
      radial_depth: 1,
    },
    workpiece: {
      thickness: 6,
    },
  })

  assert.equal(semantics.design_surface_thickness, 5)
  assert.equal(semantics.execution_surface_thickness, 5)
  assert.equal(semantics.execution_radial_depth_field[0].execution_radial_depth, 1)
})

test('buildThicknessSemanticsForPrediction ignores stale mirrored design surface when process base is explicit', () => {
  const semantics = buildThicknessSemanticsForPrediction({
    design_process: {
      design_surface_thickness: 5,
      radial_depth: 1,
    },
    design_surface_thickness: 2,
    key_points: [{ id: 'K1' }],
    process: {
      radial_depth: 1,
    },
    workpiece: {
      thickness: 6,
    },
  })

  assert.equal(semantics.design_surface_thickness, 5)
  assert.equal(semantics.execution_surface_thickness, 5)
  assert.equal(semantics.compatible_radial_depth, 1)
})

test('validateThicknessSemanticsForPrediction rejects non-positive execution radial depth', () => {
  const semantics = buildThicknessSemanticsForPrediction({
    design_process: {
      design_surface_thickness: 5,
      radial_depth: 1,
    },
    key_points: [{ id: 'K1' }],
    process: {
      radial_depth: 1,
    },
    workpiece: {
      thickness: 3,
    },
  })
  const validation = validateThicknessSemanticsForPrediction(semantics)

  assert.equal(validation.ok, false)
  assert.equal(validation.error_code, 'non_positive_execution_radial_depth')
  assert.match(validation.message, /current thickness/i)
})

test('validateThicknessSemanticsForPrediction rejects radial depth that exceeds backend calibration range', () => {
  const semantics = buildThicknessSemanticsForPrediction({
    design_process: {
      design_surface_thickness: 2,
      radial_depth: 1,
    },
    key_points: [{ id: 'K1' }],
    process: {
      radial_depth: 1,
    },
    workpiece: {
      thickness: 6,
    },
  })
  const validation = validateThicknessSemanticsForPrediction(semantics, {
    tool: {
      diameter: 4,
    },
  })

  assert.equal(semantics.compatible_radial_depth, 4)
  assert.equal(validation.ok, false)
  assert.equal(validation.error_code, 'radial_depth_exceeds_calibration_range')
  assert.match(validation.message, /backend calibration/i)
})

test('requestWithCompatibleRadialDepth keeps backend request scalar-compatible', () => {
  const request = requestWithCompatibleRadialDepth(
    {
      key_points: [
        { id: 'K1', stiffness: 300 },
        { id: 'K2', stiffness: 320 },
      ],
      process: {
        feed_rate: 48,
        radial_depth: 1,
      },
    },
    {
      compatible_radial_depth: 0.27558,
      execution_radial_depth_field: [
        { id: 'K1', execution_radial_depth: 0.28558 },
        { id: 'K2', execution_radial_depth: 0.26558 },
      ],
    },
  )

  assert.deepEqual(request.process, {
    feed_rate: 48,
    radial_depth: 0.27558,
  })
  assert.deepEqual(request.key_points, [
    { id: 'K1', stiffness: 300, execution_radial_depth: 0.28558 },
    { id: 'K2', stiffness: 320, execution_radial_depth: 0.26558 },
  ])
})

test('postprocessWallErrorPointsForDesignSurface maps execution-surface error to design-surface error', () => {
  const points = postprocessWallErrorPointsForDesignSurface(
    [
      { id: 'K1', error: 0.02, stiffness: 300 },
      { id: 'K2', error: 0.03, stiffness: 320 },
    ],
    {
      design_surface_thickness: 1,
      execution_surface_thickness: 0.91442,
    },
  )

  assert.equal(Number(points[0].execution_surface_error.toFixed(5)), 0.02)
  assert.equal(Number(points[0].computed_actual_thickness.toFixed(5)), 0.93442)
  assert.equal(Number(points[0].design_surface_error.toFixed(5)), -0.06558)
  assert.equal(Number(points[0].error.toFixed(5)), -0.06558)
  assert.equal(Number(points[1].design_surface_error.toFixed(5)), -0.05558)
})

test('postprocessWallErrorPointsForDesignSurface attaches per-point execution radial depth', () => {
  const points = postprocessWallErrorPointsForDesignSurface(
    [
      { id: 'K1', error: 0.02, stiffness: 300 },
      { id: 'K2', error: 0.03, stiffness: 320 },
    ],
    {
      design_surface_thickness: 4,
      execution_radial_depth_field: [
        { id: 'K1', execution_radial_depth: 1.12 },
        { id: 'K2', execution_radial_depth: 1.08 },
      ],
      execution_surface_thickness: 4,
    },
  )

  assert.equal(points[0].execution_radial_depth, 1.12)
  assert.equal(points[1].execution_radial_depth, 1.08)
})

test('thickness semantics preserve legacy scalar behavior when no new fields are configured', () => {
  const semantics = buildThicknessSemanticsForPrediction({
    key_points: [{ id: 'K1' }],
    process: {
      radial_depth: 1,
    },
  })
  const points = postprocessWallErrorPointsForDesignSurface(
    [{ id: 'K1', error: 0.07 }],
    semantics,
  )

  assert.equal(semantics.compatible_radial_depth, 1)
  assert.equal(Number(points[0].error.toFixed(5)), 0.07)
})
