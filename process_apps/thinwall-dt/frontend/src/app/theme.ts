// 整体视觉设计和主题配置
import { createTheme } from "@mui/material";

import { APP_FONT, BORDER, PAGE_BG, PRIMARY, PRIMARY_HOVER, SURFACE, SURFACE_ALT, TEXT, TEXT_SECONDARY } from "./constants";

// MUI 全局主题只放跨组件通用规则；具体业务布局仍在各 feature/component 内维护。
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: PRIMARY },
    background: { default: PAGE_BG, paper: SURFACE },
    text: { primary: TEXT, secondary: TEXT_SECONDARY },
  },
  typography: {
    fontFamily: APP_FONT,
    fontSize: 14,
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { height: "100%" },
        body: {
          height: "100%",
          margin: 0,
          backgroundColor: PAGE_BG,
          color: TEXT,
          WebkitFontSmoothing: "antialiased",
        },
        "#root": { height: "100%" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          border: `1px solid ${BORDER}`,
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 700,
          minHeight: 36,
        },
        containedPrimary: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
            backgroundColor: PRIMARY_HOVER,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        variant: "outlined",
        InputLabelProps: { shrink: true },
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: SURFACE_ALT,
            borderRadius: 8,
            "& fieldset": { borderColor: BORDER },
            "&:hover fieldset": { borderColor: "#b7c5d2" },
            "&.Mui-focused fieldset": { borderColor: PRIMARY, borderWidth: 1 },
          },
          "& .MuiInputLabel-root": { color: TEXT_SECONDARY },
        },
      },
    },
    MuiSelect: {
      defaultProps: { size: "small" },
    },
  },
});
