const PROCESS_PARAMETER_KEYS = Object.freeze([
  'spindle_speed',
  'feed_rate',
  'axial_depth',
  'radial_depth',
  'cutting_mode',
])

export function captureVirtualProcessBase(node, options = {}) {
  if (!node || node.type !== 'virtual') return node
  if (!options.overwrite && node.processParameterBase) return node
  node.processParameterBase = cloneValue(node.params?.process ?? {})
  return node
}

export function resetVirtualProcessToBase(node) {
  if (!node || node.type !== 'virtual') return node
  captureVirtualProcessBase(node)
  node.params = {
    ...(node.params ?? {}),
    process: cloneValue(node.processParameterBase ?? {}),
  }
  return node
}

export function applyRuntimeProcessParametersToVirtualNode(node, workflowState = {}) {
  if (!node || node.type !== 'virtual') return node
  resetVirtualProcessToBase(node)

  const runtimeParams = workflowState?.process_parameters ?? workflowState ?? {}
  const baseParams = latestFrozenBaseParametersForNode(workflowState, node.id)
  const processPatch = collectRuntimeProcessPatch(node, baseParams ?? runtimeParams)
  if (Object.keys(processPatch).length) {
    node.params.process = {
      ...(node.params.process ?? {}),
      ...processPatch,
    }
  }

  const coordinateSystem = runtimeParams.machining_coordinate_system
    ?? runtimeParams.coordinate_system
    ?? runtimeParams.by_node?.[node.id]?.machining_coordinate_system
    ?? runtimeParams.by_node?.[node.id]?.coordinate_system
  if (coordinateSystem) {
    node.params.machining_coordinate_system = cloneValue(coordinateSystem)
  }

  return node
}

export function virtualNodeWithRuntimeProcessParameters(node, workflowState = {}) {
  if (!node || node.type !== 'virtual') return node
  const runtimeNode = cloneValue(node)
  applyRuntimeProcessParametersToVirtualNode(runtimeNode, workflowState)
  return runtimeNode
}

export function virtualNodeRuntimeParameterView(node, workflowState = {}) {
  if (!node || node.type !== 'virtual') return null
  const latestBase = latestFrozenBaseForNode(workflowState, node.id)
  const designParameters = cloneValue(node.processParameterBase ?? node.params?.process ?? {})
  const executionParameters = cloneValue(latestBase?.parameters ?? null)
  return {
    base_version_id: latestBase?.base_version_id ?? null,
    design_parameters: designParameters,
    display_parameters: cloneValue(executionParameters ?? designParameters),
    execution_parameters: executionParameters,
    node_id: node.id,
    source_patch_ids: cloneValue(latestBase?.source_patch_ids ?? []),
  }
}

function collectRuntimeProcessPatch(node, runtimeParams = {}) {
  const candidates = [
    runtimeParams.by_node?.[node.id],
    runtimeParams.by_node?.[node.id]?.process,
    runtimeParams,
    runtimeParams.process,
  ].filter(Boolean)

  const patch = {}
  for (const candidate of candidates) {
    for (const key of PROCESS_PARAMETER_KEYS) {
      if (candidate[key] != null) patch[key] = cloneValue(candidate[key])
    }
  }
  return patch
}

function latestFrozenBaseParametersForNode(workflowState, nodeId) {
  return latestFrozenBaseForNode(workflowState, nodeId)?.parameters ?? null
}

function latestFrozenBaseForNode(workflowState, nodeId) {
  const matches = (workflowState?.parameter_base_versions ?? [])
    .filter((baseVersion) => baseVersion.virtual_node_id === nodeId)
  return matches.at(-1) ?? null
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
