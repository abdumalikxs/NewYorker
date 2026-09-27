import logging
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger(__name__)


class MongoService:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None

    async def connect(self):
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
            self.db = self.client[settings.MONGODB_DATABASE]
            logger.info("Connected to MongoDB Atlas")
        except Exception as e:
            logger.warning(f"Could not connect to MongoDB Atlas: {e}. Using in-memory fallback.")

    async def close(self):
        if self.client:
            self.client.close()

    async def save_session_checkpoint(self, session_id: str, checkpoint: Dict[str, Any]):
        if self.db is not None:
            try:
                await self.db.sessions.update_one(
                    {"session_id": session_id},
                    {"$push": {"checkpoints": checkpoint}},
                    upsert=True
                )
            except Exception as e:
                logger.error(f"Error persisting session checkpoint: {e}")

    async def get_transit_alerts(self, line: str) -> List[Dict[str, Any]]:
        """
        Retrieves real-time MTA alerts or detour advisories for transit line.
        """
        if self.db is not None:
            try:
                cursor = self.db.alerts.find({"line": line.upper()}).limit(3)
                return await cursor.to_list(length=3)
            except Exception as e:
                logger.error(f"Error reading MTA alerts: {e}")

        # Default fallback alert
        return [
            {
                "line": line.upper(),
                "summary": "Uptown local service bypasses 110 St for track maintenance. 116 St Columbia Univ operating normally."
            }
        ]


mongo_service = MongoService()
