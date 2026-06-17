export function createInitialWorkflowState(workflow = {}) {
  const timestamp = timestampFrom(workflow.now)
  return {
    created_at: timestamp,
    event_log: cloneValue(workflow.event_log ?? []),
    initial_process_parameter_base: cloneValue(
      workflow.initial_process_parameter_base
        ?? workflow.initialProcessParameterBase
        ?? workflow.process_parameters
        ?? {},
    ),
    node_context: cloneValue(workflow.node_context ?? {}),
    node_results: cloneValue(workflow.node_results ?? {}),
    node_result_versions: cloneValue(workflow.node_result_versions ?? []),
    parameter_base_versions: cloneValue(workflow.parameter_base_versions ?? workflow.process_parameter_base_versions ?? []),
    parameter_patches: cloneValue(workflow.parameter_patches ?? []),
    process_parameters: cloneValue(workflow.process_parameters ?? {}),
    run_history: cloneValue(workflow.run_history ?? []),
    run_id: workflow.run_id ?? createRunId(),
    runtime_metrics: cloneValue(workflow.runtime_metrics ?? {}),
    status: workflow.status ?? 'idle',
    updated_at: timestamp,
    workflow_id: workflow.workflow_id ?? createWorkflowId(),
    workpiece_state: cloneValue(workflow.workpiece_state ?? {}),
  }
}

export function createProcessParameterBaseVersion(input = {}) {
  return {
    base_version_id: input.base_version_id ?? input.baseVersionId?.() ?? createBaseVersionId(),
    coordinate_system: cloneValue(input.coordinate_system ?? null),
    created_at: input.created_at ?? timestampFrom(input.now),
    description: input.description ?? '',
    parameters: cloneValue(input.parameters ?? {}),
    run_id: input.run_id ?? null,
    source_patch_ids: cloneValue(input.source_patch_ids ?? []),
    virtual_node_id: input.virtual_node_id ?? null,
  }
}

export function createParameterPatch(input = {}) {
  const patch = {
    created_at: input.created_at ?? timestampFrom(input.now),
    created_by_node_id: input.created_by_node_id ?? null,
    operation: input.operation ?? 'replace',
    patch_id: input.patch_id ?? input.patchId?.() ?? createPatchId(),
    source_result_ref: cloneValue(input.source_result_ref ?? null),
    target_path: input.target_path ?? '',
    value: cloneValue(input.value ?? null),
  }
  if (input.target_virtual_node_ids !== undefined || input.targetVirtualNodeIds !== undefined) {
    patch.target_virtual_node_ids = cloneValue(input.target_virtual_node_ids ?? input.targetVirtualNodeIds ?? [])
  }
  return patch
}

export function createNodeResultVersion(input = {}) {
  const resultVersion = {
    created_at: input.created_at ?? timestampFrom(input.now),
    execution_index: input.execution_index ?? null,
    input_fingerprint: input.input_fingerprint ?? null,
    node_id: input.node_id ?? null,
    node_result_version_id: input.node_result_version_id ?? input.nodeResultVersionId?.() ?? createNodeResultVersionId(),
    node_run_id: input.node_run_id ?? null,
    parameter_base_version_id: input.parameter_base_version_id ?? null,
    raw_response_ref: input.raw_response_ref ?? null,
    result_summary: cloneValue(input.result_summary ?? {}),
    stale: input.stale ?? false,
  }
  if (input.stale_reason !== undefined) resultVersion.stale_reason = input.stale_reason
  if (input.stale_at !== undefined) resultVersion.stale_at = input.stale_at
  return resultVersion
}

export function addProcessParameterBaseVersion(state, baseVersion) {
  return {
    ...state,
    parameter_base_versions: [
      ...(state.parameter_base_versions ?? state.process_parameter_base_versions ?? []),
      cloneValue(baseVersion),
    ],
  }
}

export function addParameterPatch(state, patch) {
  return {
    ...state,
    parameter_patches: [
      ...(state.parameter_patches ?? []),
      cloneValue(patch),
    ],
  }
}

export function addNodeResultVersion(state, resultVersion) {
  return {
    ...state,
    node_result_versions: [
      ...(state.node_result_versions ?? []),
      cloneValue(resultVersion),
    ],
  }
}

