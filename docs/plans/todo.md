# LiveLens Implementation Master TODO & Milestone Plan

Based on [docs/architecture.md](../architecture.md), [docs/project-brief.md](../project-brief.md), and [AGENTS.md](../../AGENTS.md), this document outlines the phased roadmap to build, polish, and validate LiveLens for live hackathon judging.

---

## 🎯 High-Level Objective & Quality Gate
Deliver an end-to-end working demonstration on stage in **< 800ms response time**:
1. **Act 1:** Live camera pointed at subway entrance + Tajik voice input $\rightarrow$ Gemini extracts intent $\rightarrow$ ElevenLabs streams native Tajik speech back instantly.
2. **Act 2:** Rolling visual memory checks printed weekend paper detour $\rightarrow$ MongoDB Atlas RAG determines if 116 St Columbia Univ is impacted.
3. **Act 3:** Visual detection of OMNY turnstile $\rightarrow$ Capital One Nessie queries balance & auto-reloads $\rightarrow$ Photon Spectrum SDK sends formatted iMessage blue-bubble itinerary to judge's phone.

---

## 📋 Phase 0: Scaffolding & Health Validation (Status: ✅ Complete)
- [x] Repository layout with root `AGENTS.md`, `backend/AGENTS.md`, and `frontend/AGENTS.md`
- [x] Backend FastAPI service with `uv` virtual environment and dependency setup
- [x] Frontend React + Vite + Tailwind setup with mobile viewport support
- [x] Single source of truth configs: `backend/app/config.py` & `frontend/src/config/env.ts`
- [x] Dockerfile & `docker-compose.yml` multi-container specification
- [x] Basic connectivity test: `/api/hello` ("Hello New York") + frontend `/health` page

---

## 📋 Phase 1: Ingress & Hardware Streaming Pipeline (Status: ✅ Complete)
**Goal:** Robust video canvas frame sampling and real-time bidirectional WebSocket transport.

- [x] **1.1 Video Capture & Adaptive Frame Sampler:**
  - [x] Implement camera selector (front vs back `environment` camera fallback for laptops & phones)
  - [x] Tune frame throttling loop (1.0 to 1.5 FPS at JPEG quality 0.8) via off-screen HTML5 `<canvas>`
  - [x] Added crosshair HUD visual alignment overlay
  - [x] Resolved React StrictMode video `play()` interruption handling
- [x] **1.2 Voice Audio Capture & Playback Pipeline (Client):**
  - [x] Web Audio API streaming playback for ElevenLabs PCM chunks
  - [x] Continuous streaming toggle ("Live 1.5 FPS" vs "Single frame") with frame sequencing
- [x] **1.3 Dual WebSocket Multiplexer (`/ws/stream/{session_id}`):**
  - [x] Validated bidirectional event payloads (`ping`, `pong`, `frame`, `copilot_response`, `audio_chunk`)
  - [x] Implemented keepalive ping-pong and automatic 2-second reconnect logic

---

## 📋 Phase 2: Multimodal Perception & Visual State Engine (Status: ✅ Complete)
**Goal:** Gemini 2.0 Flash reasoning over rolling visual memory without hallucination.

- [x] **2.1 Rolling Visual Context FIFO Buffer:**
  - [x] Implemented `TransitLocationState` spatial state machine in `backend/app/agents/orchestrator.py` (`STREET_ENTRANCE` $\rightarrow$ `MEZZANINE` $\rightarrow$ `TURNSTILE` $\rightarrow$ `PLATFORM`)
  - [x] In-memory rolling FIFO memory (`deque(maxlen=10)`) preserving sequence context
  - [x] Live dynamic spatial state badge rendered in frontend HUD (`STREET ENTRANCE`, `MEZZANINE`, `TURNSTILE`)
- [x] **2.2 Gemini 2.0 Flash Prompt & Tool System:**
  - [x] Ingestion of live frames + user transcription + rolling visual memory tags
  - [x] Native Python callable tools registered for Gemini SDK tool calling
  - [x] Validated state transitions and automated tool activations across all 3 demo acts

---

## 📋 Phase 3: Sponsor Agent Integrations & External Execution
**Goal:** Flawless live tool execution for sponsor prize tracks.

- [ ] **3.1 Capital One Nessie API (Best Use of Nessie):**
  - [ ] Turnstile trigger detector: invoke `check_and_reload_transit_fare`
  - [ ] Live balance inquiry (`GET /accounts/{id}`) with fallback to sandbox customer
  - [ ] Auto-reload deposit execution (`POST /accounts/{id}/deposits`) when balance < $2.90
  - [ ] Return structured status card and spoken confirmation payload
- [ ] **3.2 Photon Spectrum SDK (Agents in iMessage using Photon):**
  - [ ] Implement `dispatch_imessage_itinerary` tool
  - [ ] Format itinerary with destination, subway bullet icons, transfers, and offline cards
  - [ ] Live verification to real iPhone during judging
- [ ] **3.3 MongoDB Atlas (Best Use of MongoDB Atlas):**
  - [ ] Ingest mock/sample MTA service alerts collection (weekend reroutes, elevator outages)
  - [ ] RAG retriever for platform signage and station layout
  - [ ] Async session logging for rolling visual memory audit
- [ ] **3.4 ElevenLabs Streaming WebSocket (Best Use of ElevenLabs):**
  - [ ] Token-to-speech chunking pipeline directly from Gemini streaming generator
  - [ ] Gapless Web Audio playback on client with jitter buffer protection
  - [ ] Native pronunciation tuning for Tajik (`tg`), Spanish (`es`), and English (`en`)

---

## 📋 Phase 4: Stage Demo Polish & Mobile Tuning
**Goal:** Zero-friction execution on stage in front of judges.

- [ ] **4.1 Mobile HTTPS & Network Setup:**
  - [ ] Set up `ngrok` or Cloudflare tunnel for physical phone camera streaming
  - [ ] First-gesture audio unlock button for iOS Safari `AudioContext` policies
- [ ] **4.2 HUD Polish & Action Cards:**
  - [ ] Animated cards for Capital One Nessie balance reload ($1.20 $\rightarrow$ $11.20)
  - [ ] Blue-bubble delivery indicator for Photon iMessage
  - [ ] Live sub-800ms latency monitor pill
- [ ] **4.3 Rehearse the 3-Minute Demo Script:**
  - [ ] Act 1: Tajik voice query + entrance sign $\rightarrow$ instant Tajik speech response
  - [ ] Act 2: Paper detour notice $\rightarrow$ MongoDB Atlas RAG advice
  - [ ] Act 3: Turnstile detection $\rightarrow$ Nessie reload $\rightarrow$ Photon iMessage blue bubble drops down

---

## 📋 Phase 5: Production Deployment & MLH Prizes
- [ ] Deploy backend container to **DigitalOcean** (Droplet / App Platform in NYC)
- [ ] Link domain **`livelens.tech`** (MLH Best .Tech Domain)
- [ ] Record backup 60-second video demo in case of venue Wi-Fi failure
