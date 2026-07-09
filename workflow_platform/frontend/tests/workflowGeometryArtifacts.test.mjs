import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addGeometryArtifact,
  createGeometryArtifactFromPredictionResult,
  createGeometryArtifactFromUnityResult,
  createGeometryArtifactFromTriDexelImport,
  createGeometryArtifactEvent,
  createGeometryArtifact,
  createCurrentThicknessFieldFromPredictionPoints,
  createExecutionRadialDepthField,
  deriveCurrentThicknessFieldFromTriDexelArtifact,
  findGeometryArtifactsForNode,
  findLatestFreshGeometryArtifactForNode,
  resolveGeometryArtifactForVirtualNode,
  validateGeometryArtifactForUnityPreview,
  workpieceDimensionsFromGeometryArtifact,
} from '../runtime/workflowGeometryArtifacts.js'

test('createGeometryArtifact creates a minimal tri-dexel geometry artifact without mutating input', () => {
  const input = {
    artifact_id: 'geo-1',
    created_at: '2026-06-26T00:00:00.000Z',
    data_base64: 'YWJjZA==',
    run_id: 'run-1',
    source_node_id: 'virtual-1',
    source_node_label: '#1 Virtual Machining',
    source_result_version_id: 'result-version-1',
    source_visualization_session_id: 'vis-1',
    summary: { custom: true },
  }

  const artifact = createGeometryArtifact(input)
  input.summary.custom = false

  assert.deepEqual(artifact, {
    artifact_id: 'geo-1',
    artifact_type: 'tridexel_image',
    created_at: '2026-06-26T00:00:00.000Z',
    data_base64: 'YWJjZA==',
    data_ref: null,
    derived_fields: {},
    format: 'unity-tridexel-image-base64',
    geometry_metadata: null,
    run_id: 'run-1',
    schema_version: 'geometry-artifact.v0',
    source_node_id: 'virtual-1',
    source_node_label: '#1 Virtual Machining',
    source_result_version_id: 'result-version-1',
    source_visualization_session_id: 'vis-1',
    stale: false,
    stale_reason: null,
    summary: {
      base64_length: 8,
      byte_length: 4,
      custom: true,
    },
  })
})

test('geometry artifact helpers append, query, and return the latest fresh artifact for a source node', () => {
  const stale = createGeometryArtifact({
    artifact_id: 'geo-old',
    created_at: '2026-06-26T00:00:00.000Z',
    data_base64: 'b2xk',
    source_node_id: 'virtual-1',
    stale: true,
    stale_reason: 'upstream config changed',
  })
  const fresh = createGeometryArtifact({
    artifact_id: 'geo-new',
    created_at: '2026-06-26T00:01:00.000Z',
    data_base64: 'bmV3',
    source_node_id: 'virtual-1',
  })
  const other = createGeometryArtifact({
    artifact_id: 'geo-other',
    data_base64: 'b3RoZXI=',
    source_node_id: 'virtual-2',
  })

  const state = [stale, fresh, other].reduce(
    (nextState, artifact) => addGeometryArtifact(nextState, artifact),
    { geometry_artifacts: [] },
  )

  assert.deepEqual(findGeometryArtifactsForNode(state, 'virtual-1').map((artifact) => artifact.artifact_id), [
    'geo-old',
    'geo-new',
  ])
  assert.equal(findLatestFreshGeometryArtifactForNode(state, 'virtual-1').artifact_id, 'geo-new')
  assert.equal(findLatestFreshGeometryArtifactForNode(state, 'virtual-2').artifact_id, 'geo-other')
})

test('resolveGeometryArtifactForVirtualNode resolves an upstream-node geometry source', () => {
  const artifact = createGeometryArtifact({
    artifact_id: 'geo-upstream',
    data_base64: 'dHJp',
    source_node_id: 'virtual-a',
  })
  const state = addGeometryArtifact({ geometry_artifacts: [] }, artifact)
  const node = {
    id: 'virtual-b',
    params: {
      workpiece_source: {
        mode: 'upstream_node',
        upstream_virtual_node_id: 'virtual-a',
      },
    },
  }

  const resolution = resolveGeometryArtifactForVirtualNode(state, node)

  assert.equal(resolution.ok, true)
  assert.equal(resolution.artifact.artifact_id, 'geo-upstream')
  assert.equal(resolution.source_mode, 'upstream_node')
})

