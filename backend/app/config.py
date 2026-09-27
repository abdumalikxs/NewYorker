from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Google Gemini API
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    # Gemini occasionally stalls well past its usual second or two. Giving up keeps
    # the HUD from sitting on COMPUTING forever with no spoken answer.
    GEMINI_TIMEOUT_SECONDS: float = 12.0

    # Google Maps API (used for server-side geocoding / static maps if needed)
    GOOGLE_MAPS_API_KEY: str = ""

    # ElevenLabs API
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"  # Default multilingual voice

    # Capital One Nessie API
    NESSIE_API_KEY: str = ""
    NESSIE_CUSTOMER_ID: str = ""
    NESSIE_BASE_URL: str = "https://api.nessieisreal.com"


    # Photon Spectrum SDK
    PHOTON_API_KEY: str = ""
    PHOTON_BASE_URL: str = "https://api.photon.codes/v1"

    # Supabase (Postgres & Realtime Storage)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    DATABASE_URL: str = ""

    @property
    def effective_supabase_key(self) -> str:
        return self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_KEY or self.SUPABASE_ANON_KEY

    # MongoDB Atlas (Optional fallback)
    MONGODB_URI: str = ""
    MONGODB_DATABASE: str = "livelens"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
