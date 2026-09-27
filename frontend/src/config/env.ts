// Default to the page's own origin so a single tunnel (ngrok) serves the app,
// the API, and the WebSocket via the Vite proxy. Hardcoding localhost breaks
// any device that is not the machine running the backend.
const origin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:8000";

export const env = {
  API_URL: import.meta.env.VITE_API_URL || origin,
  WS_URL:
    import.meta.env.VITE_WS_URL || `${origin.replace(/^http/, "ws")}/ws/stream`,
  FRAME_RATE_FPS: Number(import.meta.env.VITE_FRAME_RATE_FPS) || 1.5,
  IMAGE_QUALITY: Number(import.meta.env.VITE_IMAGE_QUALITY) || 0.8,
  // Google Maps — must be set in frontend/.env as VITE_GOOGLE_MAPS_API_KEY
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
};
