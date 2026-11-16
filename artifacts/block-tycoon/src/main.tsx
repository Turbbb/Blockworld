import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // silent: no PWA caching is not critical
  });
}

createRoot(document.getElementById("root")!).render(<App />);
