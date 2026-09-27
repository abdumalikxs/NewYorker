import logging
import httpx
from typing import AsyncGenerator, Optional
from app.config import settings


logger = logging.getLogger(__name__)


class ElevenLabsService:
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.voice_id = settings.ELEVENLABS_VOICE_ID

    async def generate_tts_audio(self, text: str) -> Optional[bytes]:
        """
        Generates full synthesized MP3 audio for low-latency, glitch-free audio playback.
        """
        if not self.api_key:
            return None

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}?optimize_streaming_latency=3"
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }
        payload = {
            "text": text,
            "model_id": "eleven_flash_v2_5",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    return res.content
                logger.error(f"ElevenLabs TTS error {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Error calling ElevenLabs: {e}")
        return None

    async def stream_tts(self, text: str) -> AsyncGenerator[bytes, None]:
        """
        Streams audio chunks from ElevenLabs TTS API.
        """
        if not self.api_key:
            return

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}/stream"
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        logger.error(f"ElevenLabs error status {response.status_code}")
                        return
                    async for chunk in response.aiter_bytes():
                        yield chunk
        except Exception as e:
            logger.error(f"Error streaming from ElevenLabs: {e}")



elevenlabs_service = ElevenLabsService()
