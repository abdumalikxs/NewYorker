# Frontend Setup Guide

This guide details setting up and running the **LiveLens** React + Vite mobile-first web application, including camera feed capture, audio streaming, and testing on mobile devices for hackathon live judging.

---

## 📋 Prerequisites

- **Node.js**: `20.x` or higher (LTS recommended)
- **Package Manager**: `pnpm` (preferred) or `npm`:
  ```bash
  # Enable pnpm via Corepack
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

---

## ⚙️ Environment Configuration

Create a `.env.local` file inside `frontend/`:

```env
# WebSocket API Target (Points to local FastAPI or production DigitalOcean URL)
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/stream

# App Settings
VITE_FRAME_RATE_FPS=1.5
VITE_IMAGE_QUALITY=0.8
```

---

## 🚀 Running Locally

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install  # or npm install
   ```

3. Launch the development server:
   ```bash
   pnpm dev
   ```

The application will be accessible at: `http://localhost:5173`

---

## 📱 Crucial: Mobile Device & Live Stage Testing

Modern mobile browsers (iOS Safari and Android Chrome) **strictly require HTTPS** (or `localhost`) to access camera (`getUserMedia`) and microphone permissions.

To run and demo LiveLens on your physical phone during the hackathon:

### Method 1: Vite HTTPS with `@vitejs/plugin-basic-ssl`
Run Vite with HTTPS enabled:
```bash
pnpm dev --host
```
Open your mobile browser and enter the LAN IP shown in your terminal (e.g., `https://192.168.1.50:5173`) and accept the self-signed certificate warning.

### Method 2: Public Tunnel with ngrok (Recommended for Stage Demos)
Expose both backend and frontend securely:

1. Expose Vite frontend:
   ```bash
   ngrok http 5173
   ```
2. Update `VITE_WS_URL` to point to the backend tunnel if testing remotely.
3. Open the resulting HTTPS link (`https://your-domain.ngrok-free.app`) on your iPhone or Android. You can now use your back camera (`facingMode: "environment"`) and stream live video straight into the model!

---

## 🧩 Key Frontend Modules

- `src/components/CameraView.tsx`: Manages the HTML5 `<video>` feed and uses an off-screen `<canvas>` to sample compressed JPEG frames at regular intervals.
- `src/components/AudioStream.tsx`: Encapsulates Web Audio API `AudioContext` and handles gapless PCM playback of synthesized audio chunks received from ElevenLabs.
- `src/hooks/useLiveLens.ts`: Central WebSocket coordinator managing connection lifecycle, heartbeat ping/pong, and error recovery.
- `src/components/ActionCard.tsx`: UI component displaying real-time triggers (e.g., OMNY balance checks, iMessage confirmation banners).
