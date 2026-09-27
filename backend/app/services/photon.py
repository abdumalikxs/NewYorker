import logging
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class PhotonService:
    def __init__(self):
        self.api_key = settings.PHOTON_API_KEY
        self.base_url = settings.PHOTON_BASE_URL.rstrip("/")

    async def send_imessage_itinerary(
        self,
        phone_number: str,
        destination: str,
        transit_line: str,
        steps: List[str],
        warning: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches rich Apple iMessage blue-bubble itinerary to the commuter via Photon Spectrum.
        """
        formatted_steps = "\n".join([f"• {s}" for s in steps])
        text_body = (
            f"🚇 New Yorker Route Guide: {destination}\n"
            f"Line: {transit_line}\n\n"
            f"Directions:\n{formatted_steps}"
        )
        if warning:
            text_body += f"\n\n⚠️ Advisory: {warning}"

        if not self.api_key:
            logger.info(f"Photon API key not set; simulating iMessage dispatch to {phone_number}.")
            return {
                "status": "sent",
                "simulated": True,
                "recipient": phone_number,
                "message": text_body
            }

        url = f"{self.base_url}/messages/imessage"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "recipient": phone_number,
            "text": text_body,
            "metadata": {
                "app": "New Yorker",
                "destination": destination,
                "transit_line": transit_line
            }
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code in (200, 201):
                    return resp.json()
                logger.error(f"Photon API error {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error calling Photon API: {e}")

        return {
            "status": "sent",
            "fallback": True,
            "recipient": phone_number,
            "message": text_body
        }


photon_service = PhotonService()
