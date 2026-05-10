import { Box, TextField, Typography } from "@mui/material";

import { PRIMARY, TEXT, TEXT_SECONDARY } from "../../app/constants";

// 表单值统一保持 string，避免用户输入小数点、空值等中间态时被立即格式化。
export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Box sx={{ minHeight: 34, display: "grid", gridTemplateColumns: "minmax(108px, 1fr) minmax(92px, 0.75fr)", alignItems: "center", gap: 1 }}>
      <Typography sx={{ minWidth: 0, color: TEXT_SECONDARY, fontSize: 12.5, lineHeight: 1.2 }}>{label}</Typography>
      <TextField
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        fullWidth
        inputProps={{ "aria-label": label }}
        sx={{
          "& .MuiOutlinedInput-root": {
            height: 32,
            backgroundColor: "transparent",
            borderRadius: 1,
            transition: "background-color 160ms ease, box-shadow 160ms ease",
            "& fieldset": { borderColor: "transparent" },
            "&:hover": { backgroundColor: "rgba(255,255,255,0.34)" },
            "&:hover fieldset": { borderColor: "rgba(255,255,255,0.54)" },
            "&.Mui-focused": {
              backgroundColor: "rgba(255,255,255,0.68)",
              boxShadow: "0 0 0 3px rgba(0,107,143,0.1)",
            },
            "&.Mui-focused fieldset": { borderColor: PRIMARY, borderWidth: 1 },
          },
          "& input": {
            px: 0.9,
            py: 0,
            textAlign: "right",
            color: TEXT,
            fontWeight: 720,
            fontSize: 13,
          },
        }}
      />
    </Box>
  );
}
