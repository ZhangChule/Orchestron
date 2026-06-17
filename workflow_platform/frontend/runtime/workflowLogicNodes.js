import {
  assertFreshNodeResult,
  createParameterPatch,
} from './workflowExecutionCore.js'
import { resolveUpstreamNodeResultOfType } from './workflowResultResolution.js'

const DEFAULT_MACHINING_COORDINATE_SYSTEM = Object.freeze({
  axes: Object.freeze({
    x: Object.freeze([1, 0, 0]),
    y: Object.freeze([0, 1, 0]),
    z: Object.freeze([0, 0, 1]),
  }),
  id: 'workpiece',
  origin: Object.freeze([0, 0, 0]),
  units: 'mm',
})

export function createProcessParameterState(nodes = []) {
  const byNode = Object.fromEntries(
    nodes
      .filter((node) => node.type === 'process' || node.type === 'virtual')
      .map((node) => [node.id, processStateParamsForNode(node)]),
  )
  const virtualNode = [...nodes]
    .reverse()
    .find((node) => node.type === 'virtual' && node.params?.process)
  const virtualProcess = virtualNode?.processParameterBase ?? virtualNode?.params?.process ?? {}
  const processParams = [...nodes]
    .reverse()
    .find((node) => node.type === 'process' && node.params)
    ?.params ?? {}

  return {
    axial_depth: virtualProcess.axial_depth ?? processParams.axial_depth ?? null,
    by_node: byNode,
    feed_rate: virtualProcess.feed_rate ?? processParams.feed_rate ?? null,
    machining_coordinate_system: cloneValue(
      virtualNode?.params?.machining_coordinate_system
        ?? virtualProcess.machining_coordinate_system
        ?? processParams.machining_coordinate_system
        ?? DEFAULT_MACHINING_COORDINATE_SYSTEM,
    ),
    radial_depth: virtualProcess.radial_depth ?? processParams.radial_depth ?? null,
    spindle_speed: virtualProcess.spindle_speed ?? processParams.spindle_speed ?? null,
  }
}

function processStateParamsForNode(node) {
  const params = cloneValue(node.params ?? {})
  if (node.type === 'virtual' && node.processParameterBase) {
    params.process = cloneValue(node.processParameterBase)
  }
  return params
}

export function executeLogicNode(node, workflowState, options = {}) {
  const kind = node.logicKind ?? node.params?.logicKind
  if (kind === 'condition') return executeCondition(node, workflowState, options)
  if (kind === 'stop') return executeStop(node, workflowState, options)
  if (kind === 'parameter-update') return executeParameterUpdate(node, workflowState, options)
  if (kind === 'human-review') return executeHumanReview(node, workflowState, options)
  throw new Error(`Unsupported LogicNode kind: ${kind}`)
}

function executeCondition(node, workflowState, options = {}) {
  const metricPath = node.params?.metricPath ?? ''
  const operator = node.params?.operator ?? '>'
  const threshold = numberValue(node.params?.threshold)
  const metric = resolveWorkflowPath(workflowState, metricPath, { ...options, consumerNodeId: node.id })
  const metricValue = numberValue(metric.value)
  const conditionResult = compareValues(metricValue, operator, threshold)
  const result = {
    condition_result: conditionResult,
    metric_path: metricPath,
    metric_result_version_id: metric.result_version_id ?? null,
    metric_source: metric.source,
    metric_value: metricValue,
    operator,
    threshold,
    type: 'logic_condition_result',
  }

  const events = [{
      event_type: 'condition_evaluated',
      payload: result,
      summary: `Condition evaluated: ${conditionResult}`,
    }]
  if (!conditionResult) {
    events.push({
      event_type: 'run_stopped',
      payload: result,
      summary: 'Condition evaluated false; compensation branch skipped',
    })
  }

  return logicEnvelope(node, {
    control: conditionResult
      ? {}
      : {
          halt_after_node: true,
          reason: 'condition false; compensation branch skipped',
        },
    events,
    result,
    state_patch: conditionResult ? {} : { status: 'stopped' },
  })
}

