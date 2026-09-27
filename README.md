# New Yorker 👁️🎙️

> **Real-time, hands-free spatial AI companion that watches live video, interprets physical environments with rolling visual context, and executes agentic actions across 30+ languages.**

New Yorker transforms multimodal AI from passive snapshot analysis into an active, hands-free urban navigator. By combining continuous low-latency camera sampling, visual memory state tracking, natural multilingual voice feedback, and native iMessage integration, New Yorker eliminates "app fatigue" and language barriers for immigrants, tourists, and visually impaired transit riders.

---

## 🏆 Hackathon Tracks & Sponsor Alignment

New Yorker is engineered specifically to target and maximize judge scoring across the following hackathon prize tracks:

| Track / Sponsor | Prize Category | How New Yorker Integrates |
| :--- | :--- | :--- |
| **Capital One** | **Best Use of Nessie** | Autonomous **Agentic Transit Budgeting & Micropayments**: Queries customer account balances via Nessie API before fare gates, automates OMNY/transit card top-ups, audits daily commuter spend against budget goals, and alerts users of fare eligibility/discounts. |
| **Google Cloud / MLH** | **Best Use of Gemini API** | Continuous multimodal frame processing, spatial awareness, street sign/transit advisory translation, and dynamic intent extraction from live video streams. |
| **ElevenLabs [MLH]** | **Best Use of ElevenLabs** | Streaming conversational TTS via low-latency WebSockets (<800ms end-to-end), delivering natural voice navigation in 30+ native languages (e.g., Tajik, Spanish, Japanese, English). |
| **Photon** | **Agents in iMessage using Photon** | Dispatches real-world actions directly to the user's native Messages app using the **Photon Spectrum SDK**—sending formatted turn-by-turn route guides, subway detour warnings, and offline cards as native blue bubbles. |
| **MongoDB [MLH]** | **Best Use of MongoDB Atlas** | Stores rolling visual session memory, vector embeddings for localized transit points-of-interest (POIs), station maps, and cached real-time MTA alerts with Atlas Vector Search. |
| **DigitalOcean [MLH]** | **Best Use of DigitalOcean** | Production hosting of the FastAPI visual state engine and WebSocket stream orchestrator via DigitalOcean App Platform & Droplet compute. |
| **.Tech Domains [MLH]** | **Best .Tech Domain Name** | Configured and live under `livelens.tech` for the web app frontend and API gateway. |
| **Cursor** | **Best Use of Cursor** | Built end to end in Cursor: agent-driven implementation of the streaming WebSocket pipeline, Gemini tool definitions, and the React HUD, with live on-device debugging of latency and iPad audio routing. |
| **SpaceX** | **Best Real-Time Systems Engineering** | A hard latency budget treated like flight software: continuous camera telemetry, a rolling visual state machine, and a sub-second perception-to-voice loop with graceful degradation when any upstream service stalls. |

---

## 🎯 The Problem & Value Proposition

- **App Fatigue in the Wild:** Modern transit apps require constant typing, reading, and switching between mapping, translation, and transit agency apps.
- **Multimodal Gap:** Standard LLM wrappers only handle single photo uploads. They lack a **rolling visual state**—failing to remember that you just passed the turnstile when you look down at a platform sign 15 seconds later.
- **Accessibility & Language Barriers:** Over 25 million non-English proficient citizens and millions of visually impaired travelers face confusing, printed detour notices, broken escalator signs, and complex transit hubs daily.

**New Yorker bridges this gap:** Point your camera, speak naturally in any language, hear instant directional audio in your ear, and get actionable offline itineraries texted straight to your iMessage.

---

## ⚡ Demo Workflow & System Execution

