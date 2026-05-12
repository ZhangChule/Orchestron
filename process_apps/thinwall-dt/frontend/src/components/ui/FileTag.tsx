import { Box, Button, Typography } from "@mui/material";

import { TEXT_SECONDARY } from "../../app/constants";

export function FileTag({ file, onClear }: { file: File | null; onClear: () => void }) {
  if (!file) {
    return (
      <Box
        sx={{
          px: 1,
          py: 0.85,
          borderRadius: 1,
          border: "1px dashed rgba(255,255,255,0.56)",
          color: TEXT_SECONDARY,
          fontSize: 12.5,
          backgroundColor: "rgba(255,255,255,0.24)",
        }}
      >
        尚未选择文件
      </Box>
    );
  }

  return (
    <Box
      sx={{
        px: 1,
        py: 0.8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        borderRadius: 1,
        border: "1px solid rgba(255,255,255,0.56)",
        backgroundColor: "rgba(255,255,255,0.32)",
      }}
    >
      <Typography sx={{ minWidth: 0, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {file.name}
      </Typography>
      <Button size="small" variant="text" onClick={onClear} sx={{ minWidth: 42 }}>
        移除
      </Button>
    </Box>
  );
}
