# Agent Instructions

This file is the single source of truth for any coding agent (Claude Code, Cursor, Codex, Antigravity, etc.) working in this repo. Read it before touching code.

---

## Stack

- **Backend:** Python 3.12+ + FastAPI (async event loop, WebSockets via `uvicorn`)
- **Frontend:** Vite + React SPA + TypeScript + Tailwind CSS (mobile-first, WebRTC/Canvas video capture, Web Audio API playback)
- **Vision & Multimodal Reasoning:** Google Gemini API (`gemini-2.0-flash` for low-latency multimodal video understanding & tool calling)
- **Voice & Speech Synthesis:** ElevenLabs Streaming WebSocket TTS (sub-800ms multilingual voice in 30+ native languages)
- **Agentic Financial Infrastructure:** Capital One Nessie API (turnstile balance verification, automated fare reload, transit budget tracking)
- **Messaging Delivery Agent:** Photon Spectrum SDK (rich native iOS Apple iMessage blue-bubble dispatch)
- **Database & Retrieval:** MongoDB Atlas (rolling visual session buffer, station POI vector search, MTA detour/service alert RAG)
- **Hosting & Infrastructure:** DigitalOcean (App Platform & Droplet compute in NYC)
- **Domain:** `livelens.tech`

The stack is locked for this hackathon build. Do not propose or introduce alternative frameworks or major libraries without an explicit requirement and stated rationale.

---

## Repo Layout

```text
LiveLens/
├── AGENTS.md               # this file (root agent instructions)
├── README.md               # project overview & sponsor alignment
├── docker-compose.yml      # local multi-container testing
├── docs/                   # architecture, briefs, and guides
│   ├── architecture.md     # system design, sequence diagrams, latency budget
│   ├── project-brief.md    # 3-minute live judging script & value propositions
│   ├── plans/              # feature implementation plans (see docs/plans/TEMPLATE.md)
│   └── guides/
│       ├── backend-setup.md
│       ├── frontend-setup.md
│       └── sponsor-integrations-setup.md
├── backend/                # FastAPI streaming service & visual state engine
│   ├── AGENTS.md           # backend-specific agent instructions
│   ├── app/
│   │   ├── main.py         # FastAPI application entry & WebSocket router
│   │   ├── config.py       # Pydantic Settings (single source of truth for env)
│   │   ├── agents/         # Orchestrator & Gemini function tool definitions
│   │   ├── services/       # Integrations: gemini, elevenlabs, nessie, photon, mongo
│   │   └── models/         # Pydantic schemas (frames, session state, payloads)
│   ├── pyproject.toml      # Dependency management via uv
│   └── Dockerfile
└── frontend/               # React + Vite mobile PWA
    ├── AGENTS.md           # frontend-specific agent instructions
    ├── src/
    │   ├── components/     # CameraView, AudioStream, Transcript, ActionCard
    │   ├── hooks/          # useLiveLens dual WebSocket lifecycle hook
    │   ├── config/env.ts   # Frontend configuration & env validation
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

---

## Dependency Policy

**Default: write it yourself. Reach for a library only when the alternative is non-trivial, error-prone, or reinvention of a standard.** Every added dependency is a liability—increasing bundle size, latency, and failure surface during live judging.

### OK to depend on:
- Hard platform guarantees and protocols: ASGI servers (`uvicorn`), HTTP/WebSocket clients (`httpx`, `websockets`), official provider SDKs (`google-genai`, `motor` / `pymongo`).
- Declared core stack: FastAPI, Pydantic, React, Vite, Tailwind CSS.

### Not OK:
- Heavy utility libraries (e.g., Lodash, Moment.js, Axios when `fetch` or native JS suffices).
- Complex state management frameworks (e.g., Redux) where React hooks and Context do the job cleanly.
- "Helper wrappers" that simply repackage standard library calls.

Before adding a runtime dependency, confirm:
1. What does it solve that cannot be written in <30 lines of clean, readable code?
2. Does it negatively impact the <800ms end-to-end latency budget?
3. What is its transitive footprint?

---

## Configuration & Environment Management

- **Backend:** `backend/app/config.py` using `pydantic-settings` is the **only** source of truth.
  - Never call `os.getenv` directly in controllers, services, or agents.
  - Fail fast on application startup if critical API keys (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `NESSIE_API_KEY`, etc.) are missing or malformed.
- **Frontend:** `frontend/src/config/env.ts` is the **only** source of truth for client variables (`VITE_API_URL`, `VITE_WS_URL`).
  - Do not scatter `import.meta.env` references throughout UI components.
- Never hardcode API keys, secrets, or internal test credentials in committed code.

---

## Code Style & Streaming Principles

- **Small, Obvious Functions:** A clear 15-line async function beats an over-engineered abstract class.
- **Async-First Execution:** Never run blocking synchronous I/O on the FastAPI main event loop. Always use `asyncio` or run blocking calls in `asyncio.to_thread`.
- **Low-Latency Streaming Pipeline:**
  - Token-to-speech chunking: Feed text tokens from Gemini into the ElevenLabs WebSocket stream **immediately** as they arrive. Do not buffer the entire sentence before starting audio synthesis.
  - Binary framing: Stream raw audio PCM and compressed JPEG frames cleanly over WebSockets without redundant base64 decoding loops where possible.
- **No Premature Abstraction:** Do not build generic multi-agent orchestrator frameworks when direct, typed tool definitions are faster and more reliable.
- **Defensive Boundary Validation:** Validate rigorously at ingress boundaries (incoming WebSocket payloads, external API responses). Trust internal types.
- **Comments:** Document *why* a particular latency optimization or workaround exists, never restate what the code trivially does.

---

## Feature Development & Implementation Workflow

Do not implement complex features in a single unreviewed shot. All non-trivial features should follow this phased cadence:

1. **Plan & Document:** Define the feature scope and data contract in `docs/plans/<feature-name>.md`.
2. **Phase 1: Schemas & Contracts:** Define Pydantic models, MongoDB collections, and typed WebSocket event messages.
3. **Phase 2: Service & Tool Integration:** Implement backend logic (e.g., Nessie balance checker, Photon dispatcher, Gemini tool call handler) with curl/unit verification.
4. **Phase 3: Frontend Client & Streaming HUD:** Wire the React camera canvas, audio player, and visual indicators.
5. **Phase 4: Live End-to-End Validation:** Verify complete loop on physical mobile device over HTTPS/tunnel to confirm sub-800ms latency.
