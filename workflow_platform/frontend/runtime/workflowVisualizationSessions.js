export const VISUALIZATION_SESSION_SCHEMA_VERSION = 'workflow-visualization-session.v1'

export function createVisualizationSession(input = {}) {
  const unityPayload = cloneValue(input.unity_payload ?? input.unityPayload ?? {})
  const sessionId = input.visualization_session_id
    ?? input.visualizationSessionId?.()
    ?? createVisualizationSessionId()
  return {
    active: input.active ?? false,
    created_at: input.created_at ?? timestampFrom(input.now),
    created_by: input.created_by ?? 'manual_preview',
    node_display_label: input.node_display_label ?? input.nodeDisplayLabel ?? input.virtual_node_id ?? null,
    geometry_artifact_id: input.geometry_artifact_id ?? input.geometryArtifactId ?? null,
    node_result_version_id: input.node_result_version_id ?? input.nodeResultVersionId ?? null,
    parameter_base_version_id: input.parameter_base_version_id ?? input.parameterBaseVersionId ?? null,
    payload_schema_version: input.payload_schema_version ?? VISUALIZATION_SESSION_SCHEMA_VERSION,
    payload_summary: summarizeUnityPayload(unityPayload),
    preview_session_id: input.preview_session_id ?? input.previewSessionId ?? sessionId,
    runtime_warning: input.runtime_warning ?? input.runtimeWarning ?? null,
    scene_payload: cloneValue(input.scene_payload ?? input.scenePayload ?? null),
    status: input.status ?? 'ready',
    unity_payload: unityPayload,
    unity_payload_ref: input.unity_payload_ref ?? input.unityPayloadRef ?? null,
    virtual_node_id: input.virtual_node_id ?? input.virtualNodeId ?? null,
    visualization_session_id: sessionId,
  }
}

export function addVisualizationSession(state, session) {
  return {
    ...state,
    visualization_sessions: [
      ...(state.visualization_sessions ?? []),
      cloneValue(session),
    ],
  }
}

export function latestVisualizationSessionForNode(state, virtualNodeId) {
  const matches = (state.visualization_sessions ?? [])
    .filter((session) => session.virtual_node_id === virtualNodeId)
  return cloneValue(matches.at(-1) ?? null)
}

export function findVisualizationSession(state, sessionId) {
  return cloneValue((state.visualization_sessions ?? [])
    .find((session) => session.visualization_session_id === sessionId) ?? null)
}

export function activateVisualizationSession(state, sessionId, options = {}) {
  const timestamp = timestampFrom(options.now)
  return {
    ...state,
    active_visualization_session_id: sessionId,
    updated_at: timestamp,
    visualization_sessions: (state.visualization_sessions ?? []).map((session) => {
      const active = session.visualization_session_id === sessionId
      return {
        ...cloneValue(session),
        active,
        status: active ? 'previewing' : (session.status === 'previewing' ? 'ready' : session.status),
        updated_at: active ? timestamp : session.updated_at,
      }
    }),
  }
}

export function completeVisualizationSession(state, sessionId, options = {}) {
  return setVisualizationSessionStatus(state, sessionId, 'completed', options)
}

export function failVisualizationSession(state, sessionId, options = {}) {
  return setVisualizationSessionStatus(state, sessionId, 'failed', options)
}

export function invalidateVisualizationSession(state, sessionId, options = {}) {
  const timestamp = timestampFrom(options.now)
  return {
    ...state,
    active_visualization_session_id: state.active_visualization_session_id === sessionId ? null : state.active_visualization_session_id ?? null,
    updated_at: timestamp,
    visualization_sessions: (state.visualization_sessions ?? []).map((session) => {
      if (session.visualization_session_id !== sessionId) return session
      return {
        ...cloneValue(session),
        active: false,
        invalidated_at: timestamp,
        runtime_warning: options.runtime_warning ?? options.runtimeWarning ?? session.runtime_warning ?? null,
        status: 'invalidated',
        updated_at: timestamp,
      }
    }),
  }
}

export function visualizationSessionDiagnostics(session) {
  if (!session) return ''
  const summary = session.payload_summary ?? {}
  const parts = [
    session.node_display_label,
    session.virtual_node_id,
    session.node_result_version_id,
    `points=${summary.point_count ?? 0}`,
  ].filter(Boolean)
  if (summary.radial_depth != null) parts.push(`radialDepth=${summary.radial_depth}`)
  return parts.join(' / ')
}

export function summarizeUnityPayload(payload = {}) {
  const points = Array.isArray(payload.points) ? payload.points : []
  const errors = points
    .map((point) => Number(point.error))
    .filter(Number.isFinite)
  const absErrors = errors.map(Math.abs)
  return removeUndefined({
    error_max: errors.length ? Math.max(...errors) : null,
    error_min: errors.length ? Math.min(...errors) : null,
    max_abs_error: absErrors.length ? Math.max(...absErrors) : null,
    point_count: points.length,
    radial_depth: numberOrNull(payload.process?.radialDepth ?? payload.process?.radial_depth),
    toolpath_segment_count: Array.isArray(payload.toolpath?.segments) ? payload.toolpath.segments.length : null,
  })
}

function setVisualizationSessionStatus(state, sessionId, status, options = {}) {
  const timestamp = timestampFrom(options.now)
  return {
    ...state,
    updated_at: timestamp,
    visualization_sessions: (state.visualization_sessions ?? []).map((session) => {
      if (session.visualization_session_id !== sessionId) return session
      return {
        ...cloneValue(session),
        error: options.error ?? session.error ?? null,
        status,
        updated_at: timestamp,
      }
    }),
  }
}

function numberOrNull(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function removeUndefined(value) {
  if (Array.isArray(value)) return value.map(removeUndefined)
  if (!value || typeof value !== 'object') return value
  return Object.entries(value).reduce((next, [key, item]) => {
    if (item !== undefined && item !== null) next[key] = removeUndefined(item)
    return next
  }, {})
}

function timestampFrom(now) {
  if (typeof now === 'function') return now()
  return new Date().toISOString()
}

function createVisualizationSessionId() {
  return `vis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
