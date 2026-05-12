import { Box, Typography } from "@mui/material";

import { DANGER, PRIMARY, TEXT, TEXT_SECONDARY } from "../../app/constants";

export function DataRow({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" | "danger" }) {
  const color = tone === "primary" ? PRIMARY : tone === "danger" ? DANGER : TEXT;
  return (
    <Box sx={{ minHeight: 30, minWidth: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.92fr)", alignItems: "center", gap: 1 }}>
      <Typography sx={{ minWidth: 0, color: TEXT_SECONDARY, fontSize: 12.5, lineHeight: 1.2, overflowWrap: "anywhere" }}>{label}</Typography>
      <Typography sx={{ minWidth: 0, color, fontSize: 13, lineHeight: 1.2, fontWeight: 760, textAlign: "right", overflowWrap: "anywhere" }}>{value}</Typography>
    </Box>
  );
}
