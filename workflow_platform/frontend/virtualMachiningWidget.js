const UNITY_BASE_URL = './virtual-machining/UnityBuild'
const UNITY_BUILD_URL = `${UNITY_BASE_URL}/Build`
const UNITY_BUILD_CACHE_VERSION = 'workflow-unity-interface-integration-v1'
const UNITY_LOADER_URL = versionedUnityAssetUrl(`${UNITY_BUILD_URL}/UnityBuild.loader.js`)
const UNITY_LOADER_SCRIPT_ID = 'orchestron-unity-loader'
const UNITY_BRIDGE_OBJECT = 'FrontendBridge'
const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable='true'], [contenteditable='']"
const KEYBOARD_EVENTS = new Set(['keydown', 'keypress', 'keyup'])
const UNITY_PREVIEW_STATUS_PREFIX = 'Unity Preview Status:'

const UNITY_METHODS = {
  applyCompensationPlan: 'ApplyCompensationPlan',
  applyCoordinateTransform: 'ApplyCoordinateTransform',
  exportTriDexelImage: 'ExportTriDexelImage',
  importTriDexelImage: 'ImportTriDexelImage',
  loadScene: 'LoadWorkpieceAndTool',
  previewCompensation: 'StartMaterialRemovalPreview',
  resetScene: 'ResetToInitialScene',
  showWallErrorField: 'ShowWallErrorField',
  startMachiningJob: 'StartMachiningJob',
  setWorkpieceTransformMatrix: 'SetWorkpieceTransformMatrix',
}

