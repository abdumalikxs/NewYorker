from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class VideoFramePayload(BaseModel):
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())
    image_base64: str
    format: str = "jpeg"


class AudioChunkPayload(BaseModel):
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())
    audio_base64: str


class TranscriptEvent(BaseModel):
    speaker: str  # "user" | "copilot"
    text: str
    language: str = "en"
    is_final: bool = True
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())


class ActionCardEvent(BaseModel):
    type: str  # "imessage" | "nessie" | "transit_alert"
    title: str
    details: str
    status: str = "success"  # "success" | "pending" | "warning"
    payload: Optional[Dict[str, Any]] = None
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())


class VisualStateCheckpoint(BaseModel):
    timestamp: float
    scene_summary: str
    detected_signs: List[str] = Field(default_factory=list)
    active_intent: Optional[str] = None
    target_destination: Optional[str] = None


class ItineraryPayload(BaseModel):
    destination: str
    transit_line: str
    platform_direction: str
    steps: List[str]
    detour_warning: Optional[str] = None
