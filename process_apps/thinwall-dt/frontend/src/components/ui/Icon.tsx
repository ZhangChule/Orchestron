import { Box } from "@mui/material";

export function Icon({ src }: { src: string }) {
  return <Box component="img" src={src} alt="" sx={{ width: 15, height: 15, flexShrink: 0 }} />;
}