export function findLatestBaseVersionForNode(state, virtualNodeId) {
  const matches = (state.parameter_base_versions ?? state.process_parameter_base_versions ?? [])
    .filter((baseVersion) => baseVersion.virtual_node_id === virtualNodeId)
  return cloneValue(matches.at(-1) ?? null)
}

export function findPatchesForBase(state, baseVersionId) {
  const patchIds = sourcePatchIdsForBase(state, baseVersionId)
  return cloneValue((state.parameter_patches ?? [])
    .filter((patch) => patchIds.includes(patch.patch_id)))
}

export function findNodeResultVersions(state, nodeId) {
  return cloneValue((state.node_result_versions ?? [])
    .filter((resultVersion) => resultVersion.node_id === nodeId))
}

export function findLatestNodeResultVersion(state, nodeId) {
  const matches = (state.node_result_versions ?? [])
    .filter((resultVersion) => resultVersion.node_id === nodeId)
  return cloneValue(matches.at(-1) ?? null)
}

export function nextExecutionIndexForNode(state, nodeId) {
  const indexes = (state.node_result_versions ?? [])
    .filter((resultVersion) => resultVersion.node_id === nodeId)
    .map((resultVersion) => Number(resultVersion.execution_index))
    .filter(Number.isFinite)
  return indexes.length ? Math.max(...indexes) + 1 : 1
}

export function createNodeInputFingerprint(node, state, context = {}) {
  const fingerprint = {
    block_id: context.block_id ?? null,
    block_version: context.block_version ?? null,
    node: {
      config: {
        groupId: node.groupId ?? null,
        id: node.id ?? null,
        logicKind: node.logicKind ?? null,
        params: cloneValue(node.params ?? {}),
        processKind: node.processKind ?? null,
        type: node.type ?? null,
      },
    },
    parameter_base_version_id: context.parameter_base_version_id ?? null,
    parameter_patch_ids: (state.parameter_patches ?? []).map((patch) => patch.patch_id),
    process_parameters: node.type === 'virtual' ? cloneValue(state.process_parameters ?? {}) : undefined,
    upstream_result_versions: latestResultVersionRefs(state),
    workpiece_state: node.type === 'virtual' ? cloneValue(state.workpiece_state ?? {}) : undefined,
  }
  return stableStringify(removeUndefined(fingerprint))
}

export function createNodeResultVersionForExecution(state, node, executionResult, options = {}) {
  const executionIndex = options.execution_index ?? nextExecutionIndexForNode(state, node.id)
  const parameterBaseVersionId = options.parameter_base_version_id
    ?? findLatestBaseVersionForNode(state, node.id)?.base_version_id
    ?? null
  return createNodeResultVersion({
    created_at: options.created_at,
    execution_index: executionIndex,
    input_fingerprint: options.input_fingerprint ?? createNodeInputFingerprint(node, state, {
      block_id: options.block_id ?? executionResult.block_id ?? null,
      block_version: options.block_version ?? null,
      parameter_base_version_id: parameterBaseVersionId,
    }),
    node_id: node.id,
    node_result_version_id: options.node_result_version_id ?? options.nodeResultVersionId?.(),
    node_run_id: options.node_run_id ?? `${state.run_id}:${node.id}:${executionIndex}`,
    parameter_base_version_id: parameterBaseVersionId,
    raw_response_ref: options.raw_response_ref ?? `node_results.${node.id}.raw_response`,
    result_summary: resultSummaryForExecution(executionResult),
    stale: false,
  })
}

export function assertFreshNodeResult(state, nodeId, options = {}) {
  const latest = findLatestNodeResultVersion(state, nodeId)
  if (latest?.stale) {
    const consumer = options.consumer_node_id ? ` for ${options.consumer_node_id}` : ''
    const reason = latest.stale_reason ? ` Reason: ${latest.stale_reason}` : ''
    throw new Error(`Stale upstream result ${latest.node_result_version_id} from ${nodeId}${consumer}.${reason}`)
  }
  return latest
}

