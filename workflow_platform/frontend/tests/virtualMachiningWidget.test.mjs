import assert from 'node:assert/strict'
import test from 'node:test'

import { createVirtualMachiningWidget } from '../virtualMachiningWidget.js'

test('startMaterialRemovalPreview sends the workflow-served Unity machining job method', async () => {
  const sentMessages = []
  const restoreDom = installDomStubs({
    createUnityInstance: async () => ({
      Module: {},
      SendMessage: (...args) => sentMessages.push(args),
    }),
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      log: createListStub(),
      progress: { value: 0 },
      status: { textContent: '' },
    })

    await widget.startMaterialRemovalPreview({ points: [], toolpath: null })

    assert.equal(sentMessages.length, 1)
    assert.equal(sentMessages[0][0], 'FrontendBridge')
    assert.equal(sentMessages[0][1], 'StartMachiningJob')
    assert.deepEqual(JSON.parse(sentMessages[0][2]), { points: [], toolpath: null })
    widget.dispose()
  } finally {
    restoreDom()
  }
})

test('startMachiningJob remains available for future Unity bridge versions', async () => {
  const sentMessages = []
  const restoreDom = installDomStubs({
    createUnityInstance: async () => ({
      Module: {},
      SendMessage: (...args) => sentMessages.push(args),
    }),
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      log: createListStub(),
      progress: { value: 0 },
      status: { textContent: '' },
    })

    await widget.startMachiningJob({ process: { radialDepth: 1 } })

    assert.equal(sentMessages.length, 1)
    assert.equal(sentMessages[0][0], 'FrontendBridge')
    assert.equal(sentMessages[0][1], 'StartMachiningJob')
    assert.deepEqual(JSON.parse(sentMessages[0][2]), { process: { radialDepth: 1 } })
    widget.dispose()
  } finally {
    restoreDom()
  }
})

test('load uses cache-busted Unity build asset URLs', async () => {
  let receivedConfig = null
  const restoreDom = installDomStubs({
    createUnityInstance: async (_canvas, config) => {
      receivedConfig = config
      return {
        Module: {},
        SendMessage: () => {},
      }
    },
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      log: createListStub(),
      progress: { value: 0 },
      status: { textContent: '' },
    })

    await widget.load()

    assert.match(receivedConfig.dataUrl, /[?&]v=/)
    assert.match(receivedConfig.frameworkUrl, /[?&]v=/)
    assert.match(receivedConfig.codeUrl, /[?&]v=/)
    widget.dispose()
  } finally {
    restoreDom()
  }
})

function installDomStubs({ createUnityInstance }) {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  const originalElement = globalThis.Element
  const windowTarget = createEventTargetStub()
  const documentTarget = createEventTargetStub()

  globalThis.Element = class ElementStub {}
  globalThis.window = {
    ...windowTarget,
    createUnityInstance,
  }
  globalThis.document = {
    ...documentTarget,
    body: {
      appendChild: () => {},
    },
    createElement: (tagName) => ({
      children: [],
      tagName,
      textContent: '',
    }),
    getElementById: () => null,
  }

  return () => {
    globalThis.window = originalWindow
    globalThis.document = originalDocument
    globalThis.Element = originalElement
  }
}

function createEventTargetStub() {
  const listeners = new Map()
  return {
    addEventListener: (type, listener) => {
      const eventType = String(type)
      const next = listeners.get(eventType) ?? []
      next.push(listener)
      listeners.set(eventType, next)
    },
    removeEventListener: (type, listener) => {
      const eventType = String(type)
      listeners.set(
        eventType,
        (listeners.get(eventType) ?? []).filter((current) => current !== listener),
      )
    },
  }
}

function createListStub() {
  const list = {
    children: [],
    lastElementChild: null,
    prepend: (item) => {
      list.children.unshift(item)
      list.lastElementChild = list.children[list.children.length - 1] ?? null
    },
  }
  return list
}
