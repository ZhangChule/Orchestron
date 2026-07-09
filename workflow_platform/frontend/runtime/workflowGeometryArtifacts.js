export const GEOMETRY_ARTIFACT_SCHEMA_VERSION = 'geometry-artifact.v0'
export const TRIDEXEL_IMAGE_FORMAT = 'unity-tridexel-image-base64'

export function createGeometryArtifact(input = {}) {
  const dataBase64 = input.data_base64 ?? input.dataBase64 ?? null
  const summary = {
    base64_length: typeof dataBase64 === 'string' ? dataBase64.length : 0,
    byte_length: typeof dataBase64 === 'string' ? base64ByteLength(dataBase64) : 0,
    ...cloneValue(input.summary ?? {}),
  }

  return {
    artifact_id: input.artifact_id ?? input.artifactId?.() ?? createGeometryArtifactId(),
    artifact_type: input.artifact_type ?? 'tridexel_image',
    created_at: input.created_at ?? timestampFrom(input.now),
    data_base64: dataBase64,
    data_ref: cloneValue(input.data_ref ?? null),
    derived_fields: cloneValue(input.derived_fields ?? {}),
    format: input.format ?? TRIDEXEL_IMAGE_FORMAT,
    geometry_metadata: normalizeGeometryMetadata(input.geometry_metadata ?? input.geometryMetadata ?? null),
    run_id: input.run_id ?? null,
    schema_version: input.schema_version ?? GEOMETRY_ARTIFACT_SCHEMA_VERSION,
    source_node_id: input.source_node_id ?? null,
    source_node_label: input.source_node_label ?? null,
    source_result_version_id: input.source_result_version_id ?? null,
    source_visualization_session_id: input.source_visualization_session_id ?? null,
    stale: input.stale ?? false,
    stale_reason: input.stale_reason ?? null,
    summary,
  }
}

export function addGeometryArtifact(state, artifact) {
  return {
    ...state,
    geometry_artifacts: [
      ...(state.geometry_artifacts ?? []),
      cloneValue(artifact),
    ],
  }
}

export function createGeometryArtifactFromUnityResult(session = {}, detail = {}, options = {}) {
  const dataBase64 = detail.triDexelImageBase64 ?? detail.tri_dexel_image_base64 ?? detail.data_base64 ?? null
  return createGeometryArtifact({
    artifact_id: options.artifact_id ?? options.artifactId?.(),
    created_at: options.created_at,
    data_base64: dataBase64,
    derived_fields: cloneValue(options.derived_fields ?? options.derivedFields ?? detail.derived_fields ?? detail.derivedFields ?? {}),
    geometry_metadata: options.geometry_metadata
      ?? options.geometryMetadata
      ?? detail.geometry_metadata
      ?? detail.geometryMetadata
      ?? geometryMetadataFromSession(session),
    run_id: session.run_id ?? options.run_id ?? null,
    source_node_id: session.virtual_node_id ?? null,
    source_node_label: session.node_display_label ?? null,
    source_result_version_id: session.node_result_version_id ?? null,
    source_visualization_session_id: session.visualization_session_id ?? null,
  })
}

export function createGeometryArtifactFromPredictionResult(session = {}, result = {}, options = {}) {
  const points = result.wallErrorPoints
    ?? result.wall_error_points
    ?? result.points
    ?? result.result?.points
    ?? []
  const currentThicknessField = options.current_thickness_field
    ?? options.currentThicknessField
    ?? createCurrentThicknessFieldFromPredictionPoints(points, {
      source_node_id: session.virtual_node_id,
      source_result_version_id: session.node_result_version_id,
    })

  return createGeometryArtifact({
    artifact_id: options.artifact_id ?? options.artifactId?.(),
    artifact_type: 'current_thickness_field',
    created_at: options.created_at,
    data_base64: null,
    derived_fields: {
      current_thickness_field: currentThicknessField,
    },
    format: 'prediction-current-thickness-field.v0',
    geometry_metadata: options.geometry_metadata
      ?? options.geometryMetadata
      ?? geometryMetadataFromSession(session),
    run_id: session.run_id ?? options.run_id ?? null,
    source_node_id: session.virtual_node_id ?? null,
    source_node_label: session.node_display_label ?? null,
    source_result_version_id: session.node_result_version_id ?? null,
    source_visualization_session_id: null,
    summary: {
      prediction_only: true,
      ...(options.summary ?? {}),
    },
  })
}

