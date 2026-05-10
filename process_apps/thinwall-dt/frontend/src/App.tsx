import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Alert, AppBar, Box, Button, CssBaseline, ThemeProvider, Toolbar, Typography } from "@mui/material";

import { BORDER, PAGE_BG, SURFACE, TEXT } from "./app/constants";
import { theme } from "./app/theme";
import type { FloatingPosition } from "./app/types";
import { ProcessNavigation } from "./features/navigation/ProcessNavigation";
import { MachiningStatusOverlay } from "./features/preview/MachiningStatusOverlay";
import { PreviewToolbar } from "./features/preview/PreviewToolbar";
import { UnityWebGLPreview } from "./features/preview/UnityWebGLPreview";
import { PropertiesPanel } from "./features/properties/PropertiesPanel";
import { TasksPanel } from "./features/tasks/TasksPanel";
import { useMachiningStore } from "./store/machiningStore";
import { clamp } from "./utils/number";

// #region Floating panel collision settings
// 这里使用固定侧栏尺寸做避让，避免拖动工具条时压到左侧导航或右侧属性/任务面板。
const PANEL_MARGIN = 18;
const PANEL_COLLISION_GAP = 18;
const LEFT_NAV_WIDTH = 300;
const RIGHT_PANEL_WIDTH = 388;

function overlapsVertically(top: number, height: number, panelTop: number, panelHeight: number) {
  return top < panelTop + panelHeight + PANEL_COLLISION_GAP && top + height > panelTop - PANEL_COLLISION_GAP;
}
// #endregion

