export function normalizeCompensationWorkflowResponse(response) {
  const next = cloneValue(response)
  const result = next?.result
  if (!result || typeof result !== 'object') return next

  const averageError = firstFiniteNumber(
    result.average_error,
    result.compensation_plan?.source_error_summary?.average_error,
    result.summary?.average_error,
  )
  if (!Number.isFinite(averageError) || averageError === 0) return next

  if (Number.isFinite(Number(result.suggestion_value))) {
    result.suggestion_value = sameSignMagnitude(result.suggestion_value, averageError)
  }

  const plan = result.compensation_plan
  if (plan && typeof plan === 'object') {
    for (const field of ['delta_radial_depth', 'radial_depth_delta', 'compensation_value', 'delta']) {
      if (Number.isFinite(Number(plan[field]))) {
        plan[field] = sameSignMagnitude(plan[field], averageError)
      }
    }
  }

  return next
}

export function buildThicknessSemanticsForPrediction(input = {}) {
  const process = input.process ?? {}
  const designProcess = input.design_process ?? input.designProcess ?? {}
  const workpiece = input.workpiece ?? {}
  const keyPoints = input.key_points ?? input.keyPoints ?? []
  const configured = input.thickness_semantics ?? input.thicknessSemantics ?? input
  const legacyRadialDepth = numberValue(process.radial_depth, 0)
  const designRadialDepth = firstFiniteNumber(
    configured.design_radial_depth,
    configured.designRadialDepth,
    process.design_radial_depth,
    process.designRadialDepth,
    designProcess.radial_depth,
    designProcess.radialDepth,
    legacyRadialDepth,
  )
  const currentThicknessScalar = firstFiniteNumber(
    configured.current_thickness,
    configured.currentThickness,
    configured.current_wall_thickness,
    configured.currentWallThickness,
    process.current_thickness,
    process.currentThickness,
    workpiece.thickness,
  )
  const defaultDesignSurfaceThickness = Number.isFinite(currentThicknessScalar)
    ? currentThicknessScalar - designRadialDepth
    : legacyRadialDepth
  const designSurfaceThickness = firstFiniteNumber(
    process.design_surface_thickness,
    process.designSurfaceThickness,
    designProcess.design_surface_thickness,
    designProcess.designSurfaceThickness,
    configured.design_surface_thickness,
    configured.designSurfaceThickness,
    defaultDesignSurfaceThickness,
  )
  const compensationValue = firstFiniteNumber(
    configured.compensation_value,
    configured.compensationValue,
    process.compensation_value,
    process.compensationValue,
    legacyRadialDepth - designRadialDepth,
    0,
  )
  const executionSurfaceThickness = firstFiniteNumber(
    configured.execution_surface_thickness,
    configured.executionSurfaceThickness,
    process.execution_surface_thickness,
    process.executionSurfaceThickness,
    designProcess.execution_surface_thickness,
    designProcess.executionSurfaceThickness,
    designSurfaceThickness - compensationValue,
  )
  const currentThicknessField = normalizeCurrentThicknessField(
    configured.current_thickness_field ?? configured.currentThicknessField,
    keyPoints,
    Number.isFinite(currentThicknessScalar) ? currentThicknessScalar : executionSurfaceThickness + legacyRadialDepth,
  )
  const executionRadialDepthField = currentThicknessField.map((point, index) => {
    const executionRadialDepth = point.current_thickness - executionSurfaceThickness
    return {
      current_thickness: point.current_thickness,
      execution_radial_depth: executionRadialDepth,
      id: point.id ?? keyPointId(keyPoints[index], index),
    }
  })
  const compatibleRadialDepth = average(executionRadialDepthField.map((point) => point.execution_radial_depth))
    ?? legacyRadialDepth

  return {
    compatible_radial_depth: compatibleRadialDepth,
    compensation_value: compensationValue,
    current_thickness_field: currentThicknessField,
    design_radial_depth: designRadialDepth,
    design_surface_thickness: designSurfaceThickness,
    execution_radial_depth_field: executionRadialDepthField,
    execution_surface_thickness: executionSurfaceThickness,
    source: 'workflow_frontend_a_stage',
  }
}

export function validateThicknessSemanticsForPrediction(semantics = {}, options = {}) {
  const invalidPoints = (semantics.execution_radial_depth_field ?? [])
    .filter((point) => !Number.isFinite(Number(point.execution_radial_depth)) || Number(point.execution_radial_depth) <= 0)
    .map((point) => ({
      current_thickness: point.current_thickness,
      execution_radial_depth: point.execution_radial_depth,
      id: point.id,
    }))

  if (invalidPoints.length) {
    const first = invalidPoints[0]
    return {
      error_code: 'non_positive_execution_radial_depth',
      invalid_points: invalidPoints,
      message: `Invalid thickness semantics: current thickness must be greater than execution surface thickness before wall-error prediction. First invalid point ${first.id ?? 'unknown'} has current_thickness=${first.current_thickness} and execution_radial_depth=${first.execution_radial_depth}.`,
      ok: false,
    }
  }

  const toolDiameter = firstFiniteNumber(
    options.tool?.diameter,
    options.tool_diameter,
    options.toolDiameter,
  )
  const calibrationSampleMaxFactor = firstFiniteNumber(
    options.calibration_sample_max_factor,
    options.calibrationSampleMaxFactor,
    1.5,
  )
  const compatibleRadialDepth = Number(semantics.compatible_radial_depth)
  if (
    Number.isFinite(toolDiameter)
    && Number.isFinite(calibrationSampleMaxFactor)
    && Number.isFinite(compatibleRadialDepth)
    && compatibleRadialDepth * calibrationSampleMaxFactor > toolDiameter
  ) {
    return {
      error_code: 'radial_depth_exceeds_calibration_range',
      invalid_points: [],
      message: `Invalid thickness semantics: compatible radial depth ${compatibleRadialDepth} mm exceeds backend calibration range for tool diameter ${toolDiameter} mm. The backend currently samples up to ${calibrationSampleMaxFactor}x ae before wall-error prediction.`,
      ok: false,
    }
  }

  return {
    error_code: null,
    invalid_points: [],
    message: '',
    ok: true,
  }
}

