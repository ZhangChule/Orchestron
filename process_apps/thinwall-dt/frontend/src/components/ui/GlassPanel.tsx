// 毛玻璃卡片容器
import type { ReactNode } from "react";

import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

export function GlassPanel({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box
      sx={{
        border: "1px solid rgba(255,255,255,0.44)",
        backgroundColor: "rgba(255,255,255,0.28)",
        boxShadow: "0 18px 48px rgba(23,43,57,0.18), inset 0 1px 0 rgba(255,255,255,0.42)",
        backdropFilter: "blur(24px) saturate(145%)",
        WebkitBackdropFilter: "blur(24px) saturate(145%)",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
