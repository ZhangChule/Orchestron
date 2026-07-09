import { findLatestNodeResultVersion } from './workflowExecutionCore.js'

export const RUN_MODES = Object.freeze({
  RERUN_STALE_ONLY: 'rerun_stale_only',
  RESUME_FROM_SNAPSHOT: 'resume_from_snapshot',
  RUN_ALL: 'run_all',
  RUN_FROM_SELECTED: 'run_from_selected',
})

export function executableNodesForRunMode(input = {}) {
  const mode = input.mode ?? RUN_MODES.RUN_ALL
  const ordered = topologicalNodeOrder(input.nodes ?? [], input.edges ?? [])
    .filter(isExecutableNode)

  if (mode === RUN_MODES.RUN_ALL) return ordered
  if (mode === RUN_MODES.RUN_FROM_SELECTED) {
    if (!input.selectedNodeId) throw new Error('run from selected requires a selected node.')
    const expandedUpstreamIds = expandedUpstreamNodeIdsForSelected(
      input.workflowState,
      input.selectedNodeId,
      input.nodes ?? [],
      input.edges ?? [],
    )
    const selectedPath = selectedRunNodeIds(input.selectedNodeId, expandedUpstreamIds, input.edges ?? [])
    return ordered.filter((node) => selectedPath.has(node.id))
  }
  if (mode === RUN_MODES.RERUN_STALE_ONLY) {
    throw new Error('rerun stale only is reserved but not implemented.')
  }
  throw new Error(`Unsupported run mode: ${mode}`)
}

export function prepareWorkflowStateForRunMode(input = {}) {
  const mode = input.mode ?? RUN_MODES.RUN_ALL
  if (mode === RUN_MODES.RUN_ALL) {
    const freshState = input.initialStateFactory()
    return {
      ...freshState,
      ...preservedGeometryInputsForFreshRun(input.currentState, freshState),
      run_history: foldCurrentRunIntoHistory(input.currentState),
    }
  }
  if (mode === RUN_MODES.RUN_FROM_SELECTED || mode === RUN_MODES.RESUME_FROM_SNAPSHOT) {
    return {
      ...input.currentState,
      run_mode: mode,
      status: 'running',
    }
  }
  throw new Error(`Unsupported run mode: ${mode}`)
}

function preservedGeometryInputsForFreshRun(currentState, freshState) {
  return {
    active_geometry_artifact_refs: {
      ...cloneValue(currentState?.active_geometry_artifact_refs ?? {}),
      ...cloneValue(freshState?.active_geometry_artifact_refs ?? {}),
    },
    geometry_artifacts: mergeGeometryArtifacts(
      currentState?.geometry_artifacts ?? [],
      freshState?.geometry_artifacts ?? [],
    ),
  }
}

function mergeGeometryArtifacts(...artifactLists) {
  const artifactsById = new Map()
  for (const artifact of artifactLists.flat()) {
    if (!artifact?.artifact_id) continue
    artifactsById.set(artifact.artifact_id, cloneValue(artifact))
  }
  return [...artifactsById.values()]
}

function foldCurrentRunIntoHistory(currentState) {
  const history = cloneValue(currentState?.run_history ?? [])
  if (!currentState?.run_id) return history
  const hasRunData = Boolean(
    currentState.event_log?.length
      || Object.keys(currentState.node_results ?? {}).length
      || currentState.node_result_versions?.length
      || currentState.parameter_base_versions?.length
      || currentState.parameter_patches?.length,
  )
  if (!hasRunData) return history
  return [
    ...history,
    {
      event_log: cloneValue(currentState.event_log ?? []),
      node_result_versions: cloneValue(currentState.node_result_versions ?? []),
      node_results: cloneValue(currentState.node_results ?? {}),
      parameter_base_versions: cloneValue(currentState.parameter_base_versions ?? []),
      parameter_patches: cloneValue(currentState.parameter_patches ?? []),
      run_id: currentState.run_id,
      run_mode: currentState.run_mode ?? null,
      runtime_metrics: cloneValue(currentState.runtime_metrics ?? {}),
      status: currentState.status ?? null,
      workflow_id: currentState.workflow_id ?? null,
    },
  ]
}