export function requestWithCompatibleRadialDepth(request, semantics) {
  const next = cloneValue(request)
  if (!next.process || typeof next.process !== 'object') next.process = {}
  const compatibleRadialDepth = numberValue(semantics?.compatible_radial_depth, next.process.radial_depth)
  next.process.radial_depth = compatibleRadialDepth
  if (Array.isArray(next.key_points)) {
    const depthById = new Map(
      (semantics?.execution_radial_depth_field ?? [])
        .filter((point) => Number.isFinite(Number(point.execution_radial_depth)))
        .map((point) => [String(point.id), Number(point.execution_radial_depth)]),
    )
    next.key_points = next.key_points.map((point, index) => {
      const id = String(point.id ?? '')
      const depth = depthById.get(id)
        ?? numberValue(semantics?.execution_radial_depth_field?.[index]?.execution_radial_depth, NaN)
      if (!Number.isFinite(depth) || depth <= 0) return point
      return {
        ...point,
        execution_radial_depth: depth,
      }
    })
  }
  return next
}

export function postprocessWallErrorPointsForDesignSurface(points = [], semantics = {}) {
  const designSurfaceThickness = numberValue(semantics.design_surface_thickness, 0)
  const executionSurfaceThickness = numberValue(semantics.execution_surface_thickness, designSurfaceThickness)
  const depthById = new Map(
    (semantics.execution_radial_depth_field ?? [])
      .filter((point) => Number.isFinite(Number(point.execution_radial_depth)))
      .map((point) => [String(point.id), Number(point.execution_radial_depth)]),
  )

  return points.map((point, index) => {
    const executionSurfaceError = numberValue(point.error, 0)
    const computedActualThickness = executionSurfaceThickness + executionSurfaceError
    const designSurfaceError = computedActualThickness - designSurfaceThickness
    const executionRadialDepth = depthById.get(String(point.id ?? ''))
      ?? numberValue(semantics.execution_radial_depth_field?.[index]?.execution_radial_depth, NaN)
    return {
      ...point,
      computed_actual_thickness: computedActualThickness,
      design_surface_error: designSurfaceError,
      error: designSurfaceError,
      ...(Number.isFinite(executionRadialDepth) ? { execution_radial_depth: executionRadialDepth } : {}),
      execution_surface_error: executionSurfaceError,
    }
  })
}

export function summarizeDesignSurfaceError(points = []) {
  const errors = points.map((point) => Number(point.design_surface_error ?? point.error)).filter(Number.isFinite)
  if (!errors.length) {
    return {
      max_abs_error: null,
      mean_error: null,
      point_count: 0,
    }
  }
  return {
    max_abs_error: Math.max(...errors.map((error) => Math.abs(error))),
    mean_error: average(errors),
    point_count: errors.length,
  }
}

function normalizeCurrentThicknessField(field, keyPoints, fallbackThickness) {
  if (Array.isArray(field)) {
    return keyPoints.map((point, index) => {
      const item = field[index]
      return {
        current_thickness: currentThicknessValue(item, fallbackThickness),
        id: keyPointId(point, index),
      }
    })
  }

  if (field && typeof field === 'object') {
    if (Array.isArray(field.values)) {
      const pointRefs = Array.isArray(field.point_refs) ? field.point_refs : []
      return keyPoints.map((point, index) => {
        const id = keyPointId(point, index)
        const refIndex = pointRefs.findIndex((ref) => keyPointId(ref, -1) === id || String(ref) === id)
        const valueIndex = refIndex >= 0 ? refIndex : index
        return {
          current_thickness: currentThicknessValue(field.values[valueIndex], fallbackThickness),
          id,
        }
      })
    }

    return keyPoints.map((point, index) => {
      const id = keyPointId(point, index)
      return {
        current_thickness: currentThicknessValue(field[id], fallbackThickness),
        id,
      }
    })
  }

  return keyPoints.map((point, index) => ({
    current_thickness: fallbackThickness,
    id: keyPointId(point, index),
  }))
}

function currentThicknessValue(value, fallback) {
  if (value && typeof value === 'object') {
    return firstFiniteNumber(value.current_thickness, value.currentThickness, value.thickness, fallback)
  }
  return firstFiniteNumber(value, fallback)
}

function keyPointId(point, index) {
  return String(point?.id ?? `key-point-${index + 1}`)
}

function sameSignMagnitude(value, signSource) {
  const magnitude = Math.abs(numberValue(value, 0))
  if (magnitude === 0) return 0
  return Math.sign(numberValue(signSource, 0)) * magnitude
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return NaN
}

function numberValue(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function average(values) {
  const finite = values.map(Number).filter(Number.isFinite)
  if (!finite.length) return null
  return finite.reduce((sum, value) => sum + value, 0) / finite.length
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
