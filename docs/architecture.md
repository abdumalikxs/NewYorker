# LiveLens Technical Architecture

This document provides a comprehensive technical breakdown of the **LiveLens** spatial AI engine, detailing system design principles, data flow pipelines, multimodal state management, sponsor integrations, latency budgets, and deployment topology.

---

## 1. System Vision & Architecture Philosophy

LiveLens is designed as a **real-time spatial streaming copilot**. Unlike standard conversational LLM applications that rely on request-response turn-taking and single photo uploads, LiveLens operates on **continuous perceptual streaming**:

1. **Sub-Second Feedback Loop (<800ms):** Users navigating fast-paced transit environments (such as subway stations and street crossings) cannot wait 4–5 seconds for an LLM response. Visual understanding and voice synthesis must stream continuously.
2. **Rolling Visual Memory (Temporal Context):** Real-world navigation requires sequence awareness:
   $$\text{Street Entrance} \longrightarrow \text{Turnstile} \longrightarrow \text{Mezzanine} \longrightarrow \text{Platform} \longrightarrow \text{Train Carriage}$$
   Treating each frame as an isolated snapshot causes hallucination and disorientation. LiveLens preserves a rolling short-term visual state buffer.
3. **Hands-Free Ambient Multimodality:** Audio in, video in, natural multilingual speech out, and asynchronous native notifications (iMessage) dispatched automatically via agentic tool calling.

---

## 2. High-Level System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT TIER (React + Vite SPA)                       │
│                                                                                │
│   ┌─────────────────────┐   ┌──────────────────────┐   ┌───────────────────┐   │
│   │ Video Camera Stream │   │  Microphone Ingest   │   │  Audio Playback   │   │
│   │ (MediaStream API)   │   │ (AudioWorklet / PCM) │   │ (Web Audio Node)  │   │
│   └──────────┬──────────┘   └──────────┬───────────┘   └─────────▲─────────┘   │
└──────────────┼─────────────────────────┼─────────────────────────┼─────────────┘
               │ Base64/JPEG (1-2 FPS)   │ PCM Audio (16kHz)       │ Audio Chunks
               ▼                         ▼                         │
┌──────────────────────────────────────────────────────────────────┴─────────────┐
│                    BACKEND ORCHESTRATION (FastAPI on DigitalOcean)             │
│                                                                                │
│   ┌────────────────────────────────────────────────────────────────────────┐   │
│   │                      WebSocket Session Router                          │   │
│   │             (/ws/session/{session_id}/stream)                          │   │
│   └──────────┬─────────────────────────┬─────────────────────────┬─────────┘   │
│              │                         │                         │             │
│              ▼                         ▼                         ▼             │
│   ┌─────────────────────┐   ┌──────────────────────┐   ┌───────────────────┐   │
│   │ Rolling Visual State│   │  Spatial Reasoning   │   │ Voice Streamer    │   │
│   │ Memory Buffer (FIFO)│   │  & Agent Controller  │   │ (Chunk Multiplex) │   │
│   └──────────┬──────────┘   └──────────┬───────────┘   └─────────▲─────────┘   │
└──────────────┼─────────────────────────┼─────────────────────────┼─────────────┘
               │                         │                         │
       Vector Context & Alert            │ Tool Calls & Prompts    │ Streamed
       Lookups                           │                         │ Text Chunks
               │                         ▼                         │
┌──────────────┴──────────┐   ┌──────────────────────┐   ┌─────────┴─────────┐
│      MongoDB Atlas      │   │    Google Gemini     │   │    ElevenLabs     │
│   • Transit Alerts RAG  │   │  (gemini-2.0-flash)  │   │  (WebSocket TTS)  │
│   • Visual State Vector │   │  • Vision & OCR      │   │  • 30+ Languages  │
│   • Station POI Index   │   │  • Intent Reasoning  │   │  • Sub-800ms Voice│
│                         │   │  • Tool Execution    │   │                   │
└─────────────────────────┘   └──────────┬───────────┘   └───────────────────┘
                                         │
                                         │ Dispatches structured itinerary
                                         ▼
                              ┌──────────────────────┐
                              │  Photon Spectrum SDK │
                              │  Native iMessage iOS │
                              │  Blue-Bubble Alerts  │
                              └──────────────────────┘