| Stage | User Action | System Perception & Tool Execution | Output & User Experience |
| :--- | :--- | :--- | :--- |
| **1. Intent & Language Trigger** | User speaks native language (e.g., Tajik) while pointing phone at a subway entrance. | **Gemini API** extracts spatial intent (*navigate to Columbia University*) and identifies the station entrance from live video feed. | **ElevenLabs** streams audio in natural Tajik in <800ms: *"Ин даромадгоҳи қатори 1 мебошад. Ба поён фуроед ва аломатҳои сурхро пайгирӣ кунед."* |
| **2. Contextual Orientation** | User points camera at platform signs, track numbers, or paper detour printouts. | **FastAPI State Engine** compares frames against rolling visual memory; queries **MongoDB Atlas** for station layout and live MTA service disruptions. | Live audio confirms correct platform positioning and announces incoming train ETA while warning of weekend track reroutes. |
| **3. Real-World Action** | User asks: *"Text me the full transfer guide so I don't lose my way."* | **Photon Spectrum SDK** receives structured itinerary payload from agent tool call and dispatches an interactive route card. | User/Judge instantly receives a formatted **blue-bubble iMessage** notification on their phone for offline reference. |

---

## 🏗️ Architecture

```text
                         ┌──────────────────────────────────────────────┐
                         │      React + Vite Frontend (SPA + PWA)       │
                         │   • Camera Video Streamer (WebRTC/Canvas)    │
                         │   • Audio Capture & Streaming Player         │
                         └──────────────────────┬───────────────────────┘
                                                │
                                       WebSockets / REST
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │      FastAPI Visual State Orchestrator       │
                         │   • Rolling Visual Context Buffer            │
                         │   • Multimodal Prompt & Tool Pipeline        │
                         └──────┬──────────────┬──────────────┬─────────┘
                                │              │              │
    ┌───────────────────────────┴───┐    ┌─────┴──────────┐   └───────────────────────────┐
    ▼                               ▼    ▼                ▼                               ▼
Gemini API                     ElevenLabs  MongoDB Atlas    Photon SDK              DigitalOcean
Multimodal Vision & Intent    Streaming   Atlas Vector     Native iMessage Agent   App Platform /
(Low-latency Video Frames)     TTS Voice  Search & POIs    Itinerary Dispatch      Droplet Hosting
```

---

## 🛠️ Stack

| Layer | Choice | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) + TypeScript + Tailwind CSS | Responsive mobile camera view, real-time audio visualizer, low-latency WebSocket client |
| **Backend** | Python 3.12+ & FastAPI | Async orchestrator managing video frame ingestion, LLM tool dispatch, and streaming voice pipes |
| **Vision & Reasoning** | Google Gemini API (`gemini-2.0-flash` / `gemini-1.5-pro`) | Real-time multimodal understanding, OCR on transit signage, language detection, and agentic tool calls |
| **Voice & Speech** | ElevenLabs Streaming WebSocket API | Sub-second ultra-low latency voice synthesis in 30+ world languages |
| **Financial Agent** | Capital One Nessie API | Proactive fare budgeting, automated OMNY transit reload checks, and account balance verification before turnstiles |
| **Messaging Agent** | Photon Spectrum SDK | Direct dispatch of rich transit cards and route guides to native iOS iMessage |
| **Database & Vector Search**| MongoDB Atlas | Visual session memory persistence, transit alert embeddings, and station POI search |
| **Cloud Hosting** | DigitalOcean | Production deployment of FastAPI container and static React build |
| **Domain** | Namecheap / MLH .Tech | `livelens.tech` custom domain setup |

---

## 📂 Repo Layout