export function createRunStartedEvent(input = {}) {
  const nodeCount = input.nodeCount ?? 0
  const mode = input.mode ?? RUN_MODES.RUN_ALL
  const expandedFromNodeIds = input.expandedFromNodeIds ?? []
  const summary = expandedFromNodeIds.length
    ? `Run mode ${mode} started with ${nodeCount} nodes; expanded from upstream dependencies: ${expandedFromNodeIds.join(', ')}`
    : `Run mode ${mode} started with ${nodeCount} nodes`
  return {
    event_type: 'run_started',
    payload: {
      expanded_from_node_ids: cloneValue(expandedFromNodeIds),
      node_count: nodeCount,
      run_mode: mode,
      selected_node_id: input.selectedNodeId ?? null,
      state_change_summary: summary,
    },
    summary: `Workflow run started (${mode})`,
  }
}

export function isExecutableNode(node) {
  return node?.type === 'virtual' || node?.type === 'process' || node?.type === 'logic'
}

export function staleUpstreamNodeIdsForSelected(workflowState, selectedNodeId, edges = []) {
  return [...upstreamNodeIds(selectedNodeId, edges)]
    .filter((nodeId) => {
    const latest = findLatestNodeResultVersion(workflowState ?? {}, nodeId)
      return latest?.stale
    })
}

export function unexecutedUpstreamNodeIdsForSelected(workflowState, selectedNodeId, nodes = [], edges = []) {
  const executableUpstreamIds = new Set(
    [...upstreamNodeIds(selectedNodeId, edges)]
      .filter((nodeId) => isExecutableNode(nodes.find((node) => node.id === nodeId))),
  )
  return [...executableUpstreamIds]
    .filter((nodeId) => !findLatestNodeResultVersion(workflowState ?? {}, nodeId))
}

export function expandedUpstreamNodeIdsForSelected(workflowState, selectedNodeId, nodes = [], edges = []) {
  return [...new Set([
    ...staleUpstreamNodeIdsForSelected(workflowState, selectedNodeId, edges),
    ...unexecutedUpstreamNodeIdsForSelected(workflowState, selectedNodeId, nodes, edges),
  ])]
}

function topologicalNodeOrder(nodes, edges) {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const indegree = new Map(nodes.map((node) => [node.id, 0]))
  edges.forEach((edge) => {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1)
    }
  })
  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id)
  const orderedIds = []

  while (queue.length) {
    const id = queue.shift()
    orderedIds.push(id)
    edges
      .filter((edge) => edge.from === id && nodeIds.has(edge.to))
      .forEach((edge) => {
        indegree.set(edge.to, (indegree.get(edge.to) ?? 0) - 1)
        if (indegree.get(edge.to) === 0) queue.push(edge.to)
      })
  }

  const fallbackIds = nodes.map((node) => node.id).filter((id) => !orderedIds.includes(id))
  const order = new Map([...orderedIds, ...fallbackIds].map((id, index) => [id, index]))
  return [...nodes].sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
}

function upstreamNodeIds(nodeId, edges) {
  const upstream = new Set()
  const stack = [nodeId]
  while (stack.length) {
    const current = stack.pop()
    edges
      .filter((edge) => edge.to === current)
      .forEach((edge) => {
        if (!upstream.has(edge.from)) {
          upstream.add(edge.from)
          stack.push(edge.from)
        }
      })
  }
  return upstream
}

function downstreamNodeIds(nodeId, edges) {
  const downstream = new Set()
  const stack = [nodeId]
  while (stack.length) {
    const current = stack.pop()
    edges
      .filter((edge) => edge.from === current)
      .forEach((edge) => {
        if (!downstream.has(edge.to)) {
          downstream.add(edge.to)
          stack.push(edge.to)
        }
      })
  }
  return downstream
}

function selectedRunNodeIds(selectedNodeId, expandedUpstreamIds = [], edges = []) {
  const selectedPath = new Set([selectedNodeId])
  for (const upstreamNodeId of expandedUpstreamIds) {
    for (const nodeId of nodeIdsOnDirectedPaths(upstreamNodeId, selectedNodeId, edges)) {
      selectedPath.add(nodeId)
    }
  }
  return selectedPath
}

function nodeIdsOnDirectedPaths(sourceNodeId, targetNodeId, edges = []) {
  const reachableFromSource = downstreamNodeIds(sourceNodeId, edges)
  reachableFromSource.add(sourceNodeId)
  const upstreamOfTarget = upstreamNodeIds(targetNodeId, edges)
  upstreamOfTarget.add(targetNodeId)
  return new Set([...reachableFromSource].filter((nodeId) => upstreamOfTarget.has(nodeId)))
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
