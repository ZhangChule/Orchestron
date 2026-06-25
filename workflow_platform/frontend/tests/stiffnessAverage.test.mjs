import assert from 'node:assert/strict'
import test from 'node:test'

import {
  averageStiffnessFromText,
  stiffnessValuesFromText,
} from '../runtime/stiffnessAverage.js'

test('stiffnessValuesFromText parses comma, whitespace, and semicolon separated matrix values', () => {
  assert.deepEqual(stiffnessValuesFromText('1, 2, 3\n4 5 6\n7;8;9'), [1, 2, 3, 4, 5, 6, 7, 8, 9])
})

test('averageStiffnessFromText returns the numeric matrix average', () => {
  assert.equal(averageStiffnessFromText('100, 200\n300, 400'), 250)
})

test('stiffnessValuesFromText rejects non-positive values', () => {
  assert.throws(() => stiffnessValuesFromText('100, 0'), /positive numbers/)
})
