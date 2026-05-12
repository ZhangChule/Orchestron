const UNITY_BASE_URL = './virtual-machining/UnityBuild'
const UNITY_BUILD_URL = `${UNITY_BASE_URL}/Build`
const UNITY_LOADER_URL = `${UNITY_BUILD_URL}/UnityBuild.loader.js`
const UNITY_LOADER_SCRIPT_ID = 'orchestron-unity-loader'
const UNITY_BRIDGE_OBJECT = 'FrontendBridge'
const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable='true'], [contenteditable='']"
const KEYBOARD_EVENTS = new Set(['keydown', 'keypress', 'keyup'])

const UNITY_METHODS = {
  applyCompensationPlan: 'ApplyCompensationPlan',
  applyCoordinateTransform: 'ApplyCoordinateTransform',
  loadScene: 'LoadWorkpieceAndTool',
  previewCompensation: 'StartMaterialRemovalPreview',
  resetScene: 'ResetToInitialScene',
  showWallErrorField: 'ShowWallErrorField',
}

export function createVirtualMachiningWidget({ canvas, status, progress, log }) {
  const state = {
    instance: null,
    loading: false,
    ready: false,
    objectUrls: [],
    restoreKeyboardGuard: null,
  }

  async function load() {
    if (state.ready) return state.instance
    if (state.loading) return null
    if (!canvas) throw new Error('Unity canvas is not mounted.')

    state.loading = true
    state.restoreKeyboardGuard = state.restoreKeyboardGuard ?? installUnityKeyboardGuard()
    writeStatus('Loading Unity WebGL...')
    writeProgress(0)

    try {
      await ensureUnityLoader()
      if (!window.createUnityInstance) throw new Error('Unity loader is not initialized.')

      releaseUnityKeyboardCapture(null, canvas)
      const config = await prepareUnityConfig({
        dataUrl: `${UNITY_BUILD_URL}/UnityBuild.data.gz`,
        frameworkUrl: `${UNITY_BUILD_URL}/UnityBuild.framework.js.gz`,
        codeUrl: `${UNITY_BUILD_URL}/UnityBuild.wasm.gz`,
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
      writeStatus('Unity ready')
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
    if (payload == null) {
      state.instance.SendMessage(UNITY_BRIDGE_OBJECT, methodName)
    } else {
      state.instance.SendMessage(UNITY_BRIDGE_OBJECT, methodName, JSON.stringify(payload))
    }
    writeLog(`SendMessage ${UNITY_BRIDGE_OBJECT}.${methodName}`)
    return true
  }

  async function sendWorkflowResult(workflowBody) {
    await load()
    const result = workflowBody?.result ?? workflowBody
    const compensationPlan = result?.compensation_plan ?? result?.compensationPlan
    const materialRemovalPreview = result?.material_removal_preview ?? result?.materialRemovalPreview ?? result?.preview_payload
    const transform = result?.transform ?? result?.pose?.transform
    const wallErrorPoints = result?.points ?? result?.wallErrorPoints

    if (compensationPlan) {
      return send(UNITY_METHODS.previewCompensation, {
        source: 'workflow_platform',
        type: 'machining_compensation_plan_preview',
        compensation_plan: compensationPlan,
        suggestion_value: result.suggestion_value,
        average_error: result.average_error,
        point_count: result.point_count,
      })
    }

    if (materialRemovalPreview) {
      return send(UNITY_METHODS.previewCompensation, materialRemovalPreview)
    }

    if (Array.isArray(wallErrorPoints)) {
      return send(UNITY_METHODS.showWallErrorField, {
        source: 'workflow_platform',
        type: 'wall_error_field',
        points: wallErrorPoints,
        summary: result.summary ?? null,
      })
    }

    if (transform) {
      return send(UNITY_METHODS.applyCoordinateTransform, {
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
  }

  return {
    dispose,
    load,
    resetScene: async () => {
      await load()
      return send(UNITY_METHODS.resetScene)
    },
    loadScene: async (payload = null) => {
      await load()
      window.workflowVirtualMachiningScenePayload = payload
      return send(UNITY_METHODS.loadScene)
    },
    previewWallError: async (payload) => {
      await load()
      return send(UNITY_METHODS.showWallErrorField, payload)
    },
    startMaterialRemovalPreview: async (payload) => {
      await load()
      return send(UNITY_METHODS.previewCompensation, payload)
    },
    showWallErrorField: async (payload) => {
      await load()
      return send(UNITY_METHODS.showWallErrorField, payload)
    },
    sendWorkflowResult,
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
