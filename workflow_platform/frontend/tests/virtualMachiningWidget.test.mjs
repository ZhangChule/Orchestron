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

test('startMaterialRemovalPreview invalidates but does not retry a failed Unity machining command', async () => {
  const sentMessages = []
  let createCount = 0
  let quitCount = 0
  const restoreDom = installDomStubs({
    createUnityInstance: async () => {
      createCount += 1
      return {
        Module: {},
        Quit: () => {
          quitCount += 1
        },
        SendMessage: (...args) => {
          if (createCount === 1) {
            const error = new Error('RuntimeError: null function')
            error.name = 'RuntimeError'
            throw error
          }
          sentMessages.push(args)
        },
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

    await assert.rejects(
      () => widget.startMaterialRemovalPreview({ points: [{ id: 'K1' }] }),
      /null function/,
    )
    await widget.startMaterialRemovalPreview({ points: [{ id: 'K2' }] })

    assert.equal(createCount, 2)
    assert.equal(quitCount, 1)
    assert.equal(sentMessages.length, 1)
    assert.equal(sentMessages[0][0], 'FrontendBridge')
    assert.equal(sentMessages[0][1], 'StartMachiningJob')
    assert.deepEqual(JSON.parse(sentMessages[0][2]), { points: [{ id: 'K2' }] })
    widget.dispose()
  } finally {
    restoreDom()
  }
})

test('handleRuntimeError invalidates a stale Unity instance for the next command', async () => {
  const sentMessages = []
  let createCount = 0
  const restoreDom = installDomStubs({
    createUnityInstance: async () => {
      createCount += 1
      return {
        Module: {},
        SendMessage: (...args) => sentMessages.push(args),
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
    assert.equal(createCount, 1)
    assert.equal(widget.handleRuntimeError(new Error('RuntimeError: table index is out of bounds')), true)

    await widget.startMaterialRemovalPreview({ points: [] })

    assert.equal(createCount, 2)
    assert.equal(sentMessages.length, 1)
    assert.equal(sentMessages[0][1], 'StartMachiningJob')
    widget.dispose()
  } finally {
    restoreDom()
  }
})

test('handleRuntimeError quits the stale Unity runtime before the next preview command', async () => {
  let quitCount = 0
  const restoreDom = installDomStubs({
    createUnityInstance: async () => ({
      Module: {},
      Quit: () => {
        quitCount += 1
      },
      SendMessage: () => {},
    }),
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      log: createListStub(),
      progress: { value: 0 },
      status: { textContent: '' },
    })

    await widget.load()
    assert.equal(widget.handleRuntimeError(new Error('RuntimeError: table index is out of bounds')), true)

    assert.equal(quitCount, 1)
    widget.dispose()
  } finally {
    restoreDom()
  }
})

test('recoverable runtime errors expose a recovery window before the next Unity reload', async () => {
  const sentMessages = []
  let createCount = 0
  let currentTime = 1000
  const waitCalls = []
  const restoreDom = installDomStubs({
    createUnityInstance: async () => {
      createCount += 1
      return {
        Module: {},
        Quit: () => {},
        SendMessage: (...args) => sentMessages.push(args),
      }
    },
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      commandSettleMs: 0,
      log: createListStub(),
      now: () => currentTime,
      progress: { value: 0 },
      runtimeRecoveryDelayMs: 50,
      status: { textContent: '' },
      wait: (callback, delay) => {
        waitCalls.push({ callback, delay })
        return waitCalls.length
      },
    })

    await widget.load()
    assert.equal(createCount, 1)
    assert.equal(widget.handleRuntimeError(new Error('RuntimeError: table index is out of bounds')), true)
    assert.equal(widget.runtimeStatus().recovering, true)
    assert.equal(widget.runtimeStatus().safe_to_preview, false)
    assert.equal(widget.runtimeStatus().recovery_remaining_ms, 50)

    const previewPromise = widget.startMaterialRemovalPreview({ points: [] })
    for (let index = 0; index < 25 && waitCalls.length < 1; index += 1) {
      await Promise.resolve()
    }

    assert.equal(createCount, 1)
    assert.equal(waitCalls[0].delay, 50)
    currentTime = 1050
    waitCalls[0].callback()
    assert.equal(await previewPromise, true)

    assert.equal(createCount, 2)
    assert.equal(sentMessages.length, 1)
    assert.equal(sentMessages[0][1], 'StartMachiningJob')
    assert.equal(widget.runtimeStatus().safe_to_preview, true)
    widget.dispose()
  } finally {
    restoreDom()
  }
})
test('handleRuntimeError treats Unity PlayerLoop recursion as recoverable', async () => {
  const restoreDom = installDomStubs({
    createUnityInstance: async () => ({
      Module: {},
      SendMessage: () => {},
    }),
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      log: createListStub(),
      progress: { value: 0 },
      status: { textContent: '' },
    })

    assert.equal(widget.handleRuntimeError(new Error('The PlayerLoop internal function has been called recursively.')), true)
    widget.dispose()
  } finally {
    restoreDom()
  }
})

test('handleRuntimeError treats Unity function signature mismatch as recoverable', async () => {
  const restoreDom = installDomStubs({
    createUnityInstance: async () => ({
      Module: {},
      SendMessage: () => {},
    }),
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      log: createListStub(),
      progress: { value: 0 },
      status: { textContent: '' },
    })

    assert.equal(widget.handleRuntimeError(new Error('RuntimeError: function signature mismatch')), true)
    assert.equal(widget.runtimeStatus().recovering, true)
    assert.match(widget.runtimeStatus().last_runtime_warning, /function signature mismatch/)
    widget.dispose()
  } finally {
    restoreDom()
  }
})

test('repeated recoverable Unity runtime warnings mark the runtime unstable', async () => {
  const status = { textContent: '' }
  const restoreDom = installDomStubs({
    createUnityInstance: async () => ({
      Module: {},
      Quit: () => {},
      SendMessage: () => {},
    }),
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      log: createListStub(),
      progress: { value: 0 },
      runtimeRecoveryDelayMs: 1800,
      status,
    })

    await widget.load()
    assert.equal(widget.handleRuntimeError(new Error('RuntimeError: table index is out of bounds')), true)
    assert.equal(widget.runtimeStatus().runtime_unstable, false)
    assert.equal(widget.handleRuntimeError(new Error('RuntimeError: function signature mismatch')), true)

    assert.equal(widget.runtimeStatus().runtime_unstable, true)
    assert.equal(widget.runtimeStatus().safe_to_preview, false)
    assert.equal(widget.runtimeStatus().block_reason, 'repeated_runtime_warning')
    assert.equal(status.textContent, 'Unity Preview Status: Runtime unstable; reset Unity before next preview')
    widget.dispose()
  } finally {
    restoreDom()
  }
})

test('runtime recovery exposes concise preview status messages', async () => {
  let createCount = 0
  let currentTime = 1000
  let observedReloadingStatus = false
  const waitCalls = []
  const status = { textContent: '' }
  const restoreDom = installDomStubs({
    createUnityInstance: async () => {
      createCount += 1
      observedReloadingStatus = observedReloadingStatus || status.textContent === 'Unity Preview Status: Reloading Unity runtime'
      return {
        Module: {},
        Quit: () => {},
        SendMessage: () => {},
      }
    },
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      commandSettleMs: 0,
      log: createListStub(),
      now: () => currentTime,
      progress: { value: 0 },
      runtimeRecoveryDelayMs: 1800,
      status,
      wait: (callback, delay) => {
        waitCalls.push({ callback, delay })
        return waitCalls.length
      },
    })

    await widget.load()
    assert.equal(createCount, 1)
    assert.equal(status.textContent, 'Unity Preview Status: Ready for next preview')

    assert.equal(widget.handleRuntimeError(new Error('RuntimeError: table index is out of bounds')), true)
    assert.equal(status.textContent, 'Unity Preview Status: Recovering Unity runtime: wait 1.8s')

    const loadPromise = widget.load()
    for (let index = 0; index < 25 && waitCalls.length < 1; index += 1) {
      await Promise.resolve()
    }
    assert.equal(waitCalls[0].delay, 1800)
    currentTime = 2800
    waitCalls[0].callback()
    await loadPromise

    assert.equal(createCount, 2)
    assert.equal(observedReloadingStatus, true)
    assert.equal(status.textContent, 'Unity Preview Status: Ready for next preview')
    widget.dispose()
  } finally {
    restoreDom()
  }
})
test('Unity commands wait for a short settle window after SendMessage', async () => {
  const sentMessages = []
  let settleDelay = null
  let settleCallback = null
  const restoreDom = installDomStubs({
    createUnityInstance: async () => ({
      Module: {},
      SendMessage: (...args) => sentMessages.push(args),
    }),
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      commandSettleMs: 25,
      log: createListStub(),
      progress: { value: 0 },
      status: { textContent: '' },
      wait: (callback, delay) => {
        settleDelay = delay
        settleCallback = callback
        return 1
      },
    })

    let resolved = false
    const previewPromise = widget.startMaterialRemovalPreview({ points: [] }).then((result) => {
      resolved = true
      return result
    })
    for (let index = 0; index < 25 && settleCallback == null; index += 1) {
      await Promise.resolve()
    }

    assert.equal(sentMessages.length, 1)
    assert.equal(settleDelay, 25)
    assert.equal(resolved, false)

    settleCallback()
    assert.equal(await previewPromise, true)
    assert.equal(resolved, true)
    widget.dispose()
  } finally {
    restoreDom()
  }
})
test('importTriDexelImage waits for Unity import settling after sending base64', async () => {
  const sentMessages = []
  let settleDelay = null
  let settleCallback = null
  const restoreDom = installDomStubs({
    createUnityInstance: async () => ({
      Module: {},
      SendMessage: (...args) => sentMessages.push(args),
    }),
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      commandSettleMs: 0,
      log: createListStub(),
      progress: { value: 0 },
      status: { textContent: '' },
      triDexelImportSettleMs: 25,
      wait: (callback, delay) => {
        settleDelay = delay
        settleCallback = callback
        return 1
      },
    })

    let resolved = false
    const importPromise = widget.importTriDexelImage('base64-tridexel').then((result) => {
      resolved = true
      return result
    })
    for (let index = 0; index < 25 && settleCallback == null; index += 1) {
      await Promise.resolve()
    }

    assert.equal(sentMessages.length, 1)
    assert.deepEqual(sentMessages[0], ['FrontendBridge', 'ImportTriDexelImage', 'base64-tridexel'])
    assert.equal(settleDelay, 25)
    assert.equal(typeof settleCallback, 'function')
    assert.equal(resolved, false)

    settleCallback()
    assert.equal(await importPromise, true)
    assert.equal(resolved, true)
    widget.dispose()
  } finally {
    restoreDom()
  }
})