function executeStop(node, workflowState, options = {}) {
  const metricPath = node.params?.metricPath ?? ''
  const tolerance = numberValue(node.params?.tolerance)
  const maxIterations = numberValue(node.params?.maxIterations)
  const metric = resolveWorkflowPath(workflowState, metricPath, { ...options, consumerNodeId: node.id })
  const metricValue = numberValue(metric.value)
  const iterationValue = numberValue(
    workflowState.runtime_metrics?.iteration
      ?? workflowState.runtime_metrics?.current_iteration
      ?? 0,
  )
  const toleranceReached = Number.isFinite(metricValue) && Number.isFinite(tolerance) && metricValue <= tolerance
  const maxIterationsReached = Number.isFinite(maxIterations) && maxIterations > 0 && iterationValue >= maxIterations
  const shouldStop = toleranceReached || maxIterationsReached
  const result = {
    iteration: iterationValue,
    max_iterations: maxIterations,
    metric_path: metricPath,
    metric_result_version_id: metric.result_version_id ?? null,
    metric_source: metric.source,
    metric_value: metricValue,
    should_stop: shouldStop,
    tolerance,
    tolerance_reached: toleranceReached,
    type: 'logic_stop_result',
  }

  return logicEnvelope(node, {
    control: shouldStop
      ? { halt_after_node: true, reason: node.params?.stopReason ?? 'converged' }
      : {},
    events: shouldStop
      ? [{
          event_type: 'run_stopped',
          payload: result,
          summary: node.params?.stopReason || 'Workflow stopped by convergence logic',
        }]
      : [],
    result,
    state_patch: shouldStop ? { status: 'stopped' } : {},
  })
}

function executeParameterUpdate(node, workflowState, options = {}) {
  const sourcePath = node.params?.sourcePath ?? ''
  const targetPath = node.params?.targetPath ?? ''
  const updateMode = node.params?.updateMode ?? 'replace'
  const source = resolveWorkflowPath(workflowState, sourcePath, { ...options, consumerNodeId: node.id })
  const target = resolveWorkflowPath(workflowState, targetPath, { ...options, consumerNodeId: node.id })
  const previousValue = target.value
  const updatedValue = updatedParameterValue(previousValue, source.value, updateMode)
  const targetVirtualNodeIds = downstreamVirtualNodeIds(node.id, options.nodes ?? [], options.edges ?? [])
  const patch = createParameterPatch({
    created_by_node_id: node.id,
    operation: updateMode,
    source_result_ref: {
      path: sourcePath,
      result_version_id: source.result_version_id ?? null,
      source: source.source,
    },
    target_path: targetPath,
    target_virtual_node_ids: targetVirtualNodeIds.length ? targetVirtualNodeIds : undefined,
    value: source.value,
  })
  const result = {
    patch,
    previous_value: previousValue,
    source_path: sourcePath,
    source_value: source.value,
    target_path: targetPath,
    type: 'logic_parameter_update_result',
    update_mode: updateMode,
    updated_value: updatedValue,
  }

  return logicEnvelope(node, {
    events: [{
      event_type: 'parameter_patch_created',
      payload: {
        created_by_node_id: patch.created_by_node_id,
        operation: patch.operation,
        patch_id: patch.patch_id,
        target_path: patch.target_path,
        target_virtual_node_ids: patch.target_virtual_node_ids ?? [],
        value: patch.value,
      },
      summary: `Parameter patch created: ${targetPath}`,
    }],
    result,
    state_patch: { parameter_patches: [patch] },
  })
}

function executeHumanReview(node, workflowState, options) {
  const prompt = node.params?.prompt ?? 'Review workflow state before continuing.'
  const decision = typeof options.humanReview === 'function'
    ? options.humanReview({ node, prompt, workflowState })
    : null
  const result = {
    approve_label: node.params?.approveLabel ?? 'Approve',
    decision: decision ?? null,
    prompt,
    reject_label: node.params?.rejectLabel ?? 'Reject',
    review_status: decision ? 'reviewed' : 'required',
    reviewer_role: node.params?.reviewerRole ?? '',
    type: 'logic_human_review_result',
  }

  return logicEnvelope(node, {
    control: {
      halt_after_node: true,
      reason: 'human review required',
    },
    events: [{
      event_type: 'human_review_required',
      payload: result,
      summary: prompt,
    }],
    result,
    state_patch: { status: 'paused' },
  })
}

function logicEnvelope(node, output) {
  return {
    block_id: null,
    control: cloneValue(output.control ?? {}),
    derived_metrics: {},
    events: cloneValue(output.events ?? []),
    logic_kind: node.logicKind,
    ok: true,
    raw_response: null,
    result: cloneValue(output.result),
    state_patch: cloneValue(output.state_patch ?? {}),
  }
}

function compareValues(left, operator, right) {
  if (operator === '>') return left > right
  if (operator === '>=') return left >= right
  if (operator === '<') return left < right
  if (operator === '<=') return left <= right
  if (operator === '==') return left === right
  if (operator === '!=') return left !== right
  throw new Error(`Unsupported condition operator: ${operator}`)
}

