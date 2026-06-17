export function arrangeWorkflowNodes(nodes = [], options = {}) {
  const originX = options.originX ?? 80
  const originY = options.originY ?? 110
  const unitGap = options.unitGap ?? 260
  const rowGap = options.rowGap ?? 180
  const processGap = options.processGap ?? 190
  const groupGap = options.groupGap ?? 150
  const canvasWidth = options.canvasWidth ?? 1440
  const maxSlots = Math.max(1, Math.floor((canvasWidth - originX * 2) / unitGap))
  const nextNodes = cloneValue(nodes)
  const units = workflowUnits(nextNodes)
  let slot = 0
  let row = 0

  for (const unit of units) {
    const unitSlots = unit.type === 'group' ? 3 : 1
    if (slot > 0 && slot + unitSlots > maxSlots) {
      slot = 0
      row += 1
    }

    const x = originX + slot * unitGap
    const y = originY + row * rowGap
    if (unit.type === 'group') {
      if (unit.input) Object.assign(unit.input, { x, y })
      if (unit.process) Object.assign(unit.process, { x: x + processGap, y })
      if (unit.output) Object.assign(unit.output, { x: x + processGap * 2, y })
      slot += unitSlots
    } else {
      Object.assign(unit.node, { x, y })
      slot += unitSlots
    }

    if (slot >= maxSlots) {
      slot = 0
      row += 1
    } else if (unit.type === 'group') {
      slot += Math.max(0, Math.round(groupGap / unitGap))
    }
  }

  return nextNodes
}

function workflowUnits(nodes) {
  const units = []
  const seenGroups = new Set()
  for (const node of nodes) {
    if (node.groupId) {
      if (seenGroups.has(node.groupId)) continue
      seenGroups.add(node.groupId)
      units.push({
        input: nodes.find((item) => item.groupId === node.groupId && item.type === 'processInput') ?? null,
        output: nodes.find((item) => item.groupId === node.groupId && item.type === 'processOutput') ?? null,
        process: nodes.find((item) => item.groupId === node.groupId && item.type === 'process') ?? null,
        type: 'group',
      })
    } else {
      units.push({ node, type: 'node' })
    }
  }
  return units
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
