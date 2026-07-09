export const WORKPIECE_PRESETS = Object.freeze([
  Object.freeze({
    id: 'default-thinwall',
    label: 'Default thinwall: L120 H1 56 T3 W64 H2 16',
    workpiece: Object.freeze({
      base_height: '16',
      base_width: '64',
      height: '56',
      length: '120',
      thickness: '3',
    }),
  }),
  Object.freeze({
    id: 'operation-demo-120x55x6',
    label: 'Operation demo: L120 H1 55 T6 W120 H2 15',
    workpiece: Object.freeze({
      base_height: '15',
      base_width: '120',
      height: '55',
      length: '120',
      thickness: '6',
    }),
  }),
])

export function workpiecePresetById(id) {
  return WORKPIECE_PRESETS.find((preset) => preset.id === id) ?? WORKPIECE_PRESETS[0]
}

export function defaultWorkpieceParams(id = 'default-thinwall') {
  return cloneValue(workpiecePresetById(id).workpiece)
}

export function normalizeVirtualMachiningParams(params = {}) {
  const next = cloneValue(params ?? {})
  next.process = cloneValue(next.process ?? {})
  next.workpiece = cloneValue(next.workpiece ?? {})
  next.workpiece_source = normalizeWorkpieceSource(next.workpiece_source)

  const designSurfaceThickness = firstFiniteString(
    next.process.design_surface_thickness,
    next.process.designSurfaceThickness,
    next.design_surface_thickness,
    next.designSurfaceThickness,
    defaultDesignSurfaceThickness(next),
  )
  if (designSurfaceThickness != null) {
    next.process.design_surface_thickness = designSurfaceThickness
    next.design_surface_thickness = designSurfaceThickness
  }

  return next
}

export function parseToolpathText(text) {
  const toolpath = JSON.parse(String(text ?? ''))
  if (!toolpath || typeof toolpath !== 'object' || Array.isArray(toolpath)) {
    throw new Error('Toolpath JSON must be an object.')
  }
  if (toolpath.coordinateSpace !== 'workpieceLocalMm') {
    throw new Error('Toolpath coordinateSpace must be workpieceLocalMm.')
  }
  if (!isPoint(toolpath.start)) throw new Error('Toolpath start must include numeric x, y, z.')
  if (!Array.isArray(toolpath.segments) || !toolpath.segments.length) {
    throw new Error('Toolpath segments must be a non-empty array.')
  }
  const segments = toolpath.segments.map((segment, index) => normalizeSegment(segment, index))
  if (!segments.some((segment) => segment.mode === 'cut')) {
    throw new Error('Toolpath must include at least one cut segment.')
  }
  return {
    coordinateSpace: toolpath.coordinateSpace,
    start: normalizePoint(toolpath.start),
    segments,
  }
}

function normalizeWorkpieceSource(source = {}) {
  const mode = ['parametric', 'file', 'upstream_node'].includes(source?.mode)
    ? source.mode
    : 'parametric'
  return {
    file_name: source?.file_name ?? source?.fileName ?? null,
    geometry_artifact_id: source?.geometry_artifact_id ?? source?.geometryArtifactId ?? null,
    mode,
    upstream_virtual_node_id: source?.upstream_virtual_node_id ?? source?.upstreamVirtualNodeId ?? null,
  }
}

function defaultDesignSurfaceThickness(params) {
  const currentThickness = numberValue(params.workpiece?.thickness, NaN)
  const radialDepth = numberValue(params.process?.radial_depth ?? params.process?.radialDepth, NaN)
  if (!Number.isFinite(currentThickness) || !Number.isFinite(radialDepth)) return null
  return String(currentThickness - radialDepth)
}

function firstFiniteString(...values) {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return String(value)
  }
  return null
}

function normalizeSegment(segment, index) {
  if (!segment || typeof segment !== 'object') throw new Error(`Toolpath segment ${index + 1} must be an object.`)
  if (segment.mode !== 'rapid' && segment.mode !== 'cut') {
    throw new Error(`Toolpath segment ${index + 1} mode must be rapid or cut.`)
  }
  if (!isPoint(segment.to)) throw new Error(`Toolpath segment ${index + 1} to must include numeric x, y, z.`)
  return {
    mode: segment.mode,
    to: normalizePoint(segment.to),
    speedMmPerSec: numberValue(segment.speedMmPerSec, 0),
    spindleRpm: numberValue(segment.spindleRpm, 0),
  }
}

function isPoint(value) {
  return value
    && Number.isFinite(Number(value.x))
    && Number.isFinite(Number(value.y))
    && Number.isFinite(Number(value.z))
}

function normalizePoint(value) {
  return {
    x: Number(value.x),
    y: Number(value.y),
    z: Number(value.z),
  }
}

function numberValue(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function cloneValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
