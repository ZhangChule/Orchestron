export const BLOCK_DEFINITIONS = Object.freeze({
  'virtual-machining.wall-error-prediction': Object.freeze({
    block_id: 'virtual-machining.wall-error-prediction',
    block_type: 'virtual-machining',
    display_name: 'Virtual machining wall-error prediction',
    endpoint: '/prediction/wall-error',
    existing_behavior_preserved: true,
    input_mapper: 'existing buildVirtualPredictionRequest(node.params)',
    output_mapper: 'node.data.wallErrorPoints + node.lastResponse.result',
    runner_key: 'virtualMachiningWallErrorPrediction',
    version: '0.1.0',
  }),
  'process-app.wall-thickness-compensation': Object.freeze({
    block_id: 'process-app.wall-thickness-compensation',
    block_type: 'process-app',
    display_name: 'Wall thickness compensation',
    endpoint: '/workflow/run',
    existing_behavior_preserved: true,
    input_mapper: 'existing wallErrorPointsForProcess(node)',
    output_mapper: 'node.data.plan + node.lastResponse.result',
    runner_key: 'wallThicknessCompensation',
    version: '0.1.0',
  }),
  'process-app.arppl': Object.freeze({
    block_id: 'process-app.arppl',
    block_type: 'process-app',
    display_name: 'ARPPL registration',
    endpoint: '/workflow/run or /workflow/run-files or /register-files',
    existing_behavior_preserved: true,
    input_mapper: 'existing ARPPL file/json workflow inputs',
    output_mapper: 'node.data.result + node.lastResponse.result',
    runner_key: 'arppl',
    version: '0.1.0',
  }),
})

export function blockIdForNode(nodeConfig) {
  if (!nodeConfig) return null
  if (nodeConfig.type === 'virtual') return 'virtual-machining.wall-error-prediction'
  if (nodeConfig.type !== 'process') return null
  if (nodeConfig.processKind === 'wall-thickness-compensation') return 'process-app.wall-thickness-compensation'
  if (nodeConfig.processKind === 'arppl') return 'process-app.arppl'
  return null
}

export function blockDefinitionForNode(nodeConfig) {
  const blockId = blockIdForNode(nodeConfig)
  return blockId ? BLOCK_DEFINITIONS[blockId] : null
}

export function blockDefinition(blockId) {
  return BLOCK_DEFINITIONS[blockId] ?? null
}

export async function executeBlock(blockId, workflowState, nodeConfig, options = {}) {
  const definition = blockDefinition(blockId)
  if (!definition) throw new Error(`Unknown block definition: ${blockId}`)

  const runner = options.runners?.[definition.runner_key]
  if (typeof runner !== 'function') throw new Error(`Missing runner for block: ${blockId}`)

  const runnerOutput = await runner(nodeConfig, workflowState, definition)
  const rawResponse = runnerOutput?.raw_response ?? runnerOutput?.rawResponse ?? nodeConfig.lastResponse ?? null
  const result = runnerOutput?.result ?? resultFromNode(nodeConfig, rawResponse)
  const derivedMetrics = runnerOutput?.derived_metrics ?? runnerOutput?.derivedMetrics ?? derivedMetricsFromResult(result, rawResponse)

  return {
    block_id: definition.block_id,
    derived_metrics: cloneValue(derivedMetrics),
    events: cloneValue(runnerOutput?.events ?? []),
    ok: true,
    raw_response: cloneValue(rawResponse),
    result: cloneValue(result),
    state_patch: statePatchForResult(nodeConfig, result, derivedMetrics),
  }
}

function resultFromNode(nodeConfig, rawResponse) {
  if (nodeConfig.data) return cloneValue(nodeConfig.data)
  if (rawResponse?.result) return cloneValue(rawResponse.result)
  return cloneValue(rawResponse)
}

function statePatchForResult(nodeConfig, result, derivedMetrics) {
  const patch = {
    node_results: {
      [nodeConfig.id]: cloneValue(result),
    },
    runtime_metrics: cloneValue(derivedMetrics),
  }

  if (result?.type === 'wall_error') {
    patch.workpiece_state = {
      result_type: 'wall_error',
      source_node_id: nodeConfig.id,
    }
  }

  return patch
}

function derivedMetricsFromResult(result, rawResponse) {
  if (result?.type === 'wall_error') return wallErrorMetrics(result.wallErrorPoints ?? rawResponse?.result?.points ?? rawResponse?.points ?? [])
  if (result?.type === 'compensation_plan') return compensationMetrics(result)
  return {}
}

function wallErrorMetrics(points) {
  const errors = points
    .map((point) => Math.abs(Number(point.error)))
    .filter(Number.isFinite)

  if (!errors.length) return {}
  return {
    max_wall_error: Math.max(...errors),
    mean_wall_error: average(errors),
  }
}

function compensationMetrics(result) {
  const delta = Number(result.plan?.delta_radial_depth ?? result.result?.compensation_plan?.delta_radial_depth)
  return Number.isFinite(delta) ? { compensation_delta_radial_depth: delta } : {}
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
