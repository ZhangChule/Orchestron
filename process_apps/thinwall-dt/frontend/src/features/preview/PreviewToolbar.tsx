import type { PointerEvent as ReactPointerEvent } from "react";

import { Box, IconButton, Tooltip } from "@mui/material";

import type { FloatingPosition } from "../../app/types";
import { GlassPanel } from "../../components/ui/GlassPanel";

import iconReport from "../../assets/siemens/element-report.svg";

export function PreviewToolbar({
  showStatus,
  onToggleStatus,
  position,
  onDragStart,
}: {
  showStatus: boolean;
  onToggleStatus: () => void;
  position: FloatingPosition | null;
  onDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  return (
    <Box
      data-preview-toolbar="true"
      sx={{
        position: "absolute",
        top: position?.y ?? 18,
        left: position?.x ?? "50%",
        transform: position ? "none" : "translateX(-50%)",
        zIndex: 4,
      }}
    >
      <GlassPanel
        sx={{
          borderRadius: 999,
          px: 0.55,
          py: 0.5,
          display: "grid",
          gridTemplateColumns: "28px 36px",
          alignItems: "center",
          gap: 0.4,
        }}
      >
        <Box
          onPointerDown={onDragStart}
          sx={{
            width: 26,
            height: 30,
            display: "grid",
            gridTemplateColumns: "repeat(2, 4px)",
            gridAutoRows: 4,
            justifyContent: "center",
            alignContent: "center",
            gap: "4px 5px",
            cursor: "grab",
            touchAction: "none",
            "&:active": { cursor: "grabbing" },
          }}
          aria-label="拖动加工状态工具条"
          role="button"
          tabIndex={0}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <Box key={index} sx={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "rgba(16,38,56,0.45)" }} />
          ))}
        </Box>
        <Tooltip title="加工状态">
          <IconButton
            size="small"
            onClick={onToggleStatus}
            sx={{
              width: 32,
              height: 32,
              backgroundColor: showStatus ? "rgba(0,107,143,0.14)" : "transparent",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.36)" },
            }}
          >
            <Box component="img" src={iconReport} alt="" sx={{ width: 17, height: 17 }} />
          </IconButton>
        </Tooltip>
      </GlassPanel>
    </Box>
  );
}
