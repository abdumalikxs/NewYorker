# Backend Setup Guide

This guide walks through setting up and running the **LiveLens** FastAPI Visual State Orchestrator backend locally, with virtual environments, WebSockets, and environment configuration.

---

## 📋 Prerequisites

Ensure the following tools are installed:

- **Python 3.12+**
- **uv** (recommended for ultra-fast package management):
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- **Docker** (optional, for containerized execution)

---

## ⚙️ Environment Variables

Create a `.env` file inside `backend/`:

```bash
cp backend/.env.example backend/.env
```

Fill in your configuration:

```env
# Application
ENVIRONMENT=development
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]

# Google Gemini API
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash

# ElevenLabs WebSocket TTS
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM # Multilingual voice

# Capital One Nessie API
NESSIE_API_KEY=your_capital_one_nessie_api_key
NESSIE_CUSTOMER_ID=your_nessie_customer_id

# Photon Spectrum SDK (iMessage)
PHOTON_API_KEY=photon_...

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=livelens
```

---

## 🚀 Installation & Local Execution

### Option A: Using `uv` (Recommended)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and sync dependencies:
   ```bash
   uv venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   uv pip install -r requirements.txt
   ```

3. Run the development server with live reload:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Option B: Using Standard Python Virtual Environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔍 Verifying the Service

- **Health Check:** `http://localhost:8000/health`
- **Interactive OpenAPI Documentation (Swagger UI):** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`

---

## 🔌 WebSocket Endpoints

### `/ws/stream/{session_id}`
Bidirectional streaming connection:
- **Client to Server:** Binary JPEG frames (1-2 FPS) + 16kHz PCM audio buffers.
- **Server to Client:** Real-time bilingual transcript tokens, status updates, and raw ElevenLabs audio chunks for immediate playback.

---

## 🐳 Docker Deployment

To build and run the backend locally with Docker:

```bash
docker build -t livelens-backend ./backend
docker run -p 8000:8000 --env-file backend/.env livelens-backend
```