export function markNodeAndDirectDownstreamResultsStale(state, changedNodeIds = [], edges = [], reason = 'input changed', options = {}) {
  const changedSet = new Set(changedNodeIds)
  const affectedNodeIds = new Set(changedNodeIds)
  for (const edge of edges ?? []) {
    const from = edge.from ?? edge.source
    const to = edge.to ?? edge.target
    if (changedSet.has(from) && to) affectedNodeIds.add(to)
  }

  const staleAt = timestampFrom(options.now)
  let nextState = {
    ...state,
    node_result_versions: (state.node_result_versions ?? []).map((resultVersion) => {
      if (!affectedNodeIds.has(resultVersion.node_id) || resultVersion.stale) return resultVersion
      return {
        ...cloneValue(resultVersion),
        stale: true,
        stale_at: staleAt,
        stale_reason: reason,
      }
    }),
    updated_at: staleAt,
  }

  for (const resultVersion of nextState.node_result_versions ?? []) {
    if (!affectedNodeIds.has(resultVersion.node_id)) continue
    const previous = (state.node_result_versions ?? [])
      .find((item) => item.node_result_version_id === resultVersion.node_result_version_id)
    if (!previous || previous.stale || !resultVersion.stale) continue
    nextState = appendExecutionEvent(nextState, {
      event_type: 'result_marked_stale',
      node_id: resultVersion.node_id,
      node_type: null,
      payload: {
        changed_node_ids: cloneValue([...changedNodeIds]),
        node_result_version_id: resultVersion.node_result_version_id,
        stale_reason: reason,
      },
      run_id: state.run_id,
      summary: `Result marked stale: ${resultVersion.node_result_version_id}`,
      timestamp: staleAt,
    })
  }

  return nextState
}

export function applyPendingPatchesToCandidateParameters(state, options = {}) {
  const baseVersionId = options.base_version_id ?? null
  const virtualNodeId = options.virtual_node_id ?? null
  const initialParameters = cloneValue(options.parameters ?? state.process_parameters ?? {})
  const nextPatches = []
  const events = []
  const appliedPatchIds = []
  let parameters = initialParameters
  const alreadyAppliedPatchIds = sourcePatchIdsForBase(state, baseVersionId)
  const latestPatchIdsByUpdateNode = latestPatchIdsByUpdateNodeAndTargetPath(state.parameter_patches ?? [])

  for (const patch of state.parameter_patches ?? []) {
    if (isSupersededPatch(patch, latestPatchIdsByUpdateNode)) {
      nextPatches.push(cloneValue(patch))
      events.push(parameterPatchEvent('parameter_patch_skipped', patch, {
        skip_reason: 'patch superseded by newer patch from same update node',
        superseded_by_patch_id: latestPatchIdsByUpdateNode.get(patchSupersessionKey(patch)),
      }))
      continue
    }

    if (patchCrossesVirtualBoundary(patch, virtualNodeId, options.nodes ?? [], options.edges ?? [])) {
      nextPatches.push(cloneValue(patch))
      events.push(parameterPatchEvent('parameter_patch_skipped', patch, {
        skip_reason: 'patch crosses another virtual machining base boundary',
        virtual_node_id: virtualNodeId,
      }))
      continue
    }

    const targetVirtualNodeIds = patch.target_virtual_node_ids ?? patch.targetVirtualNodeIds ?? []
    if (Array.isArray(targetVirtualNodeIds) && targetVirtualNodeIds.length && !targetVirtualNodeIds.includes(virtualNodeId)) {
      nextPatches.push(cloneValue(patch))
      events.push(parameterPatchEvent('parameter_patch_skipped', patch, {
        skip_reason: 'patch targets another virtual node',
        target_virtual_node_ids: cloneValue(targetVirtualNodeIds),
        virtual_node_id: virtualNodeId,
      }))
      continue
    }

    if (alreadyAppliedPatchIds.includes(patch.patch_id)) {
      nextPatches.push(cloneValue(patch))
      events.push(parameterPatchEvent('parameter_patch_skipped', patch, {
        applied_to_base_version_id: baseVersionId,
        skip_reason: 'patch already applied to base',
      }))
      continue
    }

    parameters = applyParameterPatch(parameters, patch)
    nextPatches.push(cloneValue(patch))
    appliedPatchIds.push(patch.patch_id)
    events.push(parameterPatchEvent('parameter_patch_applied', patch, {
      applied_to_base_version_id: baseVersionId,
    }))
  }

  return {
    applied_patch_ids: appliedPatchIds,
    events,
    parameter_patches: nextPatches,
    parameters,
  }
}

function sourcePatchIdsForBase(state, baseVersionId) {
  const baseVersion = (state.parameter_base_versions ?? state.process_parameter_base_versions ?? [])
    .find((item) => item.base_version_id === baseVersionId)
  return cloneValue(baseVersion?.source_patch_ids ?? [])
}