```

---

## 3. Core Component Breakdown

### 3.1 Client Layer: React + Vite + TypeScript (Mobile-First)

The frontend is engineered as a zero-friction, progressive web app optimized for mobile viewports (iOS Safari and Android Chrome):

- **Camera Pipeline:** Uses the `MediaDevices.getUserMedia()` API targeting the back camera (`facingMode: "environment"`). An off-screen HTML5 `<canvas>` samples frames adaptively at 1–2 FPS in JPEG format (85% compression) to minimize network overhead while preserving OCR readability.
- **Audio Worklet Engine:** Records voice activity (VAD) and streams raw 16kHz PCM audio buffers over the persistent WebSocket connection.
- **Audio Synthesis Player:** Receives raw binary audio chunks streamed directly from the backend, decoding on the fly using the Web Audio API (`AudioContext`) with jitter-buffer protection.
- **Overlay HUD:** Renders bilingual live subtitles, transit indicators (route icons, direction arrows), and instant action cards showing dispatched iMessage alerts.

### 3.2 Backend Orchestrator: FastAPI & Python 3.12

FastAPI provides an asynchronous, high-throughput gateway deployed via `uvicorn` and `uvloop`:

- **WebSocket Connection Multiplexer:** Handles bidirectional streaming of video frames, speech audio, and command events per active user session.
- **Rolling Visual State Buffer:** Maintains the last $N$ visual checkpoints in an in-memory ring buffer (timestamp, detected objects, recognized text/signs, and spatial orientation).
- **Agentic Tool Dispatcher:** Evaluates Gemini function calls to trigger downstream services (MTA alert lookup, station POI vector search, and Photon iMessage delivery).

---

## 4. Deep-Dive: Sponsor Integrations & Execution

### 4.1 Gemini API (Multimodal Vision & Real-Time Intent)
*Track: Best Use of Gemini API [MLH]*

LiveLens leverages **Gemini 2.0 Flash / Gemini 1.5 Pro** via Google's high-speed API:
- **Multimodal Video Input:** Ingests live sampled frames interleaved with user audio transcription or text prompts.
- **Signage OCR & Scene Semantic Extraction:** Identifies hard-to-read paper notices, track numbers, and transit maps in low-light subway stations.
- **Dynamic Tool Calling:** Emits structured function calls when user intent requires action:
  ```json
  {
    "name": "dispatch_imessage_itinerary",
    "description": "Send turn-by-turn subway directions and warning details to the user's phone via iMessage",
    "parameters": {
      "type": "object",
      "properties": {
        "destination": { "type": "string" },
        "transit_line": { "type": "string" },
        "platform_direction": { "type": "string" },
        "detour_warnings": { "type": "string" },
        "step_instructions": {
          "type": "array",
          "items": { "type": "string" }
        }
      },
      "required": ["destination", "transit_line", "step_instructions"]
    }
  }
  ```

### 4.2 ElevenLabs (Sub-800ms Multilingual Voice Pipe)
*Track: Best Use of ElevenLabs [MLH]*

- **Bidirectional Streaming WebSockets:** Rather than waiting for full LLM responses, LiveLens streams Gemini text tokens into the ElevenLabs WebSocket endpoint (`wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input`).
- **Language Adaptability:** Supports over 30 languages (including Tajik, Uzbek, Spanish, Mandarin, French, Arabic, and English) using ElevenLabs Multilingual models with natural local inflections and prosody.
- **Low First-Byte Latency:** Delivers initial synthesized audio buffers within ~250–350ms of text emission, enabling an end-to-end user experience of under 800ms.

### 4.3 Photon Spectrum SDK (Native iMessage Agent)
*Track: Agents in iMessage using Photon [Photon]*

- **Zero App Switching:** While the user's hands are busy holding bags or subway railings, they don't need to switch apps to save directions.
- **Rich iOS Messages Dispatch:** The agent tool triggers the Photon Spectrum API to dispatch a native blue-bubble iMessage containing:
  1. Route summary and step-by-step guidance.
  2. Platform and track reminders.
  3. Offline fallback cards for when subterranean cellular connection drops.

### 4.4 Capital One Nessie API (Autonomous Transit Budgeting Agent)
*Track: Best Use of Nessie [Capital One]*

LiveLens embeds a proactive financial copilot agent powered by the **Capital One Nessie API**:
- **Turnstile Balance Verification:** As the user approaches an OMNY or subway turnstile (detected via Gemini's visual state engine), the agent queries the customer's checking/prepaid account balance (`GET /accounts/{id}`).
- **Smart Fare Reload & Transfer Optimization:** If the balance is insufficient for the upcoming fare ($2.90 for standard NYC transit), the agent triggers an automated micro-transfer (`POST /accounts/{id}/transfers`) or alerts the commuter before they reach the gate.
- **Commuter Budget Tracking:** Aggregates daily urban transport expenditures, automatically categorizing fares and notifying the commuter via voice and iMessage if they qualify for fare-capping or fare discounts.

### 4.5 MongoDB Atlas (Vector Search & Visual State Store)
*Track: Best Use of MongoDB Atlas [MLH]*

- **Atlas Vector Search:** Station maps, exit configurations, and historical transit signage are vectorized and indexed.
- **Dynamic RAG Pipeline:** When Gemini detects a station name (e.g., "116 St - Columbia University"), the backend performs a vector search against MongoDB Atlas to retrieve current elevator status, platform layouts, and verified transfer paths.
- **Session Audit & Memory:** Stores the rolling session logs and detected scene metadata in a `sessions` collection for continuity across navigation handoffs.

### 4.6 DigitalOcean (Scalable Cloud Infrastructure)
*Track: Best Use of DigitalOcean [MLH]*

- **DigitalOcean App Platform / Droplets:** Hosts the containerized FastAPI backend with automatic HTTPS termination and persistent WebSocket connections.
- **Predictable Latency:** Deployed in the NYC region (`nyc3`) adjacent to East Coast transit infrastructure and low-latency API hops.

---

## 5. Sequence Diagram: Real-Time Stream & Tool Execution

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Tajik Speaker)
    participant Client as React Client (Camera + Mic)
    participant Server as FastAPI Orchestrator
    participant Mongo as MongoDB Atlas (RAG / Cache)
    participant Gemini as Gemini 2.0 API (Multimodal)
    participant Eleven as ElevenLabs (Streaming TTS)
    participant Photon as Photon SDK (iMessage)

    User->>Client: Speaks Tajik ("Ба Колумбия чӣ тавр равам?") + Points Camera
    Client->>Server: WebSocket Stream: Frame (JPEG) + Audio (PCM)
    Server->>Mongo: Query station POIs & active weekend service alerts
    Mongo-->>Server: Return: "1 Train active; Uptown platform via stairs A"
    Server->>Gemini: Stream Frame + Context + User Audio transcript
    Note over Gemini: Analyzes visual entrance sign & extracts navigation intent
    
    par Stream Spoken Audio
        Gemini-->>Server: Token Stream: "Ин даромадгоҳи қатори 1 аст..."
        Server->>Eleven: Stream text tokens to WebSocket
        Eleven-->>Server: Stream binary audio PCM chunks
        Server-->>Client: Forward audio chunks
        Client-->>User: Plays natural voice guidance (<800ms)
    and Trigger Agentic Action
        Gemini->>Server: Tool Call: dispatch_imessage_itinerary(...)
        Server->>Photon: Dispatch formatted route card via Photon API
        Photon-->>User: Native blue-bubble iMessage arrives on iPhone
    end
```

