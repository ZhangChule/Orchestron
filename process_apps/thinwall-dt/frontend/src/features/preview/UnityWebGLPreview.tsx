import { useEffect, useRef, useState } from "react";

import { Box, Button, LinearProgress, Typography } from "@mui/material";

import { TEXT, TEXT_SECONDARY } from "../../app/constants";
import type { UnityCommand } from "../../app/types";
import { useMachiningStore } from "../../store/machiningStore";

// #region Unity loader types
type UnityInstance = {
  Module?: {
    captureAllKeyboardInput?: boolean;
    keyboardListeningElement?: EventTarget | null;
  };
  SetFullscreen: (fullscreen: 0 | 1) => void;
  Quit: () => Promise<void>;
  SendMessage?: (gameObject: string, methodName: string, value?: string | number) => void;
};

type UnityConfig = {
  dataUrl: string;
  frameworkUrl: string;
  codeUrl: string;
  streamingAssetsUrl: string;
  companyName: string;
  productName: string;
  productVersion: string;
  showBanner: (message: string, type: "error" | "warning" | string) => void;
  captureAllKeyboardInput?: boolean;
  keyboardListeningElement?: EventTarget | null;
};

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: UnityConfig,
      onProgress: (progress: number) => void,
    ) => Promise<UnityInstance>;
    WebGLInput?: {
      captureAllKeyboardInput: boolean;
    };
  }
}
// #endregion

// #region Unity bridge constants
const UNITY_BASE_URL = "/UnityBuild";
const UNITY_BUILD_URL = `${UNITY_BASE_URL}/Build`;
const UNITY_LOADER_URL = `${UNITY_BUILD_URL}/UnityBuild.loader.js`;
const UNITY_LOADER_SCRIPT_ID = "thinwall-unity-loader";
const UNITY_BRIDGE_OBJECT = "FrontendBridge";
const UNITY_COMMAND_METHODS: Record<UnityCommand["type"], string> = {
  LOAD_WORKPIECE_AND_TOOL: "LoadWorkpieceAndTool",
  START_MATERIAL_REMOVAL_PREVIEW: "StartMaterialRemovalPreview",
  RESET_TO_INITIAL_SCENE: "ResetToInitialScene",
};
const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable='true'], [contenteditable='']";
const KEYBOARD_EVENTS = new Set(["keydown", "keypress", "keyup"]);
// #endregion

// #region Keyboard ownership guard
function isEditableKeyboardTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest(EDITABLE_SELECTOR) != null;
}

function installUnityKeyboardGuard() {
  // Unity WebGL 默认会监听全局键盘事件；这里跳过输入框事件，避免表单无法键盘输入。
  const targets = [window, document] as const;
  const wrappedListeners = new WeakMap<EventListenerOrEventListenerObject, EventListener>();
  const restoreCallbacks: Array<() => void> = [];

  targets.forEach((target) => {
    const eventTarget = target as EventTarget;
    const addEventListener = eventTarget.addEventListener.bind(eventTarget);
    const removeEventListener = eventTarget.removeEventListener.bind(eventTarget);

    function getWrappedListener(listener: EventListenerOrEventListenerObject) {
      const existing = wrappedListeners.get(listener);
      if (existing) return existing;

      const wrappedListener: EventListener = function wrappedUnityKeyboardListener(this: EventTarget, event) {
        if (isEditableKeyboardTarget(event.target)) return;
        if (typeof listener === "function") {
          listener.call(this, event);
          return;
        }
        listener.handleEvent(event);
      };

      wrappedListeners.set(listener, wrappedListener);
      return wrappedListener;
    }

    eventTarget.addEventListener = ((type, listener, options) => {
      const eventType = String(type);
      if (listener && KEYBOARD_EVENTS.has(eventType)) {
        addEventListener(type, getWrappedListener(listener), options);
        return;
      }
      addEventListener(type, listener, options);
    }) as EventTarget["addEventListener"];

    eventTarget.removeEventListener = ((type, listener, options) => {
      const eventType = String(type);
      if (listener && KEYBOARD_EVENTS.has(eventType)) {
        removeEventListener(type, wrappedListeners.get(listener) ?? listener, options);
        return;
      }
      removeEventListener(type, listener, options);
    }) as EventTarget["removeEventListener"];

    restoreCallbacks.push(() => {
      eventTarget.addEventListener = addEventListener as EventTarget["addEventListener"];
      eventTarget.removeEventListener = removeEventListener as EventTarget["removeEventListener"];
    });
  });

  return () => restoreCallbacks.forEach((restore) => restore());
}

