import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

// 把App挂载到index.html中的root元素上
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