```text
NewYorker/
├── README.md               # Project documentation & hackathon submission brief
├── docker-compose.yml      # Local orchestration for dev/testing
├── backend/                # FastAPI Visual State & Agent Service
│   ├── app/
│   │   ├── main.py         # FastAPI application entry & WebSocket routes
│   │   ├── config.py       # Pydantic environment settings
│   │   ├── agents/
│   │   │   ├── orchestrator.py # Rolling visual state engine & loop
│   │   │   └── tools.py        # Gemini tool calling (iMessage, MTA, POIs)
│   │   ├── services/
│   │   │   ├── gemini.py       # Gemini API client (Vision + Multimodal)
│   │   │   ├── elevenlabs.py   # ElevenLabs WebSocket streaming TTS
│   │   │   ├── nessie.py       # Capital One Nessie API client (Balances & Transfers)
│   │   │   ├── photon.py       # Photon SDK iMessage dispatcher
│   │   │   └── mongo.py        # MongoDB Atlas client & vector retrieval
│   │   └── models/
│   │       └── schemas.py      # Pydantic schemas (Frames, Session, Messages)
│   ├── pyproject.toml      # Python dependencies (managed via uv)
│   └── Dockerfile
└── frontend/               # React + Vite Mobile-First Web Application
    ├── src/
    │   ├── components/
    │   │   ├── CameraView.tsx  # Live video capture & canvas frame sampler
    │   │   ├── AudioStream.tsx # Real-time ElevenLabs audio playback
    │   │   ├── Transcript.tsx  # Live bilingual subtitle overlay
    │   │   └── ActionCard.tsx  # Visual confirmation of iMessage triggers
    │   ├── hooks/
    │   │   └── useLiveLens.ts  # Dual WebSocket connection management
    │   ├── App.tsx             # Main layout & controls
    │   └── main.tsx
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.js
```

---

## 📋 Prerequisites

Install the following tools before running locally:

| Tool | Recommended Version | Used For | Installation |
| :--- | :--- | :--- | :--- |
| **Python** | `3.12+` | Backend runtime | [python.org](https://www.python.org/) or OS package manager |
| **uv** | Latest | Fast Python package management | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **Node.js** | `20+` (LTS) | Frontend runtime | [nodejs.org](https://nodejs.org/) or `nvm` |
| **pnpm** or **npm** | Latest | Frontend package manager | `corepack enable` or `npm install -g pnpm` |

### Required API Keys

Create a `.env` file in `backend/` containing:

```env
# Gemini API (Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM # or preferred multilingual voice

# Capital One Nessie API
NESSIE_API_KEY=your_capital_one_nessie_api_key
NESSIE_CUSTOMER_ID=your_nessie_customer_id

# Photon Spectrum (iMessage Agent)
PHOTON_API_KEY=your_photon_api_key

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=livelens

# Environment
ENVIRONMENT=development
PORT=8000
```

---

## 🚀 Running Locally

Detailed setup guides:
- [Backend Setup Guide](docs/guides/backend-setup.md) — Python 3.12, `uv`, WebSockets, and Docker
- [Frontend Setup Guide](docs/guides/frontend-setup.md) — React, Vite, camera streaming, and mobile HTTPS testing
- [Sponsor APIs & Credentials Guide](docs/guides/sponsor-integrations-setup.md) — Gemini, ElevenLabs, Nessie, Photon, MongoDB Atlas, and DigitalOcean
- [Full Technical Architecture](docs/architecture.md) — System design, sequence diagram, and latency budget
- [Product Brief & Demo Script](docs/project-brief.md) — 3-minute live judging script

### 1. Backend Setup (FastAPI)

```bash
cd backend

# Create virtual environment and install dependencies with uv
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt  # Or: uv sync

# Start development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

FastAPI server runs at `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.

### 2. Frontend Setup (React + Vite)

```bash
cd frontend

# Install dependencies
pnpm install # or npm install

# Start Vite dev server with HTTPS/tunnel for mobile camera testing
pnpm dev
```

Frontend runs at `http://localhost:5173`.

> **Tip for Mobile Testing on Stage:** Use [ngrok](https://ngrok.com/) or Cloudflare Tunnels (`cloudflared tunnel`) to test camera permissions directly from an iPhone or Android phone on the same network!

---

## 🌟 Judge Rubric Highlights

- **Live Stage "Wow" Factor:** No static slides or mockups. A working live demonstration with live phone camera feed, real-time spatial vision translation in another language, and an instant audible voice response in <800ms.
- **Real-World Accessibility Impact:** Provides immediate utility for immigrants, tourists, and visually impaired individuals navigating foreign transit networks with confusing paper signage.
- **Deep Sponsor Cohesion:** Every sponsor technology occupies a vital role in the pipeline (Gemini = eyes & brain, ElevenLabs = voice, MongoDB Atlas = spatial memory, Photon = native iMessage actions, DigitalOcean = hosting).
