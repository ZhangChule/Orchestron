import { Stack, Typography } from "@mui/material";

import type { ProcessParams, ToolParams } from "../../app/types";
import { DataRow } from "../../components/ui/DataRow";
import { GlassPanel } from "../../components/ui/GlassPanel";

export function MachiningStatusOverlay({
  tool,
  process,
}: {
  tool: ToolParams;
  process: ProcessParams;
}) {
  return (
    <GlassPanel
      sx={{
        position: "absolute",
        left: 334,
        top: 18,
        zIndex: 4,
        width: 260,
        borderRadius: "18px",
        px: 1.4,
        py: 1.2,
      }}
    >
      <Typography sx={{ mb: 0.8, fontSize: 14, fontWeight: 850 }}>当前加工状态</Typography>
      <Stack
        spacing={0.45}
        sx={{
          "& > div": {
            gridTemplateColumns: "minmax(78px, 1fr) minmax(96px, 0.95fr)",
          },
        }}
      >
        <DataRow label="主轴转速 n" value={`${process.spindleSpeed || "—"} r/min`} />
        <DataRow label="进给速度 F" value={`${process.feedRate || "—"} mm/min`} />
        <DataRow label="径向切深 ae" value={`${process.radialDepth || "—"} mm`} />
        <DataRow label="轴向切深 ap" value={`${process.axialDepth || "—"} mm`} />
        <DataRow label="刀具直径 D" value={`${tool.diameter || "—"} mm`} />
        <DataRow label="刀具齿数 Z" value={tool.teeth || "—"} />
      </Stack>
    </GlassPanel>
  );
}
