export function resolveUpstreamNodeResultOfType(workflowState, type, options = {}) {
  const consumerNodeId = options.consumerNodeId ?? options.nodeId ?? null
  const upstreamIds = consumerNodeId
    ? upstreamNodeIds(consumerNodeId, options.edges ?? [])
    : new Set()
  const strict = Boolean(consumerNodeId && options.edges)
  return latestNodeResultOfType(workflowState, type, {
    allowedNodeIds: strict ? upstreamIds : null,
  })
}

export function latestNodeResultOfType(workflowState, type, options = {}) {
  const allowedNodeIds = options.allowedNodeIds
  const entries = Object.entries(workflowState?.node_results ?? {})
    .map(([nodeId, envelope]) => ({ envelope, nodeId, result: envelope?.result }))
    .reverse()

  return entries.find((entry) => {
    if (allowedNodeIds && !allowedNodeIds.has(entry.nodeId)) return false
    return entry.result?.type === type
  }) ?? null
}

export function upstreamNodeIds(nodeId, edges = []) {
  const upstream = new Set()
  const stack = [nodeId]

  while (stack.length) {
    const current = stack.pop()
    for (const edge of edges) {
      if (edge.to !== current || upstream.has(edge.from)) continue
      upstream.add(edge.from)
      stack.push(edge.from)
    }
  }

  return upstream
}
