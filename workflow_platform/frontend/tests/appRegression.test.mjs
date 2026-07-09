import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8')
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('human-review logic dialog save path does not normalize params as virtual machining', () => {
  const start = appSource.indexOf('function saveLogicDialogValues')
  const end = appSource.indexOf('function saveInputDialogValues')
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)

  const saveLogicDialogValues = appSource.slice(start, end)
  const humanReviewBranch = saveLogicDialogValues.slice(saveLogicDialogValues.lastIndexOf('node.params ='))

  assert.doesNotMatch(humanReviewBranch, /normalizeVirtualMachiningParams/)
  assert.match(humanReviewBranch, /approveLabel/)
  assert.match(humanReviewBranch, /reviewerRole/)
})

test('TriDexel demo and export controls are wired from HTML to app event handlers', () => {
  assert.match(indexSource, /id="loadTriDexelExportDemo"/)
  assert.match(indexSource, /id="exportTriDexelImage"/)
  assert.match(indexSource, /id="importTriDexelArtifact"/)
  assert.match(indexSource, /id="triDexelArtifactImportFile"/)
  assert.match(appSource, /loadTriDexelExportDemo:\s*document\.querySelector\('#loadTriDexelExportDemo'\)/)
  assert.match(appSource, /exportTriDexelImage:\s*document\.querySelector\('#exportTriDexelImage'\)/)
  assert.match(appSource, /importTriDexelArtifact:\s*document\.querySelector\('#importTriDexelArtifact'\)/)
  assert.match(appSource, /triDexelArtifactImportFile:\s*document\.querySelector\('#triDexelArtifactImportFile'\)/)
  assert.match(appSource, /loadTriDexelExportDemo\?\.[\s\S]*addEventListener\('click'/)
  assert.match(appSource, /exportTriDexelImage\?\.[\s\S]*addEventListener\('click'/)
  assert.match(appSource, /importTriDexelArtifact\?\.[\s\S]*addEventListener\('click'/)
  assert.match(appSource, /triDexelArtifactImportFile\?\.[\s\S]*addEventListener\('change'/)
})

test('virtual machining dialog exposes design surface thickness and workpiece source modes', () => {
  assert.match(appSource, /textField\('vmDesignSurfaceThickness'/)
  assert.match(appSource, /valueFromInput\('#vmDesignSurfaceThickness'/)
  assert.match(appSource, /id="vmWorkpieceSourceMode"/)
  assert.match(appSource, /value="parametric"/)
  assert.match(appSource, /value="file"/)
  assert.match(appSource, /value="upstream_node"/)
  assert.match(appSource, /id="vmGeometryArtifactSelect"/)
  assert.match(appSource, /id="vmUpstreamVirtualNode"/)
  assert.match(appSource, /data-dialog-action="importTriDexelArtifact"/)
})

test('virtual machining dialog scopes parametric workpiece controls to parametric source mode', () => {
  const geometryStart = appSource.indexOf('data-virtual-panel="geometry"')
  const toolStart = appSource.indexOf('data-virtual-panel="tool"')
  assert.notEqual(geometryStart, -1)
  assert.notEqual(toolStart, -1)
  const geometryPanel = appSource.slice(geometryStart, toolStart)

  assert.match(geometryPanel, /data-workpiece-source-panel="parametric"/)
  assert.match(geometryPanel, /id="vmWorkpiecePreset"/)
  assert.match(geometryPanel, /textField\('vmLength'/)
  assert.match(geometryPanel, /textField\('vmThickness'/)
})

test('virtual machining preview cards are scoped by active configuration tab', () => {
  assert.match(appSource, /data-preview-panel-for="geometry"/)
  assert.match(appSource, /data-preview-panel-for="tool"/)
  assert.match(appSource, /function updateVirtualPreviewPanel/)
  assert.match(appSource, /updateVirtualPreviewPanel\(target\)/)
})

test('virtual machining dialog imports TriDexel artifacts into the dialog node', () => {
  assert.match(appSource, /importTriDexelArtifactFromFile\(geometryArtifactFile,\s*\{\s*targetNode:\s*node\s*\}\)/)
})

test('TriDexel artifact preview resets runtime state before importing geometry', () => {
  const start = appSource.indexOf('async function previewSelectedVirtualCutting')
  const end = appSource.indexOf('async function resetVirtualMachiningScene', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const previewFunction = appSource.slice(start, end)

  const resetIndex = previewFunction.indexOf('resetScene')
  const importIndex = previewFunction.indexOf('importTriDexelImage')
  assert.ok(resetIndex >= 0)
  assert.ok(importIndex >= 0)
  assert.ok(resetIndex < importIndex)
})

test('TriDexel artifact preview validates metadata before calling Unity import', () => {
  const start = appSource.indexOf('async function previewSelectedVirtualCutting')
  const end = appSource.indexOf('async function resetVirtualMachiningScene', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const previewFunction = appSource.slice(start, end)

  const validationIndex = previewFunction.indexOf('validateGeometryArtifactForUnityPreview')
  const importIndex = previewFunction.indexOf('importTriDexelImage')
  assert.ok(validationIndex >= 0)
  assert.ok(importIndex >= 0)
  assert.ok(validationIndex < importIndex)
})

test('TriDexel artifact preview publishes scene payload before importing geometry', () => {
  const start = appSource.indexOf('async function previewSelectedVirtualCutting')
  const end = appSource.indexOf('async function resetVirtualMachiningScene', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const previewFunction = appSource.slice(start, end)

  const scenePayloadIndex = previewFunction.indexOf('window.workflowVirtualMachiningScenePayload = scenePayload')
  const importIndex = previewFunction.indexOf('importTriDexelImage')
  assert.ok(scenePayloadIndex >= 0)
  assert.ok(importIndex >= 0)
  assert.ok(scenePayloadIndex < importIndex)
})

test('TriDexel artifact preview refreshes current VM cloud before machining starts', () => {
  const start = appSource.indexOf('async function previewSelectedVirtualCutting')
  const end = appSource.indexOf('async function resetVirtualMachiningScene', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const previewFunction = appSource.slice(start, end)

  const importIndex = previewFunction.indexOf('importTriDexelImage')
  const clearIndex = previewFunction.indexOf('clearVirtualMachiningErrorCloud')
  const refreshIndex = previewFunction.indexOf('refreshVirtualMachiningErrorCloud')
  const machiningIndex = previewFunction.indexOf('startMaterialRemovalPreview')
  assert.ok(importIndex >= 0)
  assert.ok(clearIndex >= 0)
  assert.ok(refreshIndex >= 0)
  assert.ok(machiningIndex >= 0)
  assert.ok(importIndex < clearIndex)
  assert.ok(clearIndex < refreshIndex)
  assert.ok(refreshIndex < machiningIndex)
  assert.match(previewFunction, /clearVirtualMachiningErrorCloud\(session\)/)
  assert.match(previewFunction, /refreshVirtualMachiningErrorCloud\(node,\s*session\)/)
})

test('virtual machining preview serializes Unity commands and binds completed artifacts to the pending session', () => {
  const start = appSource.indexOf('async function previewSelectedVirtualCutting')
  const end = appSource.indexOf('async function resetVirtualMachiningScene', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const previewFunction = appSource.slice(start, end)

  assert.match(previewFunction, /state\.virtualPreviewInFlight/)
  assert.match(previewFunction, /state\.pendingGeometryCaptureSessionId\s*=\s*session\.visualization_session_id/)
  assert.match(previewFunction, /waitForUnityMachiningCompletion/)
  assert.match(appSource, /const pendingSessionId = state\.pendingGeometryCaptureSessionId/)
  assert.match(appSource, /findVisualizationSession\(state\.workflowState,\s*pendingSessionId\)/)
})

test('app installs a guard for recoverable asynchronous Unity runtime errors', () => {
  assert.match(appSource, /installUnityRuntimeErrorGuard\(\)/)
  assert.match(appSource, /state\.virtualMachining\?\.handleRuntimeError\?\./)
  assert.match(appSource, /stopImmediatePropagation/)
})

test('recoverable Unity runtime warnings invalidate the current preview session in workflow state', () => {
  assert.match(appSource, /function invalidateCurrentVisualizationPreview/)
  const start = appSource.indexOf('function installUnityRuntimeErrorGuard')
  const end = appSource.indexOf('function installWorkflowGeometryArtifactListener', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const guard = appSource.slice(start, end)

  assert.match(guard, /invalidateCurrentVisualizationPreview\(error\)/)
  assert.match(appSource, /event_type:\s*'preview_session_invalidated'/)
})

test('virtual machining preview records expected scene provenance before Unity commands start', () => {
  const start = appSource.indexOf('async function previewSelectedVirtualCutting')
  const end = appSource.indexOf('async function resetVirtualMachiningScene', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const previewFunction = appSource.slice(start, end)

  const provenanceIndex = previewFunction.indexOf("event_type: 'preview_scene_expected'")
  const resetIndex = previewFunction.indexOf('resetScene')
  assert.ok(provenanceIndex >= 0)
  assert.ok(resetIndex >= 0)
  assert.ok(provenanceIndex < resetIndex)
  assert.match(previewFunction, /geometry_artifact_id:\s*geometryResolution\.artifact\?\.artifact_id/)
  assert.match(previewFunction, /expected_workpiece_thickness/)
  assert.match(previewFunction, /expected_error_cloud_summary/)
})

test('invalidated Unity preview sessions cannot capture fresh geometry artifacts', () => {
  const start = appSource.indexOf('function captureUnityGeometryArtifact')
  const end = appSource.indexOf('function t(', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const captureFunction = appSource.slice(start, end)

  assert.match(captureFunction, /session\.status\s*===\s*'invalidated'/)
  assert.match(captureFunction, /state\.pendingGeometryCaptureSessionId\s*=\s*null/)
})

test('Unity completed artifact capture requires a pending geometry session instead of active session fallback', () => {
  const start = appSource.indexOf('function captureUnityGeometryArtifact')
  const end = appSource.indexOf('function t(', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const captureFunction = appSource.slice(start, end)

  assert.match(captureFunction, /pendingGeometryCaptureSessionId/)
  assert.match(captureFunction, /findVisualizationSession\(state\.workflowState,\s*pendingSessionId\)/)
  assert.doesNotMatch(captureFunction, /activeVisualizationSession\(\)/)
})
test('Unity completed artifact capture stores prediction-derived current thickness field', () => {
  assert.match(appSource, /createCurrentThicknessFieldFromPredictionPoints/)
  assert.match(appSource, /derived_fields:\s*\{\s*current_thickness_field:\s*currentThicknessField/)
})

test('wall error field preview exposes its last Unity payload for console diagnostics', () => {
  assert.match(appSource, /window\.workflowLastWallErrorFieldPayload\s*=\s*payload/)
})

test('virtual machining prediction creates a computation-only geometry artifact for upstream consumers', () => {
  assert.match(appSource, /createGeometryArtifactFromPredictionResult/)
  assert.match(appSource, /current_thickness_field_artifact_created/)
})

test('TriDexel export JSON preserves derived fields for later imports', () => {
  assert.match(appSource, /derived_fields:\s*artifact\.derived_fields/)
})

test('TriDexel export JSON preserves non-redundant geometry metadata for Unity preview reuse', () => {
  assert.match(appSource, /geometry_metadata:\s*artifact\.geometry_metadata/)
  assert.doesNotMatch(appSource, /scene_payload:\s*artifact/)
  assert.doesNotMatch(appSource, /unity_payload:\s*artifact/)
})

test('Virtual machining preview payload receives geometry metadata from resolved artifacts', () => {
  assert.match(appSource, /geometry_metadata:\s*geometryResolution\.artifact\?\.geometry_metadata/)
  assert.match(appSource, /geometry_metadata:\s*context\.geometry_metadata/)
})

test('Virtual machining prediction request uses geometry artifact workpiece envelope', () => {
  const start = appSource.indexOf('async function runVirtualMachiningNode(node)')
  const end = appSource.indexOf('function runnableNodesForSelection', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const runVirtualMachiningNode = appSource.slice(start, end)

  const helperIndex = runVirtualMachiningNode.indexOf('workpieceDimensionsFromGeometryArtifact')
  const requestIndex = runVirtualMachiningNode.indexOf('requestWithCompatibleRadialDepth')
  assert.ok(helperIndex >= 0)
  assert.ok(requestIndex >= 0)
  assert.ok(helperIndex < requestIndex)
})

test('module entry uses an explicit version to avoid stale browser app bundles', () => {
  assert.match(indexSource, /<script\b[^>]*type="module"[^>]*src="\.\/app\.js\?v=[^"]+"[^>]*><\/script>/)
})

test('page exposes bootstrap errors instead of hiding module failures behind an empty UI', () => {
  assert.match(indexSource, /rel="icon"\s+href="data:,"/)
  assert.match(indexSource, /workflowShowBootstrapError/)
  assert.match(indexSource, /window\.addEventListener\('error'/)
  assert.match(indexSource, /window\.addEventListener\('unhandledrejection'/)
  assert.match(indexSource, /onerror="window\.workflowShowBootstrapError/)
})

test('bootstrap closes the virtual machining widget constructor call before continuing setup', () => {
  const start = appSource.indexOf('state.virtualMachining = createVirtualMachiningWidget({')
  const end = appSource.indexOf('installWorkflowGeometryArtifactListener()')
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)

  const widgetSetup = appSource.slice(start, end)
  assert.match(widgetSetup, /^\s*\}\)\s*$/m)
})

test('saveVirtualDialogValues closes its params object assignment without an extra call parenthesis', () => {
  const start = appSource.indexOf('function saveVirtualDialogValues')
  const end = appSource.indexOf('async function loadManifestForSelection')
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)

  const saveVirtualDialogValues = appSource.slice(start, end)
  assert.match(saveVirtualDialogValues, /node\.params = \{/)
  assert.doesNotMatch(saveVirtualDialogValues, /^\s*\}\)\s*$/m)
})

test('workflow runtime exposes explicit Unity preview readiness status', () => {
  assert.match(appSource, /function currentPreviewRuntimeStatus\(\)/)
  assert.match(appSource, /preview_runtime_status:\s*currentPreviewRuntimeStatus\(\)/)
  assert.match(appSource, /safe_to_preview/)
  assert.match(appSource, /schedulePreviewRuntimeStatusRefresh\(\)/)
  assert.match(appSource, /previewRuntimeStatusLabel\(currentPreviewRuntimeStatus\(\)\)/)
})

test('current VM error cloud refresh prefers Unity payload points from the active preview session', () => {
  const start = appSource.indexOf('async function refreshVirtualMachiningErrorCloud')
  const end = appSource.indexOf('async function resetVirtualMachiningScene', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const refreshFunction = appSource.slice(start, end)

  const sessionPointsIndex = refreshFunction.indexOf('session?.unity_payload?.points')
  const nodePointsIndex = refreshFunction.indexOf('node?.data?.wallErrorPoints')
  assert.ok(sessionPointsIndex >= 0)
  assert.ok(nodePointsIndex >= 0)
  assert.ok(sessionPointsIndex < nodePointsIndex)
  assert.match(refreshFunction, /window\.workflowLastWallErrorFieldPayload\s*=\s*payload/)
})
test('Unity preview runtime UI maps lifecycle states to concise operator messages', () => {
  assert.match(appSource, /function previewRuntimeStatusLabel\(status/)
  assert.match(appSource, /Unity Preview Status: Ready for next preview/)
  assert.match(appSource, /Preview running: ' \+ label/)
  assert.match(appSource, /Recovering Unity runtime: wait/)
  assert.match(appSource, /Unity Preview Status: Reloading Unity runtime/)
  assert.match(appSource, /Preview invalidated: rerun this VM/)
  assert.match(appSource, /function renderPreviewRuntimeStatus/)
  assert.match(appSource, /function renderSelectedVirtualPreviewRuntimeStatus/)
  assert.doesNotMatch(appSource, /wait until preview_runtime_status\.safe_to_preview is true/)
})

test('Unity preview runtime canvas status is scoped to the selected virtual node', () => {
  const renderStart = appSource.indexOf('function renderPreviewRuntimeStatus')
  const selectedStart = appSource.indexOf('function renderSelectedVirtualPreviewRuntimeStatus', renderStart)
  const selectedEnd = appSource.indexOf('function shortPreviewNodeLabel', selectedStart)
  assert.notEqual(renderStart, -1)
  assert.notEqual(selectedStart, -1)
  assert.notEqual(selectedEnd, -1)
  const renderPreviewRuntimeStatus = appSource.slice(renderStart, selectedStart)
  const renderSelectedVirtualPreviewRuntimeStatus = appSource.slice(selectedStart, selectedEnd)

  assert.doesNotMatch(renderPreviewRuntimeStatus, /elements\.graphStatus\.textContent/)
  assert.match(renderSelectedVirtualPreviewRuntimeStatus, /selectedNode\(\)/)
  assert.match(renderSelectedVirtualPreviewRuntimeStatus, /selected\.type !== 'virtual'/)
  assert.match(renderSelectedVirtualPreviewRuntimeStatus, /elements\.graphStatus\.textContent\s*=\s*previewRuntimeStatusLabel\(status\)/)
  assert.match(appSource, /renderSelectedVirtualPreviewRuntimeStatus\(previewRuntimeStatus\)/)
  assert.match(appSource, /renderSelectedVirtualPreviewRuntimeStatus\(\)/)
})

test('Unity runtime unstable state blocks preview commands after repeated recoverable warnings', () => {
  assert.match(appSource, /function signature mismatch/)
  assert.match(appSource, /status\.status === 'runtime_unstable'/)
  assert.match(appSource, /Runtime unstable; reset Unity before next preview/)

  const start = appSource.indexOf('async function previewSelectedVirtualCutting')
  const end = appSource.indexOf('function waitForUnityMachiningCompletion', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const previewFunction = appSource.slice(start, end)
  const runtimeStatusIndex = previewFunction.indexOf('state.virtualMachining?.runtimeStatus?.()')
  const inFlightIndex = previewFunction.indexOf('state.virtualPreviewInFlight')
  const startPreviewIndex = previewFunction.indexOf('state.virtualPreviewInFlight = true')
  assert.ok(runtimeStatusIndex >= 0)
  assert.ok(inFlightIndex >= 0)
  assert.ok(startPreviewIndex >= 0)
  assert.ok(runtimeStatusIndex < startPreviewIndex)
  assert.match(previewFunction, /runtime_unstable/)
  assert.match(previewFunction, /return/)
})
test('Unity dock exposes explicit scene preparation and cutting controls', () => {
  assert.match(indexSource, /id="prepareVirtualScene"/)
  assert.match(indexSource, /id="applyVirtualErrorCloud"/)
  assert.match(indexSource, /id="startVirtualCutting"/)
  assert.match(indexSource, /id="reloadVirtualRuntime"/)
  assert.match(indexSource, /class="virtual-control-help"/)

  assert.match(appSource, /prepareSelectedVirtualMachiningScene/)
  assert.match(appSource, /applyCurrentVirtualMachiningErrorCloud/)
  assert.match(appSource, /startSelectedVirtualCutting/)
  assert.match(appSource, /reloadVirtualMachiningRuntime/)
  assert.match(appSource, /actions\.prepareScene/)
  assert.match(appSource, /actions\.applyErrorCloud/)
  assert.match(appSource, /actions\.startCutting/)
  assert.match(appSource, /actions\.reloadUnityRuntime/)
})



test('Unity dock event binding statements stay separated', () => {
  assert.doesNotMatch(appSource, /reloadVirtualRuntime[^\r\n]*\)[ \t]+elements\.resetVirtualScene/)
  assert.match(appSource, /reloadVirtualRuntime\?\.addEventListener\([^\n]+\)\r?\n\s*elements\.resetVirtualScene/)
})
test('Unity dock buttons are wired to explicit preview control handlers', () => {
  assert.match(appSource, /elements\.prepareVirtualScene\?\.[\s\S]*prepareSelectedVirtualMachiningScene/)
  assert.match(appSource, /elements\.applyVirtualErrorCloud\?\.[\s\S]*applyCurrentVirtualMachiningErrorCloud/)
  assert.match(appSource, /elements\.startVirtualCutting\?\.[\s\S]*startSelectedVirtualCutting/)
  assert.match(appSource, /elements\.reloadVirtualRuntime\?\.[\s\S]*reloadVirtualMachiningRuntime/)
})
test('one-click Preview Cutting delegates to prepare scene then start cutting', () => {
  const start = appSource.indexOf('async function previewSelectedVirtualCutting')
  const end = appSource.indexOf('function waitForUnityMachiningCompletion', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const previewFunction = appSource.slice(start, end)

  assert.match(previewFunction, /await prepareSelectedVirtualMachiningScene\(\)/)
  assert.match(previewFunction, /await startSelectedVirtualCutting/)
})
test('Prepare Scene clears preview in-flight before refreshing dock controls', () => {
  const start = appSource.indexOf('async function prepareSelectedVirtualMachiningScene')
  const end = appSource.indexOf('async function prepareVirtualMachiningSceneForSession', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const prepareFunction = appSource.slice(start, end)

  const clearIndex = prepareFunction.indexOf('state.virtualPreviewInFlight = false')
  const publishIndex = prepareFunction.lastIndexOf('publishWorkflowRuntimeState()')
  const renderIndex = prepareFunction.lastIndexOf('renderGraph()')

  assert.ok(clearIndex >= 0)
  assert.ok(publishIndex >= 0)
  assert.ok(renderIndex >= 0)
  assert.ok(clearIndex < publishIndex)
  assert.ok(clearIndex < renderIndex)
})
