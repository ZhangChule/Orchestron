export function addWorkflowEdge(edges = [], edge) {
  if (!edge?.from || !edge?.to) return cloneValue(edges)
  if (edges.some((item) => item.from === edge.from && item.to === edge.to)) return cloneValue(edges)
  return [...cloneValue(edges), { from: edge.from, to: edge.to }]
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
