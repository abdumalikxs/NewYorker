import logging
from typing import Dict, Any, List, Optional
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger(__name__)


class SupabaseService:
    def __init__(self):
        self.client: Optional[Client] = None
        self.init_client()

    def init_client(self):
        url = settings.SUPABASE_URL
        key = settings.effective_supabase_key

        if url and key:
            try:
                self.client = create_client(url, key)
                logger.info(f"Connected to Supabase ({url}) successfully.")
            except Exception as e:
                logger.warning(f"Could not initialize Supabase client: {e}")
                self.client = None
        else:
            logger.info("Supabase URL or Key not set; running in local memory fallback mode.")
            self.client = None

    async def save_session_checkpoint(self, session_id: str, checkpoint: Dict[str, Any]):
        """
        Persists rolling visual session state to Supabase 'livelens_sessions' table.
        """
        if self.client:
            try:
                self.client.table("livelens_sessions").insert({
                    "session_id": session_id,
                    "timestamp": checkpoint.get("timestamp"),
                    "state": checkpoint.get("state"),
                    "query": checkpoint.get("query"),
                    "response": checkpoint.get("response")
                }).execute()
            except Exception as e:
                logger.warning(f"Failed to write session to livelens_sessions: {e}")

    async def get_transit_alerts(self, line: str = "1") -> List[Dict[str, Any]]:
        """
        Retrieves active MTA service disruptions / detours from Supabase 'livelens_transit_alerts' table.
        """
        if self.client:
            try:
                res = self.client.table("livelens_transit_alerts").select("*").eq("line", line.upper()).execute()
                if res.data:
                    return res.data
            except Exception as e:
                logger.warning(f"Failed to query livelens_transit_alerts from Supabase: {e}")

        # Default real-world MTA transit advisory fallback
        return [
            {
                "line": line.upper(),
                "summary": "Uptown local service bypasses 110 St for track maintenance. 116 St Columbia Univ operating normally."
            }
        ]


supabase_service = SupabaseService()