function latestPatchIdsByUpdateNodeAndTargetPath(patches = []) {
  const latestPatchIds = new Map()
  for (const patch of patches) {
    const key = patchSupersessionKey(patch)
    if (key) latestPatchIds.set(key, patch.patch_id)
  }
  return latestPatchIds
}

function isSupersededPatch(patch, latestPatchIds) {
  const key = patchSupersessionKey(patch)
  if (!key) return false
  return latestPatchIds.get(key) !== patch.patch_id
}

function patchSupersessionKey(patch) {
  if (!patch?.created_by_node_id || !patch.target_path) return null
  return `${patch.created_by_node_id}::${patch.target_path}`
}

export function freezeProcessParameterBaseForVirtualNode(state, node, options = {}) {
  const baseVersionId = options.base_version_id?.() ?? options.base_version_id ?? createBaseVersionId()
  const patchApplication = applyPendingPatchesToCandidateParameters(state, {
    base_version_id: baseVersionId,
    edges: options.edges ?? [],
    nodes: options.nodes ?? [],
    parameters: candidateParametersForVirtualNode(state, node),
    virtual_node_id: node.id,
  })
  const coordinateSystem = patchApplication.parameters.machining_coordinate_system
    ?? state.process_parameters?.machining_coordinate_system
    ?? null
  const baseVersion = createProcessParameterBaseVersion({
    base_version_id: baseVersionId,
    coordinate_system: coordinateSystem,
    description: `Frozen process parameters for virtual node ${node.id}`,
    now: options.now,
    parameters: patchApplication.parameters,
    run_id: state.run_id,
    source_patch_ids: patchApplication.applied_patch_ids,
    virtual_node_id: node.id,
  })
  const nextState = addProcessParameterBaseVersion({
    ...state,
    parameter_patches: patchApplication.parameter_patches,
    process_parameters: cloneValue(patchApplication.parameters),
  }, baseVersion)

  return {
    baseVersion,
    events: [
      ...patchApplication.events,
      {
        event_type: 'base_version_created',
        payload: {
          applied_patch_ids: cloneValue(baseVersion.source_patch_ids),
          base_version_id: baseVersion.base_version_id,
          parameters: cloneValue(baseVersion.parameters),
          virtual_node_id: baseVersion.virtual_node_id,
        },
        summary: `Base version created for ${node.id}`,
      },
    ],
    state: nextState,
  }
}

function candidateParametersForVirtualNode(state, node) {
  const parameters = cloneValue(state.process_parameters ?? {})
  const process = cloneValue(node.processParameterBase ?? node.params?.process ?? {})
  const nodeParams = cloneValue(node.params ?? {})
  if (Object.keys(process).length) {
    parameters.axial_depth = process.axial_depth ?? parameters.axial_depth ?? null
    parameters.feed_rate = process.feed_rate ?? parameters.feed_rate ?? null
    parameters.radial_depth = process.radial_depth ?? parameters.radial_depth ?? null
    parameters.spindle_speed = process.spindle_speed ?? parameters.spindle_speed ?? null
    parameters.cutting_mode = process.cutting_mode ?? parameters.cutting_mode ?? null
  }
  if (node.params || node.processParameterBase) {
    parameters.by_node = {
      ...(parameters.by_node ?? {}),
      [node.id]: {
        ...nodeParams,
        process,
      },
    }
  }
  const coordinateSystem = node.params?.machining_coordinate_system
    ?? process.machining_coordinate_system
    ?? parameters.machining_coordinate_system
  if (coordinateSystem) parameters.machining_coordinate_system = cloneValue(coordinateSystem)
  return parameters
}

function patchCrossesVirtualBoundary(patch, virtualNodeId, nodes = [], edges = []) {
  if (!patch?.created_by_node_id || !virtualNodeId || !nodes.length || !edges.length) return false
  const firstVirtualTargets = firstDownstreamVirtualNodeIds(patch.created_by_node_id, nodes, edges)
  return firstVirtualTargets.length > 0 && !firstVirtualTargets.includes(virtualNodeId)
}