test('Unity commands are serialized so a later command waits for the previous settle window', async () => {
  const sentMessages = []
  const settleCallbacks = []
  const restoreDom = installDomStubs({
    createUnityInstance: async () => ({
      Module: {},
      SendMessage: (...args) => sentMessages.push(args),
    }),
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      commandSettleMs: 25,
      log: createListStub(),
      progress: { value: 0 },
      status: { textContent: '' },
      wait: (callback) => {
        settleCallbacks.push(callback)
        return settleCallbacks.length
      },
    })

    await widget.load()
    const first = widget.showWallErrorField({ points: [{ error: 0.01 }] })
    const second = widget.startMaterialRemovalPreview({ points: [{ error: 0.02 }] })
    for (let index = 0; index < 25 && settleCallbacks.length < 1; index += 1) {
      await Promise.resolve()
    }

    assert.equal(sentMessages.length, 1)
    assert.equal(sentMessages[0][1], 'ShowWallErrorField')

    settleCallbacks[0]()
    for (let index = 0; index < 25 && sentMessages.length < 2; index += 1) {
      await Promise.resolve()
    }

    assert.equal(sentMessages.length, 2)
    assert.equal(sentMessages[1][1], 'StartMachiningJob')
    settleCallbacks[1]()
    assert.equal(await first, true)
    assert.equal(await second, true)
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
test('reloadRuntime quits the current Unity instance and clears runtime warnings', async () => {
  let createCount = 0
  let quitCount = 0
  const status = { textContent: '' }
  const restoreDom = installDomStubs({
    createUnityInstance: async () => {
      createCount += 1
      return {
        Module: {},
        Quit: () => {
          quitCount += 1
        },
        SendMessage: () => {},
      }
    },
  })

  try {
    const widget = createVirtualMachiningWidget({
      canvas: {},
      commandSettleMs: 0,
      log: createListStub(),
      progress: { value: 0 },
      runtimeRecoveryDelayMs: 50,
      status,
    })

    await widget.load()
    assert.equal(createCount, 1)
    assert.equal(widget.handleRuntimeError(new Error('RuntimeError: table index is out of bounds')), true)
    assert.equal(widget.runtimeStatus().safe_to_preview, false)

    await widget.reloadRuntime()

    assert.equal(quitCount, 1)
    assert.equal(createCount, 2)
    assert.equal(widget.runtimeStatus().last_runtime_warning, null)
    assert.equal(widget.runtimeStatus().safe_to_preview, true)
    assert.equal(status.textContent, 'Unity Preview Status: Ready for next preview')
    widget.dispose()
  } finally {
    restoreDom()
  }
})