---

## 6. Latency Budget Analysis

To achieve a true "copilot" sensation, the system operates under a strict **800ms target budget** from speech completion to first audio playback:

| Stage | Component | Typical Latency | Notes & Optimization |
| :--- | :--- | :--- | :--- |
| 1. Frame & Audio Sampling | Client Canvas & AudioWorklet | 40ms | Hardware-accelerated Canvas 2D capture |
| 2. Network Ingest | WebSocket to DigitalOcean NYC | 35ms | Binary WebSocket framing |
| 3. Transit Context Lookup | MongoDB Atlas Vector Search | 45ms | Indexed in-region query |
| 4. Multimodal Reasoning | Gemini 2.0 Flash | 320ms | Flash model token generation |
| 5. Speech Synthesis (TTFB) | ElevenLabs WebSocket TTS | 220ms | Streaming input chunking |
| 6. Audio Playback Ingestion | Client Web Audio API | 50ms | Immediate buffer queuing |
| **Total End-to-End** | **LiveLens Pipeline** | **~710ms** | **Comfortably under the 800ms threshold** |

---

## 7. Security, Privacy & Edge Safeguards

1. **Transient Video Buffers:** Raw video frames are processed in-memory in a FIFO buffer and are not written to persistent disk storage, safeguarding commuter privacy.
2. **Ephemeral Session Tokens:** All WebSocket connections require temporary signed session tokens generated on initial handshakes.
3. **Graceful Subterranean Degradation:** If cellular connectivity drops underground, the last known visual state and route instructions are already committed to the user's native iMessage through Photon for offline survival.