function firstDownstreamVirtualNodeIds(nodeId, nodes = [], edges = []) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const targets = []
  const visited = new Set()
  const queue = [nodeId]

  while (queue.length) {
    const current = queue.shift()
    for (const edge of edges ?? []) {
      if (edge.from !== current || visited.has(edge.to)) continue
      visited.add(edge.to)
      const target = nodeById.get(edge.to)
      if (target?.type === 'virtual') {
        targets.push(edge.to)
        continue
      }
      queue.push(edge.to)
    }
  }

  return targets
}

export function createExecutionEvent(input = {}) {
  const timestamp = input.timestamp ?? timestampFrom(input.now)
  const payload = cloneValue(input.payload ?? {})
  return {
    base_version_after: input.base_version_after ?? payload.base_version_after ?? payload.base_version_id ?? null,
    base_version_before: input.base_version_before ?? payload.base_version_before ?? null,
    data_after_ref: input.data_after_ref ?? null,
    data_before_ref: input.data_before_ref ?? null,
    event_id: input.event_id ?? input.eventId?.() ?? createEventId(),
    event_sequence: input.event_sequence ?? null,
    event_type: input.event_type,
    execution_index: input.execution_index ?? payload.execution_index ?? null,
    node_id: input.node_id ?? null,
    node_label: input.node_label ?? payload.node_label ?? input.node_id ?? null,
    node_run_id: input.node_run_id ?? payload.node_run_id ?? null,
    node_type: input.node_type ?? null,
    patch_ids: cloneValue(input.patch_ids ?? payload.patch_ids ?? patchIdsFromPayload(payload)),
    payload,
    result_version_id: input.result_version_id ?? payload.result_version_id ?? payload.node_result_version_id ?? null,
    run_id: input.run_id,
    skip_reason: input.skip_reason ?? payload.skip_reason ?? null,
    state_change_summary: input.state_change_summary ?? payload.state_change_summary ?? input.summary ?? '',
    summary: input.summary ?? '',
    timestamp,
  }
}

export function appendExecutionEvent(state, event) {
  const normalizedEvent = createExecutionEvent({
    ...event,
    event_sequence: event.event_sequence ?? (state.event_log?.length ?? 0) + 1,
    run_id: event.run_id ?? state.run_id,
  })

  return {
    ...state,
    event_log: [...state.event_log, normalizedEvent],
    updated_at: normalizedEvent.timestamp,
  }
}

export function updateWorkflowState(state, patch, reason = 'state updated', options = {}) {
  const timestamp = timestampFrom(options.now)
  const nextState = {
    ...state,
    ...cloneValue(patch),
    updated_at: timestamp,
  }
  return appendExecutionEvent(nextState, createExecutionEvent({
    event_id: options.event_id?.() ?? options.eventId?.(),
    event_type: 'state_updated',
    payload: cloneValue(patch),
    run_id: state.run_id,
    summary: reason,
    timestamp,
  }))
}

export function recordNodeResult(state, nodeId, result, derivedMetrics = {}, options = {}) {
  const timestamp = timestampFrom(options.now)
  return {
    ...state,
    node_results: {
      ...state.node_results,
      [nodeId]: cloneValue(result),
    },
    runtime_metrics: {
      ...state.runtime_metrics,
      ...cloneValue(derivedMetrics ?? {}),
    },
    updated_at: timestamp,
  }
}

export function getNodeResult(state, nodeId) {
  return cloneValue(state.node_results[nodeId] ?? null)
}

export function exportWorkflowState(state) {
  return cloneValue(state)
}

export function createWorkflowState(options = {}) {
  const timestamp = timestampFrom(options.now)
  const state = {
    currentNodeId: null,
    createdAt: timestamp,
    events: [],
    iteration: 0,
    results: {},
    runId: options.runId ?? createRunId(),
    status: 'idle',
    updatedAt: timestamp,
    variables: {},
  }
  return state
}

export function appendLegacyExecutionEvent(state, event, options = {}) {
  const timestamp = timestampFrom(options.now)
  const nextEvent = {
    id: options.eventId?.() ?? createEventId(),
    message: event.message ?? '',
    nodeId: event.nodeId ?? null,
    payload: cloneValue(event.payload ?? null),
    runId: state.runId,
    timestamp,
    type: event.type,
  }

  return {
    ...state,
    events: [...state.events, nextEvent],
    updatedAt: timestamp,
  }
}

export function mergeWorkflowResult(state, nodeId, result, options = {}) {
  return {
    ...state,
    results: {
      ...state.results,
      [nodeId]: cloneValue(result),
    },
    updatedAt: timestampFrom(options.now),
  }
}

