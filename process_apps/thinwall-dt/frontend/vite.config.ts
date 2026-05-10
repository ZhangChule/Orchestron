import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function unityWebglHeaders(): Plugin {
  const setUnityHeaders = (url: string | undefined, setHeader: (name: string, value: string) => void) => {
    if (!url?.startsWith("/UnityBuild/Build/") || !url.endsWith(".gz")) return;

    setHeader("Content-Encoding", "gzip");
    if (url.endsWith(".wasm.gz")) {
      setHeader("Content-Type", "application/wasm");
    } else if (url.endsWith(".js.gz")) {
      setHeader("Content-Type", "application/javascript");
    } else if (url.endsWith(".data.gz")) {
      setHeader("Content-Type", "application/octet-stream");
    }
  };

  return {
    name: "unity-webgl-headers",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        setUnityHeaders(req.url, (name, value) => res.setHeader(name, value));
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        setUnityHeaders(req.url, (name, value) => res.setHeader(name, value));
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), unityWebglHeaders()],
  server: {
    proxy: {
      "/api/thinwall-dt": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/thinwall-dt/, ""),
      },
    },
  },
});
