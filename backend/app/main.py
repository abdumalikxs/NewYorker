import logging
import base64
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.supabase_service import supabase_service
from app.services.elevenlabs import elevenlabs_service
from app.agents.orchestrator import VisualStateOrchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("newyorker.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Supabase client
    supabase_service.init_client()
    logger.info("New Yorker backend initialized with Supabase storage.")
    yield
    logger.info("New Yorker backend shut down gracefully.")


app = FastAPI(
    title="New Yorker API",
    description="NYC spatial AI companion orchestrating Gemini, ElevenLabs TTS, Capital One Nessie, Open-Meteo, Photon, and Supabase",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "name": "New Yorker Spatial AI API",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/api/hello")
async def hello():
    return {
        "message": "Hello New York",
        "status": "healthy"
    }


from fastapi.responses import Response

@app.get("/api/tts")
async def tts_endpoint(text: str = "New Yorker spatial AI copilot online."):
    """
    Direct endpoint returning an MP3 audio stream for testing or instant browser audio playback.
    """
    audio_bytes = await elevenlabs_service.generate_tts_audio(text)
    if not audio_bytes:
        return Response(status_code=500, content="Failed to synthesize speech")
    return Response(content=audio_bytes, media_type="audio/mpeg")


@app.get("/health")
async def health_check():

    return {
        "status": "healthy",
        "message": "Hello New York",
        "service": "newyorker-backend",
        "environment": settings.ENVIRONMENT
    }


@app.websocket("/ws/stream/{session_id}")
async def websocket_stream_endpoint(websocket: WebSocket, session_id: str):
    """
    Main real-time streaming endpoint for camera frames, voice inputs, and audio feedback.
    """
    await websocket.accept()
    orchestrator = VisualStateOrchestrator(session_id=session_id)
    logger.info(f"WebSocket client connected for session {session_id}")

    try:
        frame_seq = 0
        while True:
            data = await websocket.receive_json()
            
            # Handle client heartbeat ping
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong", "timestamp": data.get("timestamp")})
                continue

            frame_seq += 1
            image_base64 = data.get("image", "")
            user_text = data.get("text", "")
            language = data.get("language", "tg")

            logger.info(f"[{session_id}] Frame #{frame_seq} received ({len(image_base64)} chars, text='{user_text}', lang={language})")

            # 1. Process multimodal perception + tools
            result = await orchestrator.process_frame_and_speech(
                image_base64=image_base64,
                user_text=user_text,
                language=language
            )

            response_text = result["response_text"]
            action_cards = result["action_cards"]

            # A spoken question must always get an answer back, even when Gemini
            # stalls or errors. Silence here leaves the HUD stuck on COMPUTING and
            # blocks the next question. Passive frames stay silent by design.
            if user_text.strip() and not response_text and not action_cards:
                response_text = "I didn't catch that one. Say it again?"

            # 2. Emit text transcript and action cards immediately (zero wait time for UI)
            if response_text or action_cards:
                await websocket.send_json({
                    "type": "copilot_response",
                    "frame_seq": frame_seq,
                    "text": response_text,
                    "language": language,
                    "spatial_state": result.get("spatial_state", "STREET_ENTRANCE"),
                    "action_cards": action_cards
                })

            # 3. Stream ElevenLabs audio back to client
            if response_text:
                audio_bytes = await elevenlabs_service.generate_tts_audio(response_text)
                if audio_bytes:
                    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                    await websocket.send_json({
                        "type": "audio_chunk",
                        "audio": audio_b64
                    })



    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"Error handling WebSocket stream for {session_id}: {e}")