export function createGeometryArtifactFromTriDexelImport(input = {}, options = {}) {
  const dataBase64 = input.triDexelImageBase64
    ?? input.tri_dexel_image_base64
    ?? input.data_base64
    ?? input.dataBase64
    ?? null
  return createGeometryArtifact({
    artifact_id: input.artifact_id ?? input.artifactId,
    artifact_type: input.artifact_type ?? 'tridexel_image',
    created_at: input.created_at ?? options.imported_at,
    data_base64: dataBase64,
    data_ref: {
      imported_at: options.imported_at ?? timestampFrom(options.now),
      imported_file_name: options.file_name ?? options.fileName ?? null,
      imported_from_schema: input.schema_version ?? null,
      original_artifact_id: input.artifact_id ?? input.artifactId ?? null,
    },
    derived_fields: cloneValue(input.derived_fields ?? input.derivedFields ?? {}),
    format: input.format ?? TRIDEXEL_IMAGE_FORMAT,
    geometry_metadata: input.geometry_metadata ?? input.geometryMetadata ?? null,
    run_id: input.run_id ?? null,
    schema_version: GEOMETRY_ARTIFACT_SCHEMA_VERSION,
    source_node_id: input.source_node_id ?? input.sourceNodeId ?? null,
    source_node_label: input.source_node_label ?? input.sourceNodeLabel ?? null,
    source_result_version_id: input.source_result_version_id ?? input.sourceResultVersionId ?? null,
    source_visualization_session_id: input.source_visualization_session_id ?? input.sourceVisualizationSessionId ?? null,
    summary: {
      ...(input.summary ?? {}),
      imported: true,
    },
  })
}

export function createCurrentThicknessFieldFromPredictionPoints(points = [], options = {}) {
  const values = []
  const pointRefs = []

  ;(points ?? []).forEach((point, index) => {
    const currentThickness = firstFiniteNumber(
      point?.computed_actual_thickness,
      point?.computedActualThickness,
      point?.actual_thickness,
      point?.actualThickness,
      point?.current_thickness,
      point?.currentThickness,
      point?.thickness,
    )
    if (!Number.isFinite(currentThickness)) return

    values.push(currentThickness)
    pointRefs.push(removeUndefined({
      design_surface_error: numberOrUndefined(point?.design_surface_error ?? point?.designSurfaceError),
      execution_surface_error: numberOrUndefined(point?.execution_surface_error ?? point?.executionSurfaceError ?? point?.error),
      id: String(point?.id ?? point?.point_id ?? point?.pointId ?? `key-point-${index + 1}`),
      source_index: index,
      x: numberOrUndefined(point?.x),
      y: numberOrUndefined(point?.y),
      z: numberOrUndefined(point?.z),
    }))
  })

  return removeUndefined({
    field_type: 'current_thickness_field',
    point_refs: pointRefs,
    source: 'prediction_postprocess',
    source_artifact_id: options.source_artifact_id ?? options.sourceArtifactId,
    source_node_id: options.source_node_id ?? options.sourceNodeId,
    source_result_version_id: options.source_result_version_id ?? options.sourceResultVersionId,
    summary: summarizeNumericValues(values),
    values,
  })
}

export function findGeometryArtifactsForNode(state, virtualNodeId) {
  return cloneValue((state.geometry_artifacts ?? [])
    .filter((artifact) => artifact.source_node_id === virtualNodeId))
}

export function findGeometryArtifactById(state, artifactId) {
  return cloneValue((state.geometry_artifacts ?? [])
    .find((artifact) => artifact.artifact_id === artifactId) ?? null)
}

export function findLatestFreshGeometryArtifactForNode(state, virtualNodeId) {
  const matches = (state.geometry_artifacts ?? [])
    .filter((artifact) => artifact.source_node_id === virtualNodeId && !artifact.stale)
  return cloneValue(matches.at(-1) ?? null)
}

