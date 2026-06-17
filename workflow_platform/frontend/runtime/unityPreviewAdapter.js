export const UNITY_PREVIEW_SCHEMA_VERSION = 'unity-machining-job-v1'

export function buildUnityMachiningJobPayload(input = {}) {
  const request = input.request ?? {}
  const process = request.process ?? {}
  const workpiece = request.workpiece ?? {}
  const radialDepth = numberValue(process.radial_depth, 0)

  return removeUndefined({
    node_result_version_id: input.nodeResultVersionId ?? input.node_result_version_id ?? null,
    payload_schema_version: UNITY_PREVIEW_SCHEMA_VERSION,
    preview_level: input.previewLevel ?? input.preview_level ?? 'operation',
    process: {
      axialDepth: numberValue(process.axial_depth, 0),
      cuttingMode: process.cutting_mode === 'up_milling' ? 'up_milling' : 'down_milling',
      feedRate: numberValue(process.feed_rate, 0),
      radialDepth,
      spindleSpeed: numberValue(process.spindle_speed, 0),
    },
    source: 'workflow_platform',
    source_node_id: input.sourceNodeId ?? input.source_node_id ?? null,
    toolpath: cloneValue(input.toolpath ?? defaultUnityToolpath(process)),
    type: 'unity_machining_job',
    workpiece: {
      baseHeight: numberValue(workpiece.base_height, 0),
      baseWidth: numberValue(workpiece.base_width, 0),
      height: numberValue(workpiece.height, 0),
      length: numberValue(workpiece.length, 0),
      thickness: numberValue(workpiece.thickness, 0),
    },
    points: (input.points ?? [])
      .filter((point) => Number.isFinite(Number(point.error)))
      .map((point) => ({
        error: numberValue(point.error, 0),
        id: String(point.id ?? ''),
        stiffness: numberValue(point.stiffness, 0),
        x: numberValue(point.y, 0) - radialDepth,
        y: numberValue(point.z, 0),
        z: -numberValue(point.x, 0),
      })),
  })
}

export function defaultUnityToolpath(process = {}) {
  const spindleRpm = numberValue(process.spindle_speed, 3000)
  const feedRate = numberValue(process.feed_rate, 60)
  const cutSpeed = Math.max(1, feedRate / 4)
  return {
    coordinateSpace: 'workpieceLocalMm',
    start: { x: 0, y: 50, z: -8 },
    segments: [
      { mode: 'rapid', spindleRpm, speedMmPerSec: 50, to: { x: 0, y: 30, z: -8 } },
      { mode: 'rapid', spindleRpm, speedMmPerSec: 50, to: { x: -54, y: 30, z: -8 } },
      { mode: 'cut', spindleRpm, speedMmPerSec: cutSpeed, to: { x: -54, y: 30, z: 128 } },
      { mode: 'rapid', spindleRpm, speedMmPerSec: 50, to: { x: -50, y: 30, z: 128 } },
      { mode: 'rapid', spindleRpm, speedMmPerSec: 50, to: { x: -50, y: 20, z: -8 } },
      { mode: 'rapid', spindleRpm, speedMmPerSec: 50, to: { x: -54, y: 20, z: -8 } },
      { mode: 'cut', spindleRpm, speedMmPerSec: cutSpeed, to: { x: -54, y: 20, z: 128 } },
      { mode: 'rapid', spindleRpm, speedMmPerSec: 50, to: { x: -50, y: 20, z: 128 } },
      { mode: 'rapid', spindleRpm, speedMmPerSec: 50, to: { x: -50, y: 10, z: -8 } },
      { mode: 'rapid', spindleRpm, speedMmPerSec: 50, to: { x: -54, y: 10, z: -8 } },
      { mode: 'cut', spindleRpm, speedMmPerSec: cutSpeed, to: { x: -54, y: 10, z: 128 } },
      { mode: 'rapid', spindleRpm, speedMmPerSec: 50, to: { x: -54, y: 50, z: 128 } },
      { mode: 'rapid', spindleRpm, speedMmPerSec: 50, to: { x: 0, y: 50, z: -8 } },
    ],
  }
}

function numberValue(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function removeUndefined(value) {
  if (Array.isArray(value)) return value.map(removeUndefined)
  if (!value || typeof value !== 'object') return value
  return Object.entries(value).reduce((next, [key, item]) => {
    if (item !== undefined) next[key] = removeUndefined(item)
    return next
  }, {})
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
