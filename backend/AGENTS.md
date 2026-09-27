# Backend — Agent Instructions

This is the FastAPI streaming and visual state orchestration service for **LiveLens**. Read [../AGENTS.md](../AGENTS.md) first — universal repo rules and dependencies live there. This file defines backend-specific conventions, streaming patterns, and architecture rules.

---

## Stack

- **Runtime:** Python 3.12+
- **Framework:** FastAPI + `uvicorn` (with `uvloop` for high-throughput async WebSockets)
- **Settings & Validation:** Pydantic v2 + `pydantic-settings`
- **HTTP Client:** `httpx` (async client for Nessie & Photon REST APIs)
- **WebSocket Client:** `websockets` (for outbound ElevenLabs streaming TTS pipe)
- **Vision & Multimodal AI:** `google-genai` official SDK (`gemini-2.0-flash`)
- **Database & Retrieval:** MongoDB Atlas via `motor` (async driver) + Atlas Vector Search
- **Voice Synthesis:** ElevenLabs Multilingual Streaming WebSocket API
- **Financial Infrastructure:** Capital One Nessie API
- **iMessage Delivery:** Photon Spectrum SDK
- **Testing:** `pytest` + `pytest-asyncio` + `httpx`
- **Package & Env Manager:** `uv`

---

## Layout

```text
backend/
├── app/
│   ├── main.py          # FastAPI entrypoint, lifecycle, and WebSocket routing
│   ├── config.py        # Pydantic Settings — single source of truth for env
│   ├── agents/          # Multimodal state loop & tool calling
│   │   ├── orchestrator.py # Rolling visual state buffer + event multiplexer
│   │   └── tools.py        # Gemini function declarations (Nessie, Photon, MTA)
│   ├── services/        # External integrations & API clients
│   │   ├── gemini.py       # Gemini 2.0 Flash multimodal video & prompt pipeline
│   │   ├── elevenlabs.py   # ElevenLabs WebSocket streaming TTS connection
│   │   ├── nessie.py       # Capital One Nessie API client (balances & transfers)
│   │   ├── photon.py       # Photon Spectrum SDK client (native iMessage alerts)
│   │   └── mongo.py        # MongoDB Atlas async client & vector search
│   └── models/          # Pydantic schemas (frames, events, session state, payloads)
│       └── schemas.py
├── tests/
│   ├── conftest.py      # Fixtures, test client, and mocked providers
│   ├── test_orchestrator.py
│   ├── test_tools.py
│   └── test_services.py
├── pyproject.toml
└── Dockerfile
```

---

## Dependency Policy

See universal policy in [../AGENTS.md](../AGENTS.md). Backend-specific:

- **Prefer stdlib:** `asyncio`, `pathlib`, `datetime`, `uuid`, `enum`, `collections` (`deque` for FIFO frame buffer), `itertools`, `json`, `typing`.
- **Not OK without justification:** Heavy agent abstractions (e.g. LangChain, CrewAI, AutoGen) that add latency and obscure the direct WebSocket pipe. Direct Gemini tool declarations are faster and more deterministic.
- Dev deps: keep fast and lightweight (`pytest`, `pytest-asyncio`, `ruff`).

---

## Configuration

- `app.config.settings` is the **single source of truth**. Import `settings` where needed; never call `os.getenv` in application logic, never call `load_dotenv`.
- All required keys (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `NESSIE_API_KEY`, `PHOTON_API_KEY`, `MONGODB_URI`) must fail fast on startup with human-readable error messages if absent.
- Default sensible non-secret values for local development (e.g., `PORT=8000`, `ENVIRONMENT="development"`).

---

## Streaming & Concurrency Rules

1. **Async-First:** Every route handler and service I/O method must be `async def`. Never run blocking synchronous network I/O or time-consuming operations directly on the main event loop.
2. **Token-to-Speech Streaming:**
   - As Gemini emits text tokens, pipe them immediately into the ElevenLabs WebSocket stream.
   - Do NOT accumulate the entire response string before starting speech synthesis; doing so violates the <800ms latency budget.
3. **Rolling Visual State Buffer:**
   - Maintain visual context in an in-memory `deque(maxlen=10)` within `orchestrator.py`.
   - Store incoming compressed frames alongside extracted spatial tags, detected signs, and timestamps.
4. **Binary & WebSocket Efficiency:**
   - Accept binary JPEG frames or compact payloads.
   - Keep heartbeat pings non-blocking so video ingestion does not starve the voice synthesis pipe.

---

## Database & Vector Search (MongoDB Atlas)

- Use `motor.motor_asyncio.AsyncIOMotorClient` managed via FastAPI lifespan context (`app.state.mongo_client`).
- Station POI search and transit alert retrieval must use MongoDB Atlas `$vectorSearch` aggregations or indexed key lookups.
- Session logs are committed asynchronously so write latency never blocks the live user audio playback.

---

## Tests

- **Prefer fast unit tests over live network calls:** Mock external APIs (Gemini, ElevenLabs, Nessie, Photon) at the service boundary.
- Fast test suite (`pytest -m "not integration"`) must pass in <3 seconds without hitting third-party APIs.
- Integration tests requiring live keys must be marked with `@pytest.mark.integration`.
- Test coverage must prioritize:
  1. WebSocket framing and connection lifecycle.
  2. Gemini tool call parsing and argument validation.
  3. Nessie balance check and transfer logic.
  4. Photon payload dispatch.

---

## Anti-Patterns (Rejected)

- Calling `os.getenv` or `load_dotenv` inside service modules.
- Introducing multi-layered generic agent frameworks that introduce hundreds of milliseconds of overhead.
- Buffering audio or text until stream completion before forwarding to client.
- Catching bare `Exception` to print and re-raise without context.
- Storing uncompressed raw high-resolution video frames permanently to disk.
- Silent fallbacks when third-party APIs fail; log explicitly and return a structured degradation event to the client.