export function resolveGeometryArtifactForVirtualNode(state, node) {
  const source = node?.params?.workpiece_source ?? {}
  const mode = source.mode ?? 'parametric'
  if (mode === 'file') {
    const geometryArtifactId = source.geometry_artifact_id ?? source.geometryArtifactId ?? null
    if (!geometryArtifactId) {
      return {
        error_code: 'geometry_file_artifact_missing',
        message: `Virtual node ${node?.id ?? 'unknown'} is configured for file geometry but has no tri-dexel artifact selected.`,
        ok: false,
        source_mode: mode,
      }
    }
    const artifact = findGeometryArtifactById(state, geometryArtifactId)
    if (!artifact || artifact.stale) {
      return {
        error_code: artifact?.stale ? 'geometry_artifact_stale' : 'geometry_artifact_missing',
        geometry_artifact_id: geometryArtifactId,
        message: artifact?.stale
          ? `Tri-dexel geometry artifact ${geometryArtifactId} is stale.`
          : `Tri-dexel geometry artifact ${geometryArtifactId} is not available.`,
        ok: false,
        source_mode: mode,
      }
    }
    return {
      artifact,
      geometry_artifact_id: geometryArtifactId,
      ok: true,
      source_mode: mode,
    }
  }
  if (mode !== 'upstream_node') {
    return {
      artifact: null,
      ok: true,
      source_mode: mode,
    }
  }

  const upstreamVirtualNodeId = source.upstream_virtual_node_id ?? source.upstreamVirtualNodeId ?? null
  if (!upstreamVirtualNodeId) {
    return {
      error_code: 'geometry_source_missing',
      message: `Virtual node ${node?.id ?? 'unknown'} is configured for upstream geometry but has no upstream virtual node selected.`,
      ok: false,
      source_mode: mode,
      upstream_virtual_node_id: null,
    }
  }

  const artifact = findLatestFreshGeometryArtifactForNode(state, upstreamVirtualNodeId)
  if (!artifact) {
    return {
      error_code: 'geometry_artifact_missing',
      message: `No fresh geometry artifact or current thickness field is available from upstream node ${upstreamVirtualNodeId}. Run the upstream virtual machining node first.`,
      ok: false,
      source_mode: mode,
      upstream_virtual_node_id: upstreamVirtualNodeId,
    }
  }

  return {
    artifact,
    ok: true,
    source_mode: mode,
    upstream_virtual_node_id: upstreamVirtualNodeId,
  }
}

export function createGeometryArtifactEvent(eventType, input = {}) {
  const artifactId = input.artifact_id ?? input.artifactId ?? null
  const summary = input.summary ?? summaryForGeometryEvent(eventType, artifactId)
  return {
    event_type: eventType,
    node_id: input.consumer_node_id ?? input.source_node_id ?? null,
    node_type: input.node_type ?? 'virtual',
    payload: {
      artifact_id: artifactId,
      consumer_node_id: input.consumer_node_id ?? null,
      error: cloneValue(input.error ?? null),
      field_summary: cloneValue(input.field_summary ?? null),
      source_node_id: input.source_node_id ?? null,
      source_result_version_id: input.source_result_version_id ?? null,
      source_visualization_session_id: input.source_visualization_session_id ?? null,
      stale: input.stale ?? false,
      ...(input.skip_reason ? { skip_reason: input.skip_reason } : {}),
    },
    run_id: input.run_id ?? null,
    summary,
    timestamp: input.timestamp ?? timestampFrom(input.now),
  }
}

export function deriveCurrentThicknessFieldFromTriDexelArtifact(artifact, options = {}) {
  const sourceArtifactId = artifact?.artifact_id ?? null
  const explicitField = artifact?.derived_fields?.current_thickness_field
    ?? options.current_thickness_field
    ?? options.currentThicknessField
    ?? null
  const normalizedExplicitField = normalizeThicknessField(explicitField, sourceArtifactId)
  if (normalizedExplicitField) {
    return {
      field: normalizedExplicitField,
      ok: true,
    }
  }

  const decodedJson = decodeBase64Json(artifact?.data_base64)
  const decodedField = decodedJson?.current_thickness_field
    ?? decodedJson?.currentThicknessField
    ?? decodedJson?.thickness_field
    ?? decodedJson?.thicknessField
    ?? null
  const normalizedDecodedField = normalizeThicknessField(decodedField, sourceArtifactId)
  if (normalizedDecodedField) {
    return {
      field: normalizedDecodedField,
      ok: true,
    }
  }

  return {
    error_code: 'tri_dexel_thickness_parser_missing',
    message: 'Current thickness field cannot be derived from this tri-dexel artifact without a parser or explicit derived field.',
    ok: false,
    source_artifact_id: sourceArtifactId,
  }
}

