import {
  addNodeResultVersion,
  appendExecutionEvent,
  assertFreshNodeResult,
  createNodeInputFingerprint,
  createExecutionEvent,
  createNodeResultVersionForExecution,
  freezeProcessParameterBaseForVirtualNode,
  recordNodeResult,
} from './workflowExecutionCore.js'
import {
  blockDefinition,
  blockIdForNode,
  executeBlock,
} from './workflowBlockAdapters.js'
import { executeLogicNode } from './workflowLogicNodes.js'
import { resolveUpstreamNodeResultOfType } from './workflowResultResolution.js'

export class NodeExecutionError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'NodeExecutionError'
    this.cause = options.cause
    this.node_id = options.node_id ?? null
    this.node_type = options.node_type ?? null
    this.workflowState = options.workflowState ?? null
  }
}

export async function executeNode(node, workflowState, options = {}) {
  let nextState = appendNodeEvent(workflowState, node, {
    event_type: 'node_started',
    summary: `${node.type} node started`,
  })

  try {
    const blockId = blockIdForNode(node)
    if (blockId === 'virtual-machining.wall-error-prediction') {
      const freeze = freezeProcessParameterBaseForVirtualNode(nextState, node, {
        base_version_id: options.base_version_id ?? options.baseVersionId,
        edges: options.edges ?? [],
        nodes: options.nodes ?? [],
        now: options.now,
      })
      nextState = freeze.state
      nextState = appendResultEvents(nextState, node, freeze.events)
    }
    if (blockId === 'process-app.wall-thickness-compensation') {
      assertLatestResultOfTypeFresh(nextState, 'wall_error', node, options.edges ?? [])
    }
    const definition = blockId ? blockDefinition(blockId) : null
    const parameterBaseVersionId = latestBaseVersionIdForExecution(nextState, node, blockId)
    const inputFingerprint = createNodeInputFingerprint(node, nextState, {
      block_id: blockId,
      block_version: definition?.version ?? null,
      parameter_base_version_id: parameterBaseVersionId,
    })
    const result = blockId
      ? await executeBlock(blockId, nextState, node, { runners: options.runners ?? {} })
      : await executeNodeWithoutBlock(node, nextState, options)
    const resultVersion = createNodeResultVersionForExecution(nextState, node, result, {
      block_id: blockId,
      block_version: definition?.version ?? null,
      input_fingerprint: inputFingerprint,
      node_result_version_id: options.node_result_version_id ?? options.nodeResultVersionId?.(),
      parameter_base_version_id: parameterBaseVersionId,
    })
    const versionedResult = {
      ...result,
      result_version: resultVersion,
      result_version_id: resultVersion.node_result_version_id,
    }

    nextState = applyExecutionResult(nextState, node, versionedResult)
    nextState = addNodeResultVersion(nextState, resultVersion)
    nextState = appendResultEvents(nextState, node, versionedResult.events ?? [])
    nextState = appendNodeEvent(nextState, node, resultVersionCreatedEvent(resultVersion))
    nextState = appendNodeEvent(nextState, node, {
      event_type: 'node_completed',
      payload: { block_id: versionedResult.block_id, logic_kind: versionedResult.logic_kind ?? null },
      summary: `${node.type} node completed`,
    })

    return { result: versionedResult, state: nextState }
  } catch (error) {
    const failedState = appendNodeEvent(nextState, node, {
      event_type: 'node_failed',
      payload: { error: errorMessage(error) },
      summary: errorMessage(error),
    })
    throw new NodeExecutionError(errorMessage(error), {
      cause: error,
      node_id: node.id,
      node_type: node.type,
      workflowState: failedState,
    })
  }
}

function assertLatestResultOfTypeFresh(workflowState, resultType, consumerNode, edges = []) {
  const latest = resolveUpstreamNodeResultOfType(workflowState, resultType, {
    consumerNodeId: consumerNode.id,
    edges,
  })
  if (latest) assertFreshNodeResult(workflowState, latest.nodeId, { consumer_node_id: consumerNode.id })
}