test('resolveGeometryArtifactForVirtualNode reports a missing upstream artifact instead of falling back silently', () => {
  const resolution = resolveGeometryArtifactForVirtualNode({ geometry_artifacts: [] }, {
    id: 'virtual-b',
    params: {
      workpiece_source: {
        mode: 'upstream_node',
        upstream_virtual_node_id: 'virtual-a',
      },
    },
  })

  assert.deepEqual(resolution, {
    error_code: 'geometry_artifact_missing',
    message: 'No fresh geometry artifact or current thickness field is available from upstream node virtual-a. Run the upstream virtual machining node first.',
    ok: false,
    source_mode: 'upstream_node',
    upstream_virtual_node_id: 'virtual-a',
  })
})

test('createGeometryArtifactFromTriDexelImport restores an exported tri-dexel file payload', () => {
  const artifact = createGeometryArtifactFromTriDexelImport({
    artifact_id: 'geo-exported',
    artifact_type: 'tridexel_image',
    created_at: '2026-06-27T00:00:00.000Z',
    format: 'unity-tridexel-image-base64',
    run_id: 'run-exported',
    schema_version: 'workflow-tridexel-image-export.v0',
    source_node_id: 'virtual-source',
    source_node_label: '#1 Virtual Machining',
    source_result_version_id: 'result-version-exported',
    source_visualization_session_id: 'vis-exported',
    derived_fields: {
      current_thickness_field: {
        point_refs: [{ id: 'K1' }, { id: 'K2' }],
        values: [5.02, 4.98],
      },
    },
    geometry_metadata: {
      coordinate_space: 'workpieceLocalMm',
      workpiece: {
        base_height: 15,
        base_width: 120,
        height: 55,
        length: 120,
        thickness: 6,
      },
    },
    summary: { base64_length: 4 },
    triDexelImageBase64: 'dHJp',
  }, {
    imported_at: '2026-06-27T00:01:00.000Z',
  })

  assert.equal(artifact.artifact_id, 'geo-exported')
  assert.equal(artifact.data_base64, 'dHJp')
  assert.equal(artifact.data_ref?.imported_from_schema, 'workflow-tridexel-image-export.v0')
  assert.equal(artifact.source_node_id, 'virtual-source')
  assert.equal(artifact.source_visualization_session_id, 'vis-exported')
  assert.equal(artifact.summary.imported, true)
  assert.deepEqual(artifact.geometry_metadata, {
    coordinate_space: 'workpieceLocalMm',
    workpiece: {
      base_height: 15,
      base_width: 120,
      height: 55,
      length: 120,
      thickness: 6,
    },
  })
  assert.deepEqual(
    deriveCurrentThicknessFieldFromTriDexelArtifact(artifact).field.values,
    [5.02, 4.98],
  )
})

test('resolveGeometryArtifactForVirtualNode resolves a file geometry artifact by id', () => {
  const artifact = createGeometryArtifact({
    artifact_id: 'geo-file',
    data_base64: 'dHJp',
    source_node_id: 'imported-file',
  })
  const state = addGeometryArtifact({ geometry_artifacts: [] }, artifact)

  const resolution = resolveGeometryArtifactForVirtualNode(state, {
    id: 'virtual-consumer',
    params: {
      workpiece_source: {
        mode: 'file',
        geometry_artifact_id: 'geo-file',
      },
    },
  })

  assert.equal(resolution.ok, true)
  assert.equal(resolution.source_mode, 'file')
  assert.equal(resolution.artifact.artifact_id, 'geo-file')
})