export function validateGeometryArtifactForUnityPreview(artifact) {
  const sourceArtifactId = artifact?.artifact_id ?? null
  if (!artifact?.data_base64) {
    return {
      error_code: 'geometry_preview_image_missing',
      message: `TriDexel geometry artifact ${sourceArtifactId ?? 'unknown'} cannot be previewed because it has no tri-dexel image data.`,
      ok: false,
      source_artifact_id: sourceArtifactId,
    }
  }

  const workpiece = artifact.geometry_metadata?.workpiece
  const requiredFields = ['length', 'height', 'thickness', 'base_width', 'base_height']
  const missingFields = requiredFields.filter((field) => !Number.isFinite(Number(workpiece?.[field])))
  if (missingFields.length) {
    return {
      error_code: 'geometry_preview_metadata_missing',
      message: `TriDexel geometry artifact ${sourceArtifactId ?? 'unknown'} cannot be previewed because it lacks geometry_metadata.workpiece. Re-export it with the current workflow build.`,
      ok: false,
      source_artifact_id: sourceArtifactId,
    }
  }

  return {
    ok: true,
    source_artifact_id: sourceArtifactId,
  }
}

export function workpieceDimensionsFromGeometryArtifact(artifact) {
  const metadata = artifact?.geometry_metadata ?? null
  const workpiece = normalizeWorkpieceDimensions(metadata?.workpiece ?? null)
  if (!workpiece) return null
  const designSurfaceThickness = finiteNumberOrUndefined(
    metadata.design_surface_thickness ?? metadata.designSurfaceThickness,
  )
  if (designSurfaceThickness == null) return workpiece
  return {
    ...workpiece,
    thickness: designSurfaceThickness,
  }
}

export function createExecutionRadialDepthField(input = {}) {
  const currentThicknessField = input.current_thickness_field ?? input.currentThicknessField ?? {}
  const executionSurfaceThickness = Number(input.execution_surface_thickness ?? input.executionSurfaceThickness)
  if (!Number.isFinite(executionSurfaceThickness)) {
    throw new Error('execution_surface_thickness must be a finite number.')
  }
  const values = mapNumericValues(currentThicknessField.values ?? [], (value) => value - executionSurfaceThickness)
  return {
    field_type: 'execution_radial_depth_field',
    point_refs: cloneValue(currentThicknessField.point_refs ?? currentThicknessField.pointRefs ?? []),
    source_artifact_id: currentThicknessField.source_artifact_id ?? null,
    summary: summarizeNumericValues(values),
    values,
  }
}

function summaryForGeometryEvent(eventType, artifactId) {
  const suffix = artifactId ? `: ${artifactId}` : ''
  if (eventType === 'geometry_artifact_created') return `Geometry artifact created${suffix}`
  if (eventType === 'geometry_artifact_imported') return `Geometry artifact imported${suffix}`
  if (eventType === 'geometry_artifact_marked_stale') return `Geometry artifact marked stale${suffix}`
  if (eventType === 'geometry_artifact_missing') return `Geometry artifact missing${suffix}`
  if (eventType === 'geometry_artifact_import_failed') return `Geometry artifact import failed${suffix}`
  if (eventType === 'current_thickness_field_derived') return `Current thickness field derived${suffix}`
  if (eventType === 'current_thickness_field_artifact_created') return `Current thickness field artifact created${suffix}`
  if (eventType === 'current_thickness_field_parse_failed') return `Current thickness field parse failed${suffix}`
  return `Geometry event${suffix}`
}

function geometryMetadataFromSession(session = {}) {
  const scenePayload = session.scene_payload ?? session.scenePayload ?? {}
  const unityPayload = session.unity_payload ?? session.unityPayload ?? {}
  const explicitMetadata = normalizeGeometryMetadata(scenePayload.geometry_metadata ?? scenePayload.geometryMetadata ?? null)
  if (explicitMetadata) return explicitMetadata
  const workpiece = normalizeWorkpieceDimensions(unityPayload.workpiece ?? scenePayload.workpiece ?? null)
  if (!workpiece) return null

  return removeUndefined({
    coordinate_space: unityPayload.toolpath?.coordinateSpace
      ?? unityPayload.toolpath?.coordinate_space
      ?? scenePayload.toolpath?.coordinateSpace
      ?? scenePayload.toolpath?.coordinate_space,
    design_surface_thickness: designSurfaceThicknessFromPayload(scenePayload)
      ?? designSurfaceThicknessFromPayload(unityPayload),
    workpiece,
  })
}

