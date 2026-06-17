import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyRuntimeProcessParametersToVirtualNode,
  captureVirtualProcessBase,
  resetVirtualProcessToBase,
  virtualNodeWithRuntimeProcessParameters,
  virtualNodeRuntimeParameterView,
} from '../runtime/workflowParameterBase.js'

test('captureVirtualProcessBase stores the explicit initial virtual machining process base', () => {
  const node = {
    params: {
      process: {
        feed_rate: '48',
        radial_depth: '1.0',
        spindle_speed: '7200',
      },
    },
    type: 'virtual',
  }

  captureVirtualProcessBase(node)
  node.params.process.radial_depth = '0.8'

  assert.deepEqual(node.processParameterBase, {
    feed_rate: '48',
    radial_depth: '1.0',
    spindle_speed: '7200',
  })
})

test('applyRuntimeProcessParametersToVirtualNode resets to base before applying runtime parameters', () => {
  const node = {
    params: {
      process: {
        axial_depth: '10',
        feed_rate: '48',
        radial_depth: '1.0',
        spindle_speed: '7200',
      },
    },
    type: 'virtual',
  }

  captureVirtualProcessBase(node)

  applyRuntimeProcessParametersToVirtualNode(node, {
    process_parameters: { radial_depth: 0.9 },
  })
  assert.equal(node.params.process.radial_depth, 0.9)

  applyRuntimeProcessParametersToVirtualNode(node, {
    process_parameters: { radial_depth: 0.7 },
  })
  assert.deepEqual(node.params.process, {
    axial_depth: '10',
    feed_rate: '48',
    radial_depth: 0.7,
    spindle_speed: '7200',
  })
})

test('applyRuntimeProcessParametersToVirtualNode uses the latest frozen base for the current virtual node', () => {
  const node = {
    id: 'virtual-2',
    params: {
      process: {
        feed_rate: '48',
        radial_depth: '1.0',
        spindle_speed: '7200',
      },
    },
    processParameterBase: {
      feed_rate: '48',
      radial_depth: '1.0',
      spindle_speed: '7200',
    },
    type: 'virtual',
  }

  applyRuntimeProcessParametersToVirtualNode(node, {
    parameter_base_versions: [
      {
        base_version_id: 'base-v2',
        parameters: {
          by_node: {
            'virtual-2': {
              process: {
                feed_rate: '48',
                radial_depth: '1.0',
                spindle_speed: '7200',
              },
            },
          },
          feed_rate: '48',
          radial_depth: 0.84,
          spindle_speed: '7200',
        },
        virtual_node_id: 'virtual-2',
      },
    ],
    process_parameters: {
      radial_depth: '1.0',
    },
  })

  assert.equal(node.params.process.radial_depth, 0.84)
})

test('resetVirtualProcessToBase restores the downstream virtual node after prior patch application', () => {
  const node = {
    params: {
      process: {
        radial_depth: '1.0',
        spindle_speed: '7200',
      },
    },
    type: 'virtual',
  }

  captureVirtualProcessBase(node)
  applyRuntimeProcessParametersToVirtualNode(node, {
    process_parameters: { radial_depth: 0.84 },
  })
  resetVirtualProcessToBase(node)

  assert.deepEqual(node.params.process, {
    radial_depth: '1.0',
    spindle_speed: '7200',
  })
}
)

test('virtualNodeWithRuntimeProcessParameters applies runtime parameters without mutating the authored virtual node', () => {
  const node = {
    id: 'virtual-2',
    params: {
      process: {
        feed_rate: '48',
        radial_depth: '1.0',
        spindle_speed: '7200',
      },
    },
    processParameterBase: {
      feed_rate: '48',
      radial_depth: '1.0',
      spindle_speed: '7200',
    },
    type: 'virtual',
  }

  const runtimeNode = virtualNodeWithRuntimeProcessParameters(node, {
    parameter_base_versions: [
      {
        base_version_id: 'base-v2',
        parameters: {
          feed_rate: '48',
          radial_depth: 0.9088991576181829,
          spindle_speed: '7200',
        },
        virtual_node_id: 'virtual-2',
      },
    ],
    process_parameters: {
      radial_depth: 0.9088991576181829,
    },
  })

  assert.equal(runtimeNode.params.process.radial_depth, 0.9088991576181829)
  assert.deepEqual(node.params.process, {
    feed_rate: '48',
    radial_depth: '1.0',
    spindle_speed: '7200',
  })
  assert.deepEqual(node.processParameterBase, {
    feed_rate: '48',
    radial_depth: '1.0',
    spindle_speed: '7200',
  })
})

test('virtualNodeRuntimeParameterView exposes execution parameters separately from authored base', () => {
  const node = {
    id: 'virtual-2',
    params: {
      process: {
        feed_rate: '48',
        radial_depth: '1.0',
        spindle_speed: '7200',
      },
    },
    processParameterBase: {
      feed_rate: '48',
      radial_depth: '1.0',
      spindle_speed: '7200',
    },
    type: 'virtual',
  }

  const view = virtualNodeRuntimeParameterView(node, {
    parameter_base_versions: [
      {
        base_version_id: 'base-v2',
        parameters: {
          feed_rate: '48',
          radial_depth: 0.9088991576181829,
          spindle_speed: '7200',
        },
        source_patch_ids: ['patch-wtc-b'],
        virtual_node_id: 'virtual-2',
      },
    ],
  })

  assert.equal(view.node_id, 'virtual-2')
  assert.equal(view.base_version_id, 'base-v2')
  assert.equal(view.design_parameters.radial_depth, '1.0')
  assert.equal(view.execution_parameters.radial_depth, 0.9088991576181829)
  assert.equal(view.display_parameters.radial_depth, 0.9088991576181829)
  assert.deepEqual(view.source_patch_ids, ['patch-wtc-b'])
  assert.deepEqual(node.params.process, {
    feed_rate: '48',
    radial_depth: '1.0',
    spindle_speed: '7200',
  })
})