function updatedParameterValue(previousValue, sourceValue, updateMode) {
  if (updateMode === 'replace') return sourceValue
  const previousNumber = numberValue(previousValue)
  const sourceNumber = numberValue(sourceValue)
  if (!Number.isFinite(previousNumber) || !Number.isFinite(sourceNumber)) {
    throw new Error(`Parameter update mode ${updateMode} requires numeric values.`)
  }
  if (updateMode === 'add') return previousNumber + sourceNumber
  if (updateMode === 'scale') return previousNumber * sourceNumber
  throw new Error(`Unsupported parameter update mode: ${updateMode}`)
}

function patchForProcessParameterTarget(targetPath, value) {
  const normalized = targetPath.startsWith('process_parameters.')
    ? targetPath.slice('process_parameters.'.length)
    : targetPath
  if (!normalized) throw new Error('Parameter targetPath is required.')
  return setPath({}, normalized, value)
}

function downstreamVirtualNodeIds(nodeId, nodes = [], edges = []) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const downstream = []
  const visited = new Set()
  const queue = [nodeId]

  while (queue.length) {
    const current = queue.shift()
    for (const edge of edges) {
      if (edge.from !== current || visited.has(edge.to)) continue
      visited.add(edge.to)
      const target = nodeById.get(edge.to)
      if (target?.type === 'virtual') {
        downstream.push(edge.to)
        continue
      }
      queue.push(edge.to)
    }
  }

  return downstream
}

function resolveWorkflowPath(workflowState, path, options = {}) {
  const candidates = [
    { source: path, value: getPath(workflowState, path) },
    { source: `runtime_metrics.${path}`, value: getPath(workflowState.runtime_metrics, path) },
    { source: `process_parameters.${path}`, value: getPath(workflowState.process_parameters, path) },
  ]

  if (path.startsWith('process_parameters.')) {
    candidates.unshift({
      source: path,
      value: getPath(workflowState, path),
    })
  }

  const typedResult = resolveTypedNodeResult(workflowState, path, options)
  if (typedResult.found) candidates.unshift(typedResult)

  const directResult = resolveLatestResultPath(workflowState, path, options)
  if (directResult.found) candidates.unshift(directResult)

  const match = candidates.find((candidate) => candidate.value !== undefined)
  if (match) return match
  return { source: path, value: undefined }
}

function resolveTypedNodeResult(workflowState, path, options = {}) {
  const [type, ...rest] = path.split('.')
  if (!type || !rest.length) return { found: false }
  const entry = options.edges && options.consumerNodeId
    ? resolveUpstreamNodeResultOfType(workflowState, type, {
        consumerNodeId: options.consumerNodeId,
        edges: options.edges,
      })
    : latestNodeResultOfType(workflowState, type)
  if (!entry) return { found: false }
  const resultVersion = assertFreshNodeResult(workflowState, entry.nodeId, {
    consumer_node_id: options.consumerNodeId,
  })
  const restPath = rest.join('.')
  const aliases = type === 'compensation_plan' && restPath === 'radial_depth_delta'
    ? ['plan.delta_radial_depth', 'result.compensation_plan.delta_radial_depth']
    : [restPath]
  for (const alias of aliases) {
    const value = getPath(entry.result, alias)
    if (value !== undefined) {
      return {
        found: true,
        result_version_id: resultVersion?.node_result_version_id ?? null,
        source: `node_results.${entry.nodeId}.result.${alias}`,
        value,
      }
    }
  }
  return { found: false }
}

function resolveLatestResultPath(workflowState, path, options = {}) {
  if (!path.startsWith('result.')) return { found: false }
  const latest = latestNodeResult(workflowState)
  if (!latest) return { found: false }
  const resultVersion = assertFreshNodeResult(workflowState, latest.nodeId, {
    consumer_node_id: options.consumerNodeId,
  })
  const value = getPath(latest.result, path)
  return value === undefined
    ? { found: false }
    : {
        found: true,
        result_version_id: resultVersion?.node_result_version_id ?? null,
        source: `node_results.${latest.nodeId}.${path}`,
        value,
      }
}

function latestNodeResultOfType(workflowState, type) {
  return latestNodeResult(workflowState, (entry) => entry.result?.type === type)
}

function latestNodeResult(workflowState, predicate = () => true) {
  const entries = Object.entries(workflowState.node_results ?? {})
    .map(([nodeId, envelope]) => ({ envelope, nodeId, result: envelope?.result }))
    .reverse()
  return entries.find(predicate) ?? null
}

function getPath(source, path) {
  if (!source || !path) return undefined
  return path.split('.').reduce((value, key) => {
    if (value == null) return undefined
    return value[key]
  }, source)
}

function setPath(target, path, value) {
  const parts = path.split('.').filter(Boolean)
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

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : NaN
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