function normalizeGeometryMetadata(value) {
  if (!value) return null
  const workpiece = normalizeWorkpieceDimensions(value.workpiece ?? null)
  if (!workpiece) return null
  return removeUndefined({
    coordinate_space: value.coordinate_space ?? value.coordinateSpace,
    design_surface_thickness: finiteNumberOrUndefined(value.design_surface_thickness ?? value.designSurfaceThickness),
    workpiece,
  })
}

function designSurfaceThicknessFromPayload(payload = {}) {
  return finiteNumberOrUndefined(
    payload.thickness_semantics?.design_surface_thickness
      ?? payload.thickness_semantics?.designSurfaceThickness
      ?? payload.thicknessSemantics?.design_surface_thickness
      ?? payload.thicknessSemantics?.designSurfaceThickness
      ?? payload.design_surface_thickness
      ?? payload.designSurfaceThickness,
  )
}

function normalizeWorkpieceDimensions(value) {
  if (!value) return null
  const workpiece = removeUndefined({
    base_height: finiteNumberOrUndefined(value.base_height ?? value.baseHeight),
    base_width: finiteNumberOrUndefined(value.base_width ?? value.baseWidth),
    height: finiteNumberOrUndefined(value.height),
    length: finiteNumberOrUndefined(value.length),
    thickness: finiteNumberOrUndefined(value.thickness),
  })
  return Object.keys(workpiece).length ? workpiece : null
}

function normalizeThicknessField(field, sourceArtifactId) {
  if (!field) return null
  const values = cloneValue(field.values ?? field.data ?? null)
  const flattened = flattenNumericValues(values)
  if (!flattened.length) return null
  return {
    field_type: 'current_thickness_field',
    point_refs: cloneValue(field.point_refs ?? field.pointRefs ?? []),
    source_artifact_id: field.source_artifact_id ?? sourceArtifactId,
    summary: summarizeNumericValues(values),
    values,
  }
}

function decodeBase64Json(value) {
  const text = decodeBase64Text(value)
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (error) {
    return null
  }
}

function decodeBase64Text(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const base64 = value.split(',').at(-1).replace(/\s/g, '')
  if (!base64) return null
  if (typeof atob !== 'function') return null
  try {
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    if (typeof TextDecoder === 'function') return new TextDecoder().decode(bytes)
    return binary
  } catch (error) {
    return null
  }
}

function mapNumericValues(value, mapper) {
  if (Array.isArray(value)) return value.map((item) => mapNumericValues(item, mapper))
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return value
  return mapper(numericValue)
}

function flattenNumericValues(value) {
  if (Array.isArray(value)) return value.flatMap(flattenNumericValues)
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? [numericValue] : []
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const numericValue = Number(value)
    if (Number.isFinite(numericValue)) return numericValue
  }
  return NaN
}

function numberOrUndefined(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function finiteNumberOrUndefined(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function removeUndefined(value) {
  if (Array.isArray(value)) return value.map(removeUndefined)
  if (!value || typeof value !== 'object') return value
  return Object.entries(value).reduce((next, [key, item]) => {
    if (item !== undefined) next[key] = removeUndefined(item)
    return next
  }, {})
}

function summarizeNumericValues(value) {
  const values = flattenNumericValues(value)
  if (!values.length) {
    return {
      count: 0,
      max: null,
      mean: null,
      min: null,
    }
  }
  return {
    count: values.length,
    max: Math.max(...values),
    mean: values.reduce((sum, item) => sum + item, 0) / values.length,
    min: Math.min(...values),
  }
}

function base64ByteLength(value) {
  const base64 = String(value).split(',').at(-1).replace(/\s/g, '')
  if (!base64) return 0
  const padding = base64.endsWith('==') ? 2 : (base64.endsWith('=') ? 1 : 0)
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

function timestampFrom(now) {
  if (typeof now === 'function') return now()
  return new Date().toISOString()
}

function createGeometryArtifactId() {
  return `geo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