test('createGeometryArtifactEvent creates a readable geometry event payload', () => {
  const event = createGeometryArtifactEvent('geometry_artifact_created', {
    artifact_id: 'geo-1',
    consumer_node_id: 'virtual-2',
    error: null,
    field_summary: { count: 6, mean: 5.91 },
    run_id: 'run-1',
    source_node_id: 'virtual-1',
    source_result_version_id: 'result-version-1',
    source_visualization_session_id: 'vis-1',
    timestamp: '2026-06-26T00:02:00.000Z',
  })

  assert.equal(event.event_type, 'geometry_artifact_created')
  assert.equal(event.run_id, 'run-1')
  assert.equal(event.node_id, 'virtual-2')
  assert.equal(event.node_type, 'virtual')
  assert.equal(event.summary, 'Geometry artifact created: geo-1')
  assert.deepEqual(event.payload, {
    artifact_id: 'geo-1',
    consumer_node_id: 'virtual-2',
    error: null,
    field_summary: { count: 6, mean: 5.91 },
    source_node_id: 'virtual-1',
    source_result_version_id: 'result-version-1',
    source_visualization_session_id: 'vis-1',
    stale: false,
  })
})

test('createGeometryArtifactFromUnityResult binds Unity completed data to a visualization session', () => {
  const artifact = createGeometryArtifactFromUnityResult({
    scene_payload: {
      thickness_semantics: {
        design_surface_thickness: 5,
      },
      workpiece: {
        base_height: 15,
        base_width: 120,
        height: 55,
        length: 120,
        thickness: 6,
      },
    },
    unity_payload: {
      toolpath: {
        coordinateSpace: 'workpieceLocalMm',
        segments: [],
      },
    },
    node_display_label: '#2 Virtual Machining',
    node_result_version_id: 'result-version-2',
    run_id: 'run-2',
    virtual_node_id: 'virtual-2',
    visualization_session_id: 'vis-2',
  }, {
    triDexelImageBase64: 'dHJp',
  }, {
    artifact_id: 'geo-from-unity',
    created_at: '2026-06-26T00:03:00.000Z',
  })

  assert.equal(artifact.artifact_id, 'geo-from-unity')
  assert.equal(artifact.data_base64, 'dHJp')
  assert.equal(artifact.run_id, 'run-2')
  assert.equal(artifact.source_node_id, 'virtual-2')
  assert.equal(artifact.source_node_label, '#2 Virtual Machining')
  assert.equal(artifact.source_result_version_id, 'result-version-2')
  assert.equal(artifact.source_visualization_session_id, 'vis-2')
  assert.deepEqual(artifact.geometry_metadata, {
    coordinate_space: 'workpieceLocalMm',
    design_surface_thickness: 5,
    workpiece: {
      base_height: 15,
      base_width: 120,
      height: 55,
      length: 120,
      thickness: 6,
    },
  })
})

test('workpieceDimensionsFromGeometryArtifact uses upstream design surface as the effective thickness', () => {
  const artifact = createGeometryArtifact({
    geometry_metadata: {
      coordinate_space: 'workpieceLocalMm',
      design_surface_thickness: 5,
      workpiece: {
        baseHeight: 15,
        baseWidth: 120,
        height: 55,
        length: 120,
        thickness: 6,
      },
    },
  })

  assert.deepEqual(workpieceDimensionsFromGeometryArtifact(artifact), {
    base_height: 15,
    base_width: 120,
    height: 55,
    length: 120,
    thickness: 5,
  })
})

test('validateGeometryArtifactForUnityPreview rejects legacy artifacts without geometry metadata', () => {
  const artifact = createGeometryArtifact({
    artifact_id: 'geo-legacy',
    data_base64: 'dHJp',
  })

  assert.deepEqual(validateGeometryArtifactForUnityPreview(artifact), {
    error_code: 'geometry_preview_metadata_missing',
    message: 'TriDexel geometry artifact geo-legacy cannot be previewed because it lacks geometry_metadata.workpiece. Re-export it with the current workflow build.',
    ok: false,
    source_artifact_id: 'geo-legacy',
  })
})