export function createVirtualMachiningWidget({
  canvas,
  status,
  progress,
  log,
  triDexelImportSettleMs = 750,
  commandSettleMs = 80,
  runtimeRecoveryDelayMs = 1800,
  maxRecoverableRuntimeWarnings = 2,
  wait = setTimeout,
  now = () => Date.now(),
}) {
  const state = {
    instance: null,
    loading: false,
    lastMachiningResult: null,
    lastRuntimeWarning: null,
    ready: false,
    recoveringUntil: 0,
    runtimeWarningCount: 0,
    objectUrls: [],
    restoreKeyboardGuard: null,
  }
  let commandQueue = Promise.resolve()
  const removeMachiningCompletedListener = installMachiningCompletedListener()

  async function load() {
    if (state.ready) return state.instance
    if (state.loading) return null
    if (!canvas) throw new Error('Unity canvas is not mounted.')
    await waitForUnityRuntimeRecovery()

    state.loading = true
    const reloadingAfterWarning = Boolean(state.lastRuntimeWarning)
    state.restoreKeyboardGuard = state.restoreKeyboardGuard ?? installUnityKeyboardGuard()
    writeStatus(reloadingAfterWarning ? previewStatusMessage('Reloading Unity runtime') : 'Loading Unity WebGL...')
    writeProgress(0)

    try {
      await ensureUnityLoader()
      if (!window.createUnityInstance) throw new Error('Unity loader is not initialized.')

      releaseUnityKeyboardCapture(null, canvas)
      const config = await prepareUnityConfig({
        dataUrl: versionedUnityAssetUrl(`${UNITY_BUILD_URL}/UnityBuild.data.gz`),
        frameworkUrl: versionedUnityAssetUrl(`${UNITY_BUILD_URL}/UnityBuild.framework.js.gz`),
        codeUrl: versionedUnityAssetUrl(`${UNITY_BUILD_URL}/UnityBuild.wasm.gz`),
        streamingAssetsUrl: `${UNITY_BASE_URL}/StreamingAssets`,
        companyName: 'DefaultCompany',
        productName: 'CutSim',
        productVersion: '0.1',
        captureAllKeyboardInput: false,
        keyboardListeningElement: canvas,
        showBanner: (message, type) => {
          const text = `${type || 'info'}: ${message}`
          if (type === 'error') writeStatus(text)
          writeLog(text)
        },
      })

      state.instance = await window.createUnityInstance(canvas, config, (nextProgress) => {
        writeProgress(nextProgress)
        writeStatus(`Loading Unity ${(nextProgress * 100).toFixed(0)}%`)
      })
      releaseUnityKeyboardCapture(state.instance, canvas)
      state.ready = true
      writeProgress(1)
      writeStatus(previewStatusMessage('Ready for next preview'))
      writeLog('Unity WebGL runtime is ready.')
      return state.instance
    } catch (error) {
      writeStatus(error instanceof Error ? error.message : 'Unity load failed.')
      throw error
    } finally {
      state.loading = false
    }
  }

  function send(methodName, payload = null) {
    if (!state.instance?.SendMessage) {
      writeLog(`Unity is not ready; command ${methodName} was not sent.`)
      return false
    }
    try {
      if (payload == null) {
        state.instance.SendMessage(UNITY_BRIDGE_OBJECT, methodName)
      } else {
        state.instance.SendMessage(UNITY_BRIDGE_OBJECT, methodName, JSON.stringify(payload))
      }
    } catch (error) {
      if (isRecoverableUnityRuntimeError(error)) invalidateUnityInstance(error)
      throw error
    }
    writeLog(`SendMessage ${UNITY_BRIDGE_OBJECT}.${methodName}`)
    return true
  }

  function sendRawString(methodName, value = '') {
    if (!state.instance?.SendMessage) {
      writeLog(`Unity is not ready; command ${methodName} was not sent.`)
      return false
    }
    try {
      state.instance.SendMessage(UNITY_BRIDGE_OBJECT, methodName, String(value ?? ''))
    } catch (error) {
      if (isRecoverableUnityRuntimeError(error)) invalidateUnityInstance(error)
      throw error
    }
    writeLog(`SendMessage ${UNITY_BRIDGE_OBJECT}.${methodName}`)
    return true
  }

  function enqueueUnityCommand(task) {
    const run = commandQueue.catch(() => {}).then(task)
    commandQueue = run.catch(() => {})
    return run
  }

  async function sendWithRecovery(methodName, payload = null, options = {}) {
    return enqueueUnityCommand(async () => {
      await load()
      const sendCommand = () => options.rawString
        ? sendRawString(methodName, payload)
        : send(methodName, payload)
      try {
        const sent = sendCommand()
        if (sent) await waitForUnityCommandSettle(options.commandSettleMs)
        return sent
      } catch (error) {
        if (!isRecoverableUnityRuntimeError(error)) throw error
        writeLog(`${UNITY_BRIDGE_OBJECT}.${methodName} failed after Unity runtime warning; the full preview must be restarted.`)
        throw error
      }
    })
  }

  function invalidateUnityInstance(error) {
    const message = error instanceof Error ? error.message : String(error ?? 'unknown runtime error')
    const staleInstance = state.instance
    state.instance = null
    state.ready = false
    state.loading = false
    state.lastRuntimeWarning = message
    state.runtimeWarningCount += 1
    state.recoveringUntil = Math.max(state.recoveringUntil, now() + normalizedRuntimeRecoveryDelay())
    if (staleInstance?.Quit) {
      try {
        void Promise.resolve(staleInstance.Quit()).catch((quitError) => {
          writeLog(`Unity runtime Quit failed: ${quitError instanceof Error ? quitError.message : String(quitError)}`)
        })
      } catch (quitError) {
        writeLog(`Unity runtime Quit failed: ${quitError instanceof Error ? quitError.message : String(quitError)}`)
      }
    }
    writeStatus(runtimeStatus().runtime_unstable
      ? previewStatusMessage('Runtime unstable; reset Unity before next preview')
      : previewStatusMessage('Recovering Unity runtime: wait ' + formatRecoverySeconds(runtimeStatus().recovery_remaining_ms)))
    writeLog(`Unity runtime became unavailable: ${message}`)
  }

  async function sendWorkflowResult(workflowBody) {
    await load()
    const result = workflowBody?.result ?? workflowBody
    const compensationPlan = result?.compensation_plan ?? result?.compensationPlan
    const materialRemovalPreview = result?.material_removal_preview ?? result?.materialRemovalPreview ?? result?.preview_payload
    const transform = result?.transform ?? result?.pose?.transform
    const wallErrorPoints = result?.points ?? result?.wallErrorPoints

    if (compensationPlan) {
      return sendWithRecovery(UNITY_METHODS.previewCompensation, {
        source: 'workflow_platform',
        type: 'machining_compensation_plan_preview',
        compensation_plan: compensationPlan,
        suggestion_value: result.suggestion_value,
        average_error: result.average_error,
        point_count: result.point_count,
      })
    }

    if (materialRemovalPreview) {
      return sendWithRecovery(UNITY_METHODS.previewCompensation, materialRemovalPreview)
    }

    if (Array.isArray(wallErrorPoints)) {
      return sendWithRecovery(UNITY_METHODS.showWallErrorField, {
        source: 'workflow_platform',
        type: 'wall_error_field',
        points: wallErrorPoints,
        summary: result.summary ?? null,
      })
    }

    if (transform) {
      return sendWithRecovery(UNITY_METHODS.applyCoordinateTransform, {
        source: 'workflow_platform',
        type: 'coordinate_transform',
        transform,
        pose: result.pose ?? null,
      })
    }

    writeLog('Current workflow result has no virtual-machining contract payload.')
    return false
  }

  function dispose() {
    const instance = state.instance
    state.instance = null
    state.ready = false
    if (instance?.Quit) void instance.Quit()
    state.objectUrls.forEach((url) => URL.revokeObjectURL(url))
    state.objectUrls = []
    state.restoreKeyboardGuard?.()
    state.restoreKeyboardGuard = null
    removeMachiningCompletedListener()
  }

  return {
    dispose,
    load,
    reloadRuntime: async () => {
      return enqueueUnityCommand(async () => {
        const instance = state.instance
        state.instance = null
        state.ready = false
        state.loading = false
        state.lastMachiningResult = null
        state.lastRuntimeWarning = null
        state.runtimeWarningCount = 0
        state.recoveringUntil = 0
        if (instance?.Quit) {
          try {
            await Promise.resolve(instance.Quit())
          } catch (quitError) {
            writeLog(`Unity runtime Quit failed: ${quitError instanceof Error ? quitError.message : String(quitError)}`)
          }
        }
        writeStatus(previewStatusMessage('Reloading Unity runtime'))
        const loaded = await load()
        state.lastRuntimeWarning = null
        state.runtimeWarningCount = 0
        state.recoveringUntil = 0
        writeStatus(previewStatusMessage('Ready for next preview'))
        return Boolean(loaded)
      })
    },
    resetScene: async () => {
      return sendWithRecovery(UNITY_METHODS.resetScene)
    },
    clearRuntimeWarnings: () => {
      state.runtimeWarningCount = 0
      state.lastRuntimeWarning = null
      state.recoveringUntil = 0
      writeStatus(previewStatusMessage('Ready for next preview'))
    },
    loadScene: async (payload = null) => {
      window.workflowVirtualMachiningScenePayload = payload
      return sendWithRecovery(UNITY_METHODS.loadScene)
    },
    previewWallError: async (payload) => {
      return sendWithRecovery(UNITY_METHODS.showWallErrorField, payload)
    },
    startMachiningJob: async (payload) => {
      return sendWithRecovery(UNITY_METHODS.startMachiningJob, payload)
    },
    startMaterialRemovalPreview: async (payload) => {
      return sendWithRecovery(UNITY_METHODS.startMachiningJob, payload)
    },
    showWallErrorField: async (payload) => {
      return sendWithRecovery(UNITY_METHODS.showWallErrorField, payload)
    },
    exportTriDexelImage: async () => {
      return sendWithRecovery(UNITY_METHODS.exportTriDexelImage)
    },
    handleRuntimeError: (error) => {
      if (!isRecoverableUnityRuntimeError(error)) return false
      invalidateUnityInstance(error)
      return true
    },
    runtimeStatus: () => runtimeStatus(),
    importTriDexelImage: async (base64) => {
      const sent = await sendWithRecovery(UNITY_METHODS.importTriDexelImage, base64, { rawString: true })
      if (sent) await waitForTriDexelImportSettle()
      return sent
    },
    setWorkpieceTransformMatrix: async (payload) => {
      return sendWithRecovery(UNITY_METHODS.setWorkpieceTransformMatrix, payload)
    },
    sendWorkflowResult,
  }

  function installMachiningCompletedListener() {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return () => {}
    const handler = (event) => {
      const detail = event?.detail ?? {}
      state.lastMachiningResult = {
        command: detail.command ?? null,
        triDexelImageBase64: detail.triDexelImageBase64 ?? null,
      }
      if (state.lastMachiningResult.triDexelImageBase64) {
        writeLog('Unity machining completed with tri-dexel image.')
      } else {
        writeLog('Unity machining completed.')
      }
    }
    const eventNames = ['UnityMachiningCompleted', 'UnityMaterialRemovalPreviewCompleted']
    eventNames.forEach((eventName) => window.addEventListener(eventName, handler))
    return () => eventNames.forEach((eventName) => window.removeEventListener(eventName, handler))
  }

  async function prepareUnityConfig(config) {
    if (!supportsGzipAssetFallback()) return config
    const urls = await Promise.all([
      prepareMaybeCompressedAsset(config.dataUrl, 'application/octet-stream'),
      prepareMaybeCompressedAsset(config.frameworkUrl, 'application/javascript'),
      prepareMaybeCompressedAsset(config.codeUrl, 'application/wasm'),
    ])
    return {
      ...config,
      dataUrl: urls[0],
      frameworkUrl: urls[1],
      codeUrl: urls[2],
    }
  }

  async function prepareMaybeCompressedAsset(url, mimeType) {
    try {
      const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })
      if (response.headers.get('Content-Encoding') === 'gzip') return url
    } catch (error) {
      return url
    }

    try {
      writeLog(`Preparing gzip fallback for ${url}`)
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok || !response.body) return url
      const stream = response.body.pipeThrough(new DecompressionStream('gzip'))
      const blob = await new Response(stream).blob()
      const objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }))
      state.objectUrls.push(objectUrl)
      return objectUrl
    } catch (error) {
      writeLog(`Gzip fallback skipped for ${url}: ${error instanceof Error ? error.message : 'unknown error'}`)
      return url
    }
  }

  function supportsGzipAssetFallback() {
    return typeof DecompressionStream === 'function' && typeof URL?.createObjectURL === 'function'
  }

  function waitForTriDexelImportSettle() {
    const delay = Number(triDexelImportSettleMs)
    if (!Number.isFinite(delay) || delay <= 0) return Promise.resolve()
    return new Promise((resolve) => wait(resolve, delay))
  }

  function waitForUnityCommandSettle(overrideDelay) {
    const delay = Number(overrideDelay ?? commandSettleMs)
    if (!Number.isFinite(delay) || delay <= 0) return Promise.resolve()
    return new Promise((resolve) => wait(resolve, delay))
  }

  function normalizedRuntimeRecoveryDelay() {
    const delay = Number(runtimeRecoveryDelayMs)
    return Number.isFinite(delay) && delay > 0 ? delay : 0
  }

  function normalizedMaxRecoverableRuntimeWarnings() {
    const limit = Number(maxRecoverableRuntimeWarnings)
    return Number.isFinite(limit) && limit > 0 ? limit : 0
  }

  function runtimeStatus() {
    const recoveryRemainingMs = Math.max(0, state.recoveringUntil - now())
    const warningLimit = normalizedMaxRecoverableRuntimeWarnings()
    const runtimeUnstable = warningLimit > 0 && state.runtimeWarningCount >= warningLimit
    return {
      ready: state.ready,
      loading: state.loading,
      recovering: recoveryRemainingMs > 0,
      runtime_unstable: runtimeUnstable,
      safe_to_preview: !runtimeUnstable && !state.loading && recoveryRemainingMs <= 0,
      recovery_remaining_ms: recoveryRemainingMs,
      recovering_until: state.recoveringUntil || null,
      runtime_warning_count: state.runtimeWarningCount,
      runtime_warning_limit: warningLimit,
      block_reason: runtimeUnstable ? 'repeated_runtime_warning' : null,
      last_runtime_warning: state.lastRuntimeWarning,
    }
  }

  function waitForUnityRuntimeRecovery() {
    const recoveryRemainingMs = Math.max(0, state.recoveringUntil - now())
    if (recoveryRemainingMs <= 0) return Promise.resolve()
    writeStatus(previewStatusMessage('Recovering Unity runtime: wait ' + formatRecoverySeconds(recoveryRemainingMs)))
    writeLog(`Waiting ${recoveryRemainingMs}ms before reloading Unity runtime.`)
    return new Promise((resolve) => wait(resolve, recoveryRemainingMs))
  }

  function previewStatusMessage(message) {
    return UNITY_PREVIEW_STATUS_PREFIX + ' ' + message
  }

  function formatRecoverySeconds(milliseconds) {
    const seconds = Math.max(0.1, Number(milliseconds) / 1000)
    return seconds.toFixed(1).replace(/\.0$/, '') + 's'
  }

  function writeStatus(message) {
    if (status) status.textContent = message
  }

  function writeProgress(value) {
    if (progress) progress.value = Math.max(0, Math.min(1, Number(value) || 0))
  }

  function writeLog(message) {
    if (!log) return
    const line = document.createElement('li')
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`
    log.prepend(line)
    while (log.children.length > 8) log.lastElementChild?.remove()
  }
}

function isRecoverableUnityRuntimeError(error) {
  const message = String(error?.message ?? error ?? '')
  return /null function|function signature mismatch|table index is out of bounds|memory access out of bounds|playerloop internal function has been called recursively|called recursively/i.test(message)
}

function versionedUnityAssetUrl(url) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${encodeURIComponent(UNITY_BUILD_CACHE_VERSION)}`
}

