export const SNAPSHOT_SCHEMA_VERSION = 'workflow-platform-run-snapshot.v2'
export const SUPPORTED_SNAPSHOT_SCHEMA_VERSIONS = Object.freeze([
  'workflow-platform-run-snapshot.v1',
  SNAPSHOT_SCHEMA_VERSION,
])

export function createRunSnapshot(input = {}, options = {}) {
  const workflowState = normalizeWorkflowState(input.workflowState ?? {})
  const timestamp = timestampFrom(options.now)
  return {
    app_version: input.appVersion ?? 'workflow-platform-frontend',
    event_log: cloneValue(workflowState.event_log ?? []),
    exported_at: timestamp,
    initial_process_parameter_base: cloneValue(workflowState.initial_process_parameter_base ?? {}),
    node_result_versions: cloneValue(workflowState.node_result_versions ?? []),
    node_results: cloneValue(workflowState.node_results ?? {}),
    parameter_base_versions: cloneValue(workflowState.parameter_base_versions ?? []),
    parameter_patches: cloneValue(workflowState.parameter_patches ?? []),
    process_parameters: cloneValue(workflowState.process_parameters ?? {}),
    run_mode: input.runMode ?? workflowState.run_mode ?? 'run_all',
    runtime_version: input.runtimeVersion ?? 'workflow-runtime-v0',
    run_history: cloneValue(workflowState.run_history ?? []),
    runtime_metrics: cloneValue(workflowState.runtime_metrics ?? {}),
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    timestamp,
    visualization_sessions: cloneValue(workflowState.visualization_sessions ?? []),
    workflow_graph: {
      edges: cloneValue(input.edges ?? []),
      nodes: cloneValue(input.nodes ?? []),
      selected_node_id: input.selectedNodeId ?? null,
    },
    workflow_state: workflowState,
  }
}

export function parseRunSnapshot(snapshot) {
  const parsed = typeof snapshot === 'string' ? JSON.parse(snapshot) : cloneValue(snapshot)
  if (parsed?.schema_version && !SUPPORTED_SNAPSHOT_SCHEMA_VERSIONS.includes(parsed.schema_version)) {
    throw new Error(`Unsupported snapshot schema: ${parsed?.schema_version ?? 'missing'}`)
  }
  parsed.schema_version = parsed.schema_version ?? 'legacy'
  if (!Array.isArray(parsed.workflow_graph?.nodes) || !Array.isArray(parsed.workflow_graph?.edges)) {
    throw new Error('Snapshot workflow_graph must include nodes and edges arrays.')
  }
  return parsed
}

export function restoreRunSnapshot(snapshot) {
  const parsed = parseRunSnapshot(snapshot)
  const workflowState = normalizeWorkflowState({
    ...(parsed.workflow_state ?? {}),
    event_log: cloneValue(parsed.workflow_state?.event_log ?? parsed.event_log ?? []),
    initial_process_parameter_base: cloneValue(parsed.workflow_state?.initial_process_parameter_base ?? parsed.initial_process_parameter_base ?? {}),
    node_result_versions: cloneValue(parsed.workflow_state?.node_result_versions ?? parsed.node_result_versions ?? []),
    node_results: cloneValue(parsed.workflow_state?.node_results ?? parsed.node_results ?? {}),
    parameter_base_versions: cloneValue(parsed.workflow_state?.parameter_base_versions ?? parsed.parameter_base_versions ?? parsed.workflow_state?.process_parameter_base_versions ?? []),
    parameter_patches: cloneValue(parsed.workflow_state?.parameter_patches ?? parsed.parameter_patches ?? []),
    process_parameters: cloneValue(parsed.workflow_state?.process_parameters ?? parsed.process_parameters ?? {}),
    run_history: cloneValue(parsed.workflow_state?.run_history ?? parsed.run_history ?? []),
    runtime_metrics: cloneValue(parsed.workflow_state?.runtime_metrics ?? parsed.runtime_metrics ?? {}),
    visualization_sessions: cloneValue(parsed.workflow_state?.visualization_sessions ?? parsed.visualization_sessions ?? []),
  })

  return {
    edges: cloneValue(parsed.workflow_graph.edges),
    nodes: cloneValue(parsed.workflow_graph.nodes),
    runMode: parsed.run_mode ?? workflowState.run_mode ?? 'run_all',
    selectedNodeId: parsed.workflow_graph.selected_node_id ?? parsed.workflow_graph.nodes[0]?.id ?? null,
    workflowState,
  }
}

function timestampFrom(now) {
  if (typeof now === 'function') return now()
  return new Date().toISOString()
}

function normalizeWorkflowState(workflowState) {
  const cloned = cloneValue(workflowState ?? {})
  return {
    ...cloned,
    event_log: cloneValue(cloned.event_log ?? []),
    initial_process_parameter_base: cloneValue(cloned.initial_process_parameter_base ?? {}),
    node_result_versions: cloneValue(cloned.node_result_versions ?? []),
    node_results: cloneValue(cloned.node_results ?? {}),
    parameter_base_versions: cloneValue(cloned.parameter_base_versions ?? cloned.process_parameter_base_versions ?? []),
    parameter_patches: cloneValue(cloned.parameter_patches ?? []),
    process_parameters: cloneValue(cloned.process_parameters ?? {}),
    run_history: cloneValue(cloned.run_history ?? []),
    run_mode: cloned.run_mode ?? 'run_all',
    runtime_metrics: cloneValue(cloned.runtime_metrics ?? {}),
    visualization_sessions: cloneValue(cloned.visualization_sessions ?? []),
  }
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
