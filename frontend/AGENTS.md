# Frontend — Agent Instructions

This is the mobile-first React + Vite application for **LiveLens**. Read [../AGENTS.md](../AGENTS.md) first — universal repo rules and conventions live there. This file defines frontend-specific patterns, audio/video pipelines, and UI architecture.

---

## Stack

- **Framework:** React 18+ (Vite SPA) + TypeScript
- **Styling:** Tailwind CSS (mobile-first, dark mode, high-contrast urban HUD)
- **Icons:** `lucide-react` (lightweight icon set)
- **Video Capture:** WebRTC `MediaDevices.getUserMedia` + HTML5 Offscreen `<canvas>` frame sampler
- **Audio Recording:** Web Audio API (`MediaStreamAudioSourceNode` / `AudioWorklet` or script processor)
- **Audio Synthesis Playback:** Web Audio API `AudioContext` with linear PCM streaming buffer
- **Real-Time Transport:** Native browser `WebSocket` with automatic reconnection and ping/pong keepalive
- **Package Manager:** `pnpm` (or `npm`)

---

## Layout

```text
frontend/
├── src/
│   ├── components/
│   │   ├── CameraView.tsx      # Video viewfinder + offscreen frame sampler canvas
│   │   ├── AudioStream.tsx     # Web Audio API streaming playback visualizer
│   │   ├── Transcript.tsx      # Live bilingual subtitle HUD overlay
│   │   ├── ActionCard.tsx      # Interactive cards for iMessage triggers & Nessie balance
│   │   ├── LanguagePicker.tsx  # Quick language selector (Tajik, Spanish, Uzbek, etc.)
│   │   └── StatusBar.tsx       # Latency monitor (<800ms indicator) & connection badge
│   ├── hooks/
│   │   ├── useLiveLens.ts      # Core streaming hook: WebSockets, frame loops, audio queue
│   │   ├── useCamera.ts        # Camera permission, facingMode, and media stream lifecycle
│   │   └── useAudioPlayer.ts   # Web Audio API buffer scheduling & gapless playback
│   ├── config/
│   │   └── env.ts              # Single source of truth for frontend environment variables
│   ├── types/
│   │   └── stream.ts           # WebSocket event schemas (Incoming/Outgoing message contracts)
│   ├── App.tsx                 # Root mobile view layout & HUD container
│   ├── main.tsx                # React root mount
│   └── index.css               # Tailwind directives & HUD animations
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## Dependency Policy

See universal policy in [../AGENTS.md](../AGENTS.md). Frontend-specific:

- **Strictly prefer browser-native APIs:**
  - Use native `fetch()` instead of `axios`.
  - Use native `WebSocket` instead of Socket.io client.
  - Use native `navigator.mediaDevices.getUserMedia` for video/audio ingest.
  - Use native `AudioContext` for real-time PCM playback.
- **No heavy state management libraries:** React hooks (`useState`, `useRef`, `useCallback`) and `useContext` are sufficient. Avoid Redux, MobX, or Zustand unless explicit state complexity warrants it.
- **No heavy utility libraries:** Do not install `lodash`, `moment.js`, or `ramda`. Write clean native ES6+ TypeScript.

---

## Configuration & Environment Management

- `src/config/env.ts` is the **single source of truth** for client variables.
- Never scatter `import.meta.env` calls throughout individual UI components.
- Validate environment variables at boot and fail gracefully with an on-screen toast if missing:
  ```typescript
  // src/config/env.ts
  export const env = {
    API_URL: import.meta.env.VITE_API_URL || "http://localhost:8000",
    WS_URL: import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/stream",
    FRAME_RATE_FPS: Number(import.meta.env.VITE_FRAME_RATE_FPS) || 1.5,
    IMAGE_QUALITY: Number(import.meta.env.VITE_IMAGE_QUALITY) || 0.8,
  };
  ```

---

## Real-Time Audio & Video Streaming Rules

1. **Adaptive Frame Sampling:**
   - Never send continuous 60fps raw video frames over WebSockets.
   - Use an off-screen `<canvas>` to grab frames at **1.0 to 2.0 FPS** at reasonable resolution (e.g. 720p compressed as JPEG quality `0.8`). This preserves OCR clarity for MTA signs while keeping network usage under 100 KB/s.
2. **Gapless Audio Playback:**
   - ElevenLabs yields small streaming chunks. Use `AudioContext.createBufferSource()` and schedule chunks on an incrementally advancing timestamp (`nextStartTime = Math.max(audioContext.currentTime, nextStartTime) + buffer.duration`).
   - Clean up audio nodes on unmount to prevent browser memory leaks.
3. **Mobile Viewport & Camera Permissions:**
   - Default camera constraint: `{ video: { facingMode: { ideal: "environment" } } }` (back camera for pointing at signs).
   - Gracefully prompt users if camera or microphone permissions are blocked.

---

## UI / UX Design Principles (Spatial HUD)

- **High-Contrast, Sunlight-Readable:** Dark semi-transparent overlays (`bg-black/60 backdrop-blur-md`) with crisp white/yellow text for high visibility in dark subway stations and bright outdoor sunlight.
- **Minimalist Hands-Free Interface:** Keep viewports uncluttered. The live video feed is the hero background; subtitles, status indicators, and action cards float unobtrusively.
- **Live Latency & Action Feedback:**
  - Display a live sub-second latency pill (`<800ms`) showing active copilot health.
  - When a tool executes (e.g., iMessage sent or Nessie balance checked), render an animated toast card with instant visual confirmation.

---

## Mobile Stage Testing Checklist

During hackathon presentations, the frontend will be tested on real phones:
- [ ] Run Vite with `--host` or expose via `ngrok http 5173`.
- [ ] Ensure mobile connection uses **HTTPS** (or iOS/Android will block camera and mic).
- [ ] Verify audio un-mutes after user gesture (first tap initializes `AudioContext`).