function ensureUnityLoader() {
  if (window.createUnityInstance) return Promise.resolve()

  const existing = document.getElementById(UNITY_LOADER_SCRIPT_ID)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', () => reject(new Error('Unity loader failed.')), { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = UNITY_LOADER_SCRIPT_ID
    script.src = UNITY_LOADER_URL
    script.async = true
    script.addEventListener('load', resolve, { once: true })
    script.addEventListener('error', () => reject(new Error('Unity loader failed.')), { once: true })
    document.body.appendChild(script)
  })
}

function isEditableKeyboardTarget(target) {
  return target instanceof Element && target.closest(EDITABLE_SELECTOR) != null
}

function installUnityKeyboardGuard() {
  const targets = [window, document]
  const restoreCallbacks = []

  targets.forEach((target) => {
    const addEventListener = target.addEventListener.bind(target)
    const removeEventListener = target.removeEventListener.bind(target)
    const wrappedListeners = new WeakMap()

    function getWrappedListener(listener) {
      const existing = wrappedListeners.get(listener)
      if (existing) return existing
      const wrapped = function wrappedUnityKeyboardListener(event) {
        if (isEditableKeyboardTarget(event.target)) return
        if (typeof listener === 'function') {
          listener.call(this, event)
          return
        }
        listener.handleEvent(event)
      }
      wrappedListeners.set(listener, wrapped)
      return wrapped
    }

    target.addEventListener = (type, listener, options) => {
      if (listener && KEYBOARD_EVENTS.has(String(type))) {
        addEventListener(type, getWrappedListener(listener), options)
        return
      }
      addEventListener(type, listener, options)
    }

    target.removeEventListener = (type, listener, options) => {
      if (listener && KEYBOARD_EVENTS.has(String(type))) {
        removeEventListener(type, wrappedListeners.get(listener) ?? listener, options)
        return
      }
      removeEventListener(type, listener, options)
    }

    restoreCallbacks.push(() => {
      target.addEventListener = addEventListener
      target.removeEventListener = removeEventListener
    })
  })

  return () => restoreCallbacks.forEach((restore) => restore())
}

function releaseUnityKeyboardCapture(instance, keyboardTarget) {
  if (window.WebGLInput) window.WebGLInput.captureAllKeyboardInput = false
  if (instance?.Module) {
    instance.Module.captureAllKeyboardInput = false
    instance.Module.keyboardListeningElement = keyboardTarget ?? null
  }
}

