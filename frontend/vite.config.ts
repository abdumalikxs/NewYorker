import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set TUNNEL=1 when serving through ngrok so HMR dials the tunnel's TLS port
// instead of the raw dev port, which is not exposed.
const tunnel = process.env.TUNNEL === "1";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Expose to LAN for testing on physical mobile device
    // Tunnels send an arbitrary Host header, which Vite rejects by default.
    allowedHosts: true,
    hmr: tunnel ? { clientPort: 443 } : undefined,
    // Backend rides the same origin so a single tunnel covers app + API + WebSocket.
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/ws": { target: "ws://127.0.0.1:8000", ws: true, changeOrigin: true }
    }
  }
});