function releaseUnityKeyboardCapture(instance?: UnityInstance | null, keyboardTarget?: EventTarget | null) {
  if (window.WebGLInput) {
    window.WebGLInput.captureAllKeyboardInput = false;
  }
  if (instance?.Module) {
    instance.Module.captureAllKeyboardInput = false;
    instance.Module.keyboardListeningElement = keyboardTarget ?? null;
  }
}
// #endregion

// #region Command bridge
function sendUnityCommand(instance: UnityInstance, command: UnityCommand) {
  const methodName = UNITY_COMMAND_METHODS[command.type];
  if (!instance.SendMessage) {
    throw new Error("当前 Unity 实例不支持 SendMessage。");
  }
  if (command.payload == null) {
    instance.SendMessage(UNITY_BRIDGE_OBJECT, methodName);
    return;
  }
  instance.SendMessage(UNITY_BRIDGE_OBJECT, methodName, JSON.stringify(command.payload));
}
// #endregion

export function UnityWebGLPreview() {
  // #region Store bindings and refs
  const unityCommand = useMachiningStore((state) => state.unityCommand);
  const setFeedback = useMachiningStore((state) => state.setFeedback);
  const markMaterialRemovalPreviewCompleted = useMachiningStore((state) => state.markMaterialRemovalPreviewCompleted);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<UnityInstance | null>(null);
  const lastSentCommandIdRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // #endregion

  // #region Unity lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const canvasElement = canvas;
    const removeUnityKeyboardGuard = installUnityKeyboardGuard();

    let cancelled = false;

    const config: UnityConfig = {
      dataUrl: `${UNITY_BUILD_URL}/UnityBuild.data.gz`,
      frameworkUrl: `${UNITY_BUILD_URL}/UnityBuild.framework.js.gz`,
      codeUrl: `${UNITY_BUILD_URL}/UnityBuild.wasm.gz`,
      streamingAssetsUrl: `${UNITY_BASE_URL}/StreamingAssets`,
      companyName: "DefaultCompany",
      productName: "CutSim",
      productVersion: "0.1",
      captureAllKeyboardInput: false,
      keyboardListeningElement: canvasElement,
      showBanner: (bannerMessage, type) => {
        if (type === "error") {
          setError(bannerMessage);
        } else {
          setMessage(bannerMessage);
          window.setTimeout(() => setMessage(null), 5000);
        }
      },
    };

    function startUnity() {
      releaseUnityKeyboardCapture(null, canvasElement);
      if (!window.createUnityInstance) {
        setError("Unity loader 未初始化。");
        return;
      }

      setError(null);
      setProgress(0);
      setLoaded(false);
      window
        .createUnityInstance(canvasElement, config, (nextProgress) => {
          if (!cancelled) {
            setProgress(nextProgress);
          }
        })
        .then((unityInstance) => {
          if (cancelled) {
            void unityInstance.Quit();
            return;
          }
          releaseUnityKeyboardCapture(unityInstance, canvasElement);
          instanceRef.current = unityInstance;
          setLoaded(true);
          setProgress(1);
        })
        .catch((reason: unknown) => {
          if (!cancelled) {
            setError(reason instanceof Error ? reason.message : String(reason));
          }
        });
    }

    const existingScript = document.getElementById(UNITY_LOADER_SCRIPT_ID) as HTMLScriptElement | null;
    if (window.createUnityInstance) {
      startUnity();
    } else if (existingScript) {
      existingScript.addEventListener("load", startUnity, { once: true });
      existingScript.addEventListener("error", () => setError("Unity loader 加载失败。"), { once: true });
    } else {
      const script = document.createElement("script");
      script.id = UNITY_LOADER_SCRIPT_ID;
      script.src = UNITY_LOADER_URL;
      script.async = true;
      script.addEventListener("load", startUnity, { once: true });
      script.addEventListener("error", () => setError("Unity loader 加载失败。"), { once: true });
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      const instance = instanceRef.current;
      instanceRef.current = null;
      if (instance) {
        void instance.Quit().finally(removeUnityKeyboardGuard);
      } else {
        removeUnityKeyboardGuard();
      }
    };
  }, []);
  // #endregion

  // #region Frontend -> Unity commands
  useEffect(() => {
    if (!unityCommand || lastSentCommandIdRef.current === unityCommand.id) return;
    if (!loaded || !instanceRef.current) return;

    try {
      sendUnityCommand(instanceRef.current, unityCommand);
      lastSentCommandIdRef.current = unityCommand.id;
    } catch (commandError) {
      setFeedback({
        severity: "error",
        message: commandError instanceof Error ? commandError.message : "Unity 命令发送失败。",
      });
    }
  }, [loaded, setFeedback, unityCommand]);
  // #endregion

  // #region Unity -> Frontend callbacks
  useEffect(() => {
    const handlePreviewCompleted = () => {
      markMaterialRemovalPreviewCompleted();
    };

    window.addEventListener("UnityMaterialRemovalPreviewCompleted", handlePreviewCompleted);
    return () => window.removeEventListener("UnityMaterialRemovalPreviewCompleted", handlePreviewCompleted);
  }, [markMaterialRemovalPreviewCompleted]);
  // #endregion

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", minHeight: 0, overflow: "hidden", backgroundColor: "#111827" }}>
      <canvas
        ref={canvasRef}
        id="unity-canvas"
        tabIndex={-1}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          outline: "none",
          background: "#111827",
        }}
      />

      {!loaded && !error && (
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 320,
            maxWidth: "calc(100% - 48px)",
            transform: "translate(-50%, -50%)",
            px: 2,
            py: 1.5,
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.86)",
            boxShadow: "0 18px 42px rgba(0,0,0,0.22)",
          }}
        >
          <Typography sx={{ mb: 1, color: TEXT, fontSize: 13, fontWeight: 800 }}>Unity WebGL 加载中</Typography>
          <LinearProgress variant="determinate" value={Math.round(progress * 100)} />
          <Typography sx={{ mt: 0.8, color: TEXT_SECONDARY, fontSize: 12 }}>{Math.round(progress * 100)}%</Typography>
        </Box>
      )}

      {message && (
        <Box sx={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", px: 1.4, py: 0.8, borderRadius: 1, backgroundColor: "#fff7d6", color: TEXT, fontSize: 12.5 }}>
          {message}
        </Box>
      )}

      {error && (
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 360,
            maxWidth: "calc(100% - 48px)",
            transform: "translate(-50%, -50%)",
            px: 2,
            py: 1.5,
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.92)",
            boxShadow: "0 18px 42px rgba(0,0,0,0.22)",
          }}
        >
          <Typography sx={{ color: TEXT, fontSize: 13.5, fontWeight: 850 }}>Unity WebGL 加载失败</Typography>
          <Typography sx={{ mt: 0.8, color: TEXT_SECONDARY, fontSize: 12.5, overflowWrap: "anywhere" }}>{error}</Typography>
        </Box>
      )}

      {loaded && (
        <Button
          size="small"
          variant="contained"
          onClick={() => instanceRef.current?.SetFullscreen(1)}
          sx={{ position: "absolute", right: 18, bottom: 18, minHeight: 32, borderRadius: 999 }}
        >
          全屏
        </Button>
      )}
    </Box>
  );
}
