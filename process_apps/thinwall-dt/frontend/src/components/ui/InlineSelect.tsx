import type { ReactNode } from "react";

import { Box, FormControl, Select, Typography } from "@mui/material";

import { PRIMARY, TEXT, TEXT_SECONDARY } from "../../app/constants";

export function InlineSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Box sx={{ minHeight: 34, display: "grid", gridTemplateColumns: "minmax(108px, 1fr) minmax(110px, 0.75fr)", alignItems: "center", gap: 1 }}>
      <Typography sx={{ color: TEXT_SECONDARY, fontSize: 12.5, lineHeight: 1.2 }}>{label}</Typography>
      <FormControl fullWidth size="small">
        <Select
          value={value}
          onChange={(event) => onChange(String(event.target.value))}
          displayEmpty
          sx={{
            height: 32,
            borderRadius: 1,
            backgroundColor: "transparent",
            color: TEXT,
            fontWeight: 720,
            fontSize: 13,
            textAlign: "right",
            transition: "background-color 160ms ease, box-shadow 160ms ease",
            "& fieldset": { borderColor: "transparent" },
            "&:hover": { backgroundColor: "rgba(255,255,255,0.34)" },
            "&:hover fieldset": { borderColor: "rgba(255,255,255,0.54)" },
            "&.Mui-focused": {
              backgroundColor: "rgba(255,255,255,0.68)",
              boxShadow: "0 0 0 3px rgba(0,107,143,0.1)",
            },
            "&.Mui-focused fieldset": { borderColor: PRIMARY, borderWidth: 1 },
            "& .MuiSelect-select": { py: 0.6, pr: "28px !important", textAlign: "right" },
          }}
        >
          {children}
        </Select>
      </FormControl>
    </Box>
  );
}