function latestBaseVersionIdForExecution(workflowState, node, blockId) {
  if (blockId !== 'virtual-machining.wall-error-prediction') return null
  const matches = (workflowState.parameter_base_versions ?? [])
    .filter((baseVersion) => baseVersion.virtual_node_id === node.id)
  return matches.at(-1)?.base_version_id ?? null
}

async function executeNodeWithoutBlock(node, workflowState, options) {
  if (node.type === 'logic') return executeLogicNode(node, workflowState, options)
  return executeFallbackNode(node, workflowState, options)
}

async function executeFallbackNode(node, workflowState, options) {
  if (typeof options.fallback !== 'function') {
    throw new Error(`No block mapping or fallback runner for node: ${node.id}`)
  }

  const runnerOutput = await options.fallback(node, workflowState)
  return {
    block_id: null,
    derived_metrics: cloneValue(runnerOutput?.derived_metrics ?? runnerOutput?.derivedMetrics ?? {}),
    events: cloneValue(runnerOutput?.events ?? []),
    ok: true,
    raw_response: cloneValue(runnerOutput?.raw_response ?? runnerOutput?.rawResponse ?? node.lastResponse ?? null),
    result: cloneValue(runnerOutput?.result ?? node.data ?? node.lastResponse?.result ?? node.lastResponse ?? null),
    state_patch: cloneValue(runnerOutput?.state_patch ?? runnerOutput?.statePatch ?? {}),
  }
}

function applyExecutionResult(workflowState, node, executionResult) {
  const statePatch = executionResult.state_patch ?? {}
  const patchedState = {
    ...workflowState,
    status: statePatch.status ?? workflowState.status,
    parameter_base_versions: statePatch.parameter_base_versions
      ? [...(workflowState.parameter_base_versions ?? []), ...cloneValue(statePatch.parameter_base_versions)]
      : workflowState.parameter_base_versions,
    parameter_patches: statePatch.parameter_patches
      ? [...(workflowState.parameter_patches ?? []), ...cloneValue(statePatch.parameter_patches)]
      : workflowState.parameter_patches,
    process_parameters: statePatch.process_parameters
      ? { ...workflowState.process_parameters, ...cloneValue(statePatch.process_parameters) }
      : workflowState.process_parameters,
    workpiece_state: statePatch.workpiece_state
      ? { ...workflowState.workpiece_state, ...cloneValue(statePatch.workpiece_state) }
      : workflowState.workpiece_state,
  }

  return recordNodeResult(
    patchedState,
    node.id,
    executionResult,
    executionResult.derived_metrics ?? {},
  )
}

function appendResultEvents(workflowState, node, events) {
  return events.reduce((nextState, event) => appendNodeEvent(nextState, node, event), workflowState)
}

function appendNodeEvent(workflowState, node, event) {
  return appendExecutionEvent(workflowState, createExecutionEvent({
    ...event,
    node_id: node.id,
    node_type: node.type,
    run_id: workflowState.run_id,
  }))
}

function resultVersionCreatedEvent(resultVersion) {
  return {
    event_type: 'result_version_created',
    payload: {
      execution_index: resultVersion.execution_index,
      input_fingerprint_summary: inputFingerprintSummary(resultVersion.input_fingerprint),
      node_result_version_id: resultVersion.node_result_version_id,
      node_run_id: resultVersion.node_run_id,
      parameter_base_version_id: resultVersion.parameter_base_version_id,
      stale: resultVersion.stale,
    },
    summary: `Result version created: ${resultVersion.node_result_version_id}`,
  }
}

function inputFingerprintSummary(fingerprint) {
  try {
    const parsed = JSON.parse(fingerprint)
    return {
      block_id: parsed.block_id ?? null,
      block_version: parsed.block_version ?? null,
      parameter_base_version_id: parsed.parameter_base_version_id ?? null,
      parameter_patch_ids: parsed.parameter_patch_ids ?? [],
    }
  } catch {
    return String(fingerprint ?? '').slice(0, 160)
  }
}

function errorMessage(error) {
  if (error instanceof Error) return error.message
  return String(error)
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