export default function App() {
  // #region Global UI state
  const selectedNodeId = useMachiningStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useMachiningStore((state) => state.setSelectedNodeId);
  const rightTab = useMachiningStore((state) => state.rightTab);
  const setRightTab = useMachiningStore((state) => state.setRightTab);
  const showMachiningStatus = useMachiningStore((state) => state.showMachiningStatus);
  const setShowMachiningStatus = useMachiningStore((state) => state.setShowMachiningStatus);
  const toolParams = useMachiningStore((state) => state.toolParams);
  const processParams = useMachiningStore((state) => state.processParams);
  const feedback = useMachiningStore((state) => state.feedback);
  const setFeedback = useMachiningStore((state) => state.setFeedback);
  // #endregion

  // #region Local drag state
  const [navHeight, setNavHeight] = useState<number | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<FloatingPosition | null>(null);
  const navResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const toolbarDragRef = useRef<{ offsetX: number; offsetY: number; width: number; height: number } | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  // #endregion

  // #region Pointer interactions
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resize = navResizeRef.current;
      const workspace = workspaceRef.current;
      const toolbarDrag = toolbarDragRef.current;
      if (!workspace) return;

      const bounds = workspace.getBoundingClientRect();
      if (resize) {
        const nextHeight = clamp(resize.startHeight + event.clientY - resize.startY, 280, Math.max(320, bounds.height - 36));
        setNavHeight(nextHeight);
      }

      if (toolbarDrag) {
        // 工具条拖动时只和固定侧栏区域碰撞，不读取侧栏 DOM 实时尺寸。
        const generalMinX = PANEL_MARGIN;
        const generalMaxX = Math.max(generalMinX, bounds.width - toolbarDrag.width - PANEL_MARGIN);
        const nextY = clamp(event.clientY - bounds.top - toolbarDrag.offsetY, PANEL_MARGIN, Math.max(PANEL_MARGIN, bounds.height - toolbarDrag.height - PANEL_MARGIN));
        let minX = generalMinX;
        let maxX = generalMaxX;

        const navPanelHeight = Math.max(0, bounds.height - PANEL_MARGIN * 2);
        if (overlapsVertically(nextY, toolbarDrag.height, PANEL_MARGIN, navPanelHeight)) {
          minX = Math.max(minX, PANEL_MARGIN + LEFT_NAV_WIDTH + PANEL_COLLISION_GAP);
        }

        const rightPanelWidth = Math.min(RIGHT_PANEL_WIDTH, Math.max(0, bounds.width - PANEL_MARGIN * 2));
        const rightPanelLeft = bounds.width - PANEL_MARGIN - rightPanelWidth;
        if (overlapsVertically(nextY, toolbarDrag.height, PANEL_MARGIN, Math.max(0, bounds.height - PANEL_MARGIN * 2))) {
          maxX = Math.min(maxX, rightPanelLeft - PANEL_COLLISION_GAP - toolbarDrag.width);
        }

        if (minX > maxX) {
          minX = generalMinX;
          maxX = generalMaxX;
        }

        setToolbarPosition({
          x: clamp(event.clientX - bounds.left - toolbarDrag.offsetX, minX, maxX),
          y: nextY,
        });
      }
    };

    const handlePointerUp = () => {
      navResizeRef.current = null;
      toolbarDragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  function handleNavResizeStart(event: ReactPointerEvent<HTMLElement>) {
    const workspace = workspaceRef.current;
    const workspaceHeight = workspace?.getBoundingClientRect().height ?? 0;
    navResizeRef.current = {
      startY: event.clientY,
      startHeight: navHeight ?? Math.max(280, workspaceHeight - 36),
    };
    event.preventDefault();
  }

  function handleToolbarDragStart(event: ReactPointerEvent<HTMLElement>) {
    const toolbar = event.currentTarget.closest("[data-preview-toolbar='true']") as HTMLElement | null;
    const workspace = workspaceRef.current;
    if (!toolbar || !workspace) return;

    const toolbarBounds = toolbar.getBoundingClientRect();
    const workspaceBounds = workspace.getBoundingClientRect();
    toolbarDragRef.current = {
      offsetX: event.clientX - toolbarBounds.left,
      offsetY: event.clientY - toolbarBounds.top,
      width: toolbarBounds.width,
      height: toolbarBounds.height,
    };
    setToolbarPosition({
      x: toolbarBounds.left - workspaceBounds.left,
      y: toolbarBounds.top - workspaceBounds.top,
    });
    event.preventDefault();
    event.stopPropagation();
  }

  function handleOpenProperties(id: typeof selectedNodeId) {
    setSelectedNodeId(id);
    setRightTab("properties");
  }
  // #endregion

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{ flexShrink: 0, backgroundColor: SURFACE, borderBottom: `1px solid ${BORDER}` }}
        >
          <Toolbar sx={{ minHeight: "58px !important", px: 2.5, gap: 1.5 }}>
            <Typography sx={{ fontSize: 21, fontWeight: 800, color: TEXT, lineHeight: 1 }}>
              薄壁件加工数字孪生平台
            </Typography>
          </Toolbar>
        </AppBar>

        <Box ref={workspaceRef} sx={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", backgroundColor: PAGE_BG }}>
          <Box sx={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <UnityWebGLPreview />

            <PreviewToolbar
              showStatus={showMachiningStatus}
              onToggleStatus={() => setShowMachiningStatus((previous) => !previous)}
              position={toolbarPosition}
              onDragStart={handleToolbarDragStart}
            />
            <ProcessNavigation
              selectedId={selectedNodeId}
              onOpenProperties={handleOpenProperties}
              height={navHeight}
              onResizeStart={handleNavResizeStart}
            />
            {showMachiningStatus && <MachiningStatusOverlay tool={toolParams} process={processParams} />}

            {feedback && (
              <Alert
                severity={feedback.severity}
                onClose={() => setFeedback(null)}
                sx={{
                  position: "absolute",
                  top: 70,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 6,
                  minWidth: 360,
                  maxWidth: "calc(100% - 720px)",
                  border: "1px solid rgba(255,255,255,0.58)",
                  backgroundColor: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(18px) saturate(160%)",
                  WebkitBackdropFilter: "blur(18px) saturate(160%)",
                  boxShadow: "0 14px 36px rgba(23,43,57,0.14)",
                  alignItems: "center",
                }}
              >
                {feedback.message}
              </Alert>
            )}
          </Box>

          <Box
            component="aside"
            sx={{
              position: "absolute",
              top: 18,
              right: 18,
              bottom: 18,
              width: 388,
              maxWidth: "calc(100% - 36px)",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${BORDER}`,
              borderRadius: "22px",
              backgroundColor: SURFACE,
              boxShadow: "0 18px 48px rgba(23,43,57,0.12)",
              zIndex: 5,
              overflow: "hidden",
              overflowX: "hidden",
            }}
          >
            <Box sx={{ px: 2, pt: 1.4, pb: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.8, backgroundColor: SURFACE }}>
              <Button variant={rightTab === "properties" ? "contained" : "text"} onClick={() => setRightTab("properties")} sx={{ borderRadius: 1 }}>
                属性
              </Button>
              <Button variant={rightTab === "tasks" ? "contained" : "text"} onClick={() => setRightTab("tasks")} sx={{ borderRadius: 1 }}>
                任务
              </Button>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", px: 2, py: 1.5, backgroundColor: SURFACE }}>
              {rightTab === "properties" ? <PropertiesPanel /> : <TasksPanel />}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