test('validateGeometryArtifactForUnityPreview accepts artifacts with image data and workpiece envelope metadata', () => {
  const artifact = createGeometryArtifact({
    artifact_id: 'geo-ready',
    data_base64: 'dHJp',
    geometry_metadata: {
      coordinate_space: 'workpieceLocalMm',
      workpiece: {
        base_height: 15,
        base_width: 120,
        height: 55,
        length: 120,
        thickness: 6,
      },
    },
  })

  assert.deepEqual(validateGeometryArtifactForUnityPreview(artifact), {
    ok: true,
    source_artifact_id: 'geo-ready',
  })
})

test('workpieceDimensionsFromGeometryArtifact returns backend-ready artifact envelope dimensions', () => {
  const artifact = createGeometryArtifact({
    geometry_metadata: {
      workpiece: {
        baseHeight: 15,
        baseWidth: 120,
        height: 55,
        length: 120,
        thickness: 6,
      },
    },
  })

  assert.deepEqual(workpieceDimensionsFromGeometryArtifact(artifact), {
    base_height: 15,
    base_width: 120,
    height: 55,
    length: 120,
    thickness: 6,
  })
})

test('createCurrentThicknessFieldFromPredictionPoints captures computed actual thickness for artifact reuse', () => {
  const field = createCurrentThicknessFieldFromPredictionPoints([
    {
      computed_actual_thickness: 5.02,
      design_surface_error: 0.02,
      execution_surface_error: 0.1,
      id: 'K1',
      x: 1,
      y: 2,
      z: 3,
    },
    {
      computed_actual_thickness: 4.98,
      design_surface_error: -0.02,
      execution_surface_error: 0.06,
      id: 'K2',
      x: 4,
      y: 5,
      z: 6,
    },
  ], {
    source_node_id: 'virtual-1',
    source_result_version_id: 'result-version-1',
  })

  assert.deepEqual(field, {
    field_type: 'current_thickness_field',
    point_refs: [
      {
        design_surface_error: 0.02,
        execution_surface_error: 0.1,
        id: 'K1',
        source_index: 0,
        x: 1,
        y: 2,
        z: 3,
      },
      {
        design_surface_error: -0.02,
        execution_surface_error: 0.06,
        id: 'K2',
        source_index: 1,
        x: 4,
        y: 5,
        z: 6,
      },
    ],
    source: 'prediction_postprocess',
    source_node_id: 'virtual-1',
    source_result_version_id: 'result-version-1',
    summary: {
      count: 2,
      max: 5.02,
      mean: 5,
      min: 4.98,
    },
    values: [5.02, 4.98],
  })
})

test('createGeometryArtifactFromUnityResult can carry prediction-derived current thickness field', () => {
  const field = createCurrentThicknessFieldFromPredictionPoints([
    { computed_actual_thickness: 5.02, id: 'K1' },
    { computed_actual_thickness: 4.98, id: 'K2' },
  ])
  const artifact = createGeometryArtifactFromUnityResult({
    node_display_label: '#2 Virtual Machining',
    node_result_version_id: 'result-version-2',
    run_id: 'run-2',
    virtual_node_id: 'virtual-2',
    visualization_session_id: 'vis-2',
  }, {
    triDexelImageBase64: 'dHJp',
  }, {
    artifact_id: 'geo-from-unity',
    derived_fields: {
      current_thickness_field: field,
    },
  })

  const derived = deriveCurrentThicknessFieldFromTriDexelArtifact(artifact)

  assert.equal(derived.ok, true)
  assert.deepEqual(derived.field.values, [5.02, 4.98])
  assert.deepEqual(derived.field.point_refs.map((item) => item.id), ['K1', 'K2'])
})

