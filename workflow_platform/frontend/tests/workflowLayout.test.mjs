import assert from 'node:assert/strict'
import test from 'node:test'

import { arrangeWorkflowNodes } from '../runtime/workflowLayout.js'

test('arrangeWorkflowNodes packs large demo graphs into the visible canvas width', () => {
  const nodes = [
    { id: 'virtual-a', type: 'virtual' },
    { id: 'condition-a', type: 'logic' },
    { groupId: 'wtc-a', id: 'wtc-a-input', type: 'processInput' },
    { groupId: 'wtc-a', id: 'wtc-a-process', type: 'process' },
    { groupId: 'wtc-a', id: 'wtc-a-output', type: 'processOutput' },
    { id: 'parameter-update-a', type: 'logic' },
    { id: 'virtual-b', type: 'virtual' },
    { id: 'condition-b', type: 'logic' },
    { groupId: 'wtc-b', id: 'wtc-b-input', type: 'processInput' },
    { groupId: 'wtc-b', id: 'wtc-b-process', type: 'process' },
    { groupId: 'wtc-b', id: 'wtc-b-output', type: 'processOutput' },
    { id: 'parameter-update-b', type: 'logic' },
    { id: 'virtual-c', type: 'virtual' },
    { id: 'stop', type: 'logic' },
  ]

  const arranged = arrangeWorkflowNodes(nodes, {
    canvasWidth: 1440,
    groupGap: 150,
    originX: 80,
    processGap: 190,
    unitGap: 260,
  })

  const maxX = Math.max(...arranged.map((node) => node.x))
  assert.ok(maxX <= 1280, `expected max x <= 1280, received ${maxX}`)
  assert.equal(arranged.find((node) => node.id === 'wtc-a-process').x, arranged.find((node) => node.id === 'wtc-a-input').x + 190)
  assert.equal(arranged.find((node) => node.id === 'wtc-a-output').x, arranged.find((node) => node.id === 'wtc-a-input').x + 380)
})

test('arrangeWorkflowNodes keeps the closed-loop demo compact on a narrow canvas', () => {
  const nodes = [
    { id: 'virtual-a', type: 'virtual' },
    { id: 'condition-a', type: 'logic' },
    { groupId: 'wtc-a', id: 'wtc-a-input', type: 'processInput' },
    { groupId: 'wtc-a', id: 'wtc-a-process', type: 'process' },
    { groupId: 'wtc-a', id: 'wtc-a-output', type: 'processOutput' },
    { id: 'parameter-update-a', type: 'logic' },
    { id: 'virtual-b', type: 'virtual' },
    { id: 'condition-b', type: 'logic' },
    { groupId: 'wtc-b', id: 'wtc-b-input', type: 'processInput' },
    { groupId: 'wtc-b', id: 'wtc-b-process', type: 'process' },
    { groupId: 'wtc-b', id: 'wtc-b-output', type: 'processOutput' },
    { id: 'parameter-update-b', type: 'logic' },
    { id: 'virtual-c', type: 'virtual' },
    { id: 'stop', type: 'logic' },
  ]

  const arranged = arrangeWorkflowNodes(nodes, {
    canvasWidth: 960,
    originX: 40,
    originY: 44,
    processGap: 240,
    rowGap: 136,
    unitGap: 220,
  })

  assert.ok(Math.max(...arranged.map((node) => node.x)) <= 740)
  assert.ok(Math.max(...arranged.map((node) => node.y)) <= 620)
})