function timestampFrom(now) {
  if (typeof now === 'function') return now()
  return new Date().toISOString()
}

function createRunId() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createWorkflowId() {
  return `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createEventId() {
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createBaseVersionId() {
  return `base-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createPatchId() {
  return `patch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createNodeResultVersionId() {
  return `result-version-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function patchIdsFromPayload(payload) {
  if (Array.isArray(payload.applied_patch_ids)) return payload.applied_patch_ids
  if (payload.patch_id) return [payload.patch_id]
  return []
}

function latestResultVersionRefs(state) {
  const latestByNode = new Map()
  for (const resultVersion of state.node_result_versions ?? []) {
    latestByNode.set(resultVersion.node_id, resultVersion)
  }
  return [...latestByNode.values()].map((resultVersion) => ({
    node_id: resultVersion.node_id,
    node_result_version_id: resultVersion.node_result_version_id,
    stale: resultVersion.stale ?? false,
  }))
}

function resultSummaryForExecution(executionResult) {
  const result = executionResult.result ?? {}
  return removeUndefined({
    block_id: executionResult.block_id ?? null,
    derived_metrics: cloneValue(executionResult.derived_metrics ?? {}),
    logic_kind: executionResult.logic_kind ?? null,
    ok: executionResult.ok ?? null,
    summary: cloneValue(result.summary ?? null),
    type: result.type ?? null,
  })
}

function stableStringify(value) {
  return JSON.stringify(sortJsonValue(value))
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((next, key) => {
    const item = value[key]
    if (item !== undefined) next[key] = sortJsonValue(item)
    return next
  }, {})
}

function removeUndefined(value) {
  if (Array.isArray(value)) return value.map(removeUndefined)
  if (!value || typeof value !== 'object') return value
  return Object.entries(value).reduce((next, [key, item]) => {
    if (item !== undefined) next[key] = removeUndefined(item)
    return next
  }, {})
}

function applyParameterPatch(parameters, patch) {
  const targetPath = normalizeParameterTargetPath(patch.target_path)
  const previousValue = getPath(parameters, targetPath)
  const nextValue = updatedParameterValue(previousValue, patch.value, patch.operation)
  return setPath(cloneValue(parameters), targetPath, nextValue)
}

function normalizeParameterTargetPath(targetPath = '') {
  if (targetPath.startsWith('process_parameters.')) return targetPath.slice('process_parameters.'.length)
  if (targetPath.startsWith('parameters.')) return targetPath.slice('parameters.'.length)
  return targetPath
}

function updatedParameterValue(previousValue, patchValue, operation = 'replace') {
  if (operation === 'replace') return cloneValue(patchValue)
  const previousNumber = Number(previousValue)
  const patchNumber = Number(patchValue)
  if (!Number.isFinite(previousNumber) || !Number.isFinite(patchNumber)) {
    throw new Error(`Parameter patch operation ${operation} requires numeric values.`)
  }
  if (operation === 'add') return previousNumber + patchNumber
  if (operation === 'scale') return previousNumber * patchNumber
  throw new Error(`Unsupported parameter patch operation: ${operation}`)
}

function parameterPatchEvent(eventType, patch, extraPayload = {}) {
  return {
    event_type: eventType,
    payload: {
      created_by_node_id: patch.created_by_node_id ?? null,
      operation: patch.operation,
      patch_id: patch.patch_id,
      target_path: patch.target_path,
      value: cloneValue(patch.value),
      ...cloneValue(extraPayload),
    },
    summary: eventType === 'parameter_patch_applied'
      ? `Parameter patch applied: ${patch.patch_id}`
      : `Parameter patch skipped: ${patch.patch_id}`,
  }
}

function getPath(source, path) {
  if (!source || !path) return undefined
  return path.split('.').filter(Boolean).reduce((value, key) => {
    if (value == null) return undefined
    return value[key]
  }, source)
}

function setPath(target, path, value) {
  const parts = path.split('.').filter(Boolean)
  if (!parts.length) return target
  let cursor = target
  parts.forEach((part, index) => {
    if (index === parts.length - 1) cursor[part] = value
    else {
      cursor[part] = cursor[part] ?? {}
      cursor = cursor[part]
    }
  })
  return target
}

function cloneValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