test('createGeometryArtifactFromPredictionResult creates a computation-only upstream artifact', () => {
  const artifact = createGeometryArtifactFromPredictionResult(
    {
      node_display_label: '#1 Virtual Machining',
      node_result_version_id: 'nrv-1',
      scene_payload: {
        workpiece: {
          base_height: 15,
          base_width: 120,
          height: 55,
          length: 120,
          thickness: 6,
        },
      },
      virtual_node_id: 'virtual-machining-1',
    },
    {
      wallErrorPoints: [
        {
          computed_actual_thickness: 5.12,
          design_surface_error: 0.12,
          error: 0.12,
          id: 'K1_J1_I1',
          x: 0,
          y: 5,
          z: 55,
        },
      ],
    },
    {
      run_id: 'run-1',
      now: () => '2026-06-29T00:00:00.000Z',
    },
  )

  assert.equal(artifact.artifact_type, 'current_thickness_field')
  assert.equal(artifact.data_base64, null)
  assert.equal(artifact.format, 'prediction-current-thickness-field.v0')
  assert.equal(artifact.source_node_id, 'virtual-machining-1')
  assert.equal(artifact.source_result_version_id, 'nrv-1')
  assert.equal(artifact.source_visualization_session_id, null)
  assert.equal(artifact.derived_fields.current_thickness_field.values[0], 5.12)
  assert.equal(artifact.summary.prediction_only, true)
})

test('deriveCurrentThicknessFieldFromTriDexelArtifact returns an explicit derived field when available', () => {
  const artifact = createGeometryArtifact({
    artifact_id: 'geo-field',
    data_base64: 'opaque',
    derived_fields: {
      current_thickness_field: {
        point_refs: ['K1', 'K2', 'K3'],
        values: [6, 5.92, 5.88],
      },
    },
  })

  const field = deriveCurrentThicknessFieldFromTriDexelArtifact(artifact)

  assert.equal(field.ok, true)
  assert.deepEqual(field.field, {
    field_type: 'current_thickness_field',
    point_refs: ['K1', 'K2', 'K3'],
    source_artifact_id: 'geo-field',
    summary: {
      count: 3,
      max: 6,
      mean: 5.933333333333334,
      min: 5.88,
    },
    values: [6, 5.92, 5.88],
  })
})

test('deriveCurrentThicknessFieldFromTriDexelArtifact can read a base64 encoded JSON thickness field', () => {
  const payload = {
    current_thickness_field: {
      point_refs: ['K1', 'K2'],
      values: [6, 5.9],
    },
  }
  const artifact = createGeometryArtifact({
    artifact_id: 'geo-json',
    data_base64: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
  })

  const field = deriveCurrentThicknessFieldFromTriDexelArtifact(artifact)

  assert.equal(field.ok, true)
  assert.deepEqual(field.field.point_refs, ['K1', 'K2'])
  assert.deepEqual(field.field.values, [6, 5.9])
  assert.deepEqual(field.field.summary, {
    count: 2,
    max: 6,
    mean: 5.95,
    min: 5.9,
  })
})

test('deriveCurrentThicknessFieldFromTriDexelArtifact reports a parser boundary when field data is unavailable', () => {
  const artifact = createGeometryArtifact({
    artifact_id: 'geo-opaque',
    data_base64: 'not-json-and-not-a-field',
  })

  const field = deriveCurrentThicknessFieldFromTriDexelArtifact(artifact)

  assert.deepEqual(field, {
    error_code: 'tri_dexel_thickness_parser_missing',
    message: 'Current thickness field cannot be derived from this tri-dexel artifact without a parser or explicit derived field.',
    ok: false,
    source_artifact_id: 'geo-opaque',
  })
})

test('createExecutionRadialDepthField subtracts execution surface thickness from each current thickness value', () => {
  const radialDepthField = createExecutionRadialDepthField({
    current_thickness_field: {
      field_type: 'current_thickness_field',
      point_refs: ['K1', 'K2', 'K3'],
      source_artifact_id: 'geo-1',
      values: [6, 5.92, 5.88],
    },
    execution_surface_thickness: 5.9,
  })

  assert.deepEqual({
    ...radialDepthField,
    summary: {
      ...radialDepthField.summary,
      mean: null,
    },
  }, {
    field_type: 'execution_radial_depth_field',
    point_refs: ['K1', 'K2', 'K3'],
    source_artifact_id: 'geo-1',
    summary: {
      count: 3,
      max: 0.09999999999999964,
      mean: null,
      min: -0.020000000000000462,
    },
    values: [0.09999999999999964, 0.019999999999999574, -0.020000000000000462],
  })
  assert.ok(Math.abs(radialDepthField.summary.mean - 0.033333333333333) < 1e-12)
})
