import asyncio
import logging
from typing import AsyncGenerator, Dict, Any, List, Optional
from google import genai
from google.genai import types
from app.config import settings

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    async def analyze_frame_and_speech(
        self,
        image_bytes: bytes,
        user_prompt: str,
        rolling_context: List[str],
        tools: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze current live video frame combined with user speech and rolling visual memory.
        Extracts spatial orientation, intent, and triggers tools if needed.
        """
        if not self.client:
            logger.warning("Gemini client not initialized (missing API key). Using mock response.")
            return {
                "text": "This is the 1 train entrance. Walk down and follow the red Uptown signs.",
                "language": "en",
                "tool_calls": []
            }

        context_prompt = (
            "You are J.A.R.V.I.S., the real-time multimodal AI assistant behind New Yorker, a spatial copilot for New York City. "
            "You have direct visual access to the user's camera feed and their voice/text messages. "
            "You have access to the following AGENT TOOLS: "
            "- check_bank_balance: call whenever the user asks for their bank balance, account balance, money, or funds. "
            "- deposit_money: call whenever the user wants to deposit or add money to their Capital One account. "
            "- pay_with_card: call whenever the user wants to pay, tap their card, or pay for subway turnstiles/transit/purchases. "
            "- clear_mission_plan(): call whenever the user says 'clean the plan dashboard', 'clear plan', 'remove plan', or 'wipe dashboard'. "
            "- set_navigation_route: call whenever the user asks to navigate, get directions, set a route, show the map, "
            "  open the map, find a road, or says phrases like 'navigate to X', 'route from A to B', 'set the road from A to B', "
            "  'how do I get to X', 'show me the way to X', 'open the map', 'take me to X'. "
            "  Use mode='transit' for subway/train/bus, mode='walking' for walking, mode='driving' otherwise. "
            "- close_navigation_map(): call whenever the user says 'close map', 'close the map', 'hide map', 'exit map', or 'dismiss map'. "
            "- get_weather_forecast: call whenever the user asks about the weather, temperature, rain, snow, wind, or "
            "  the forecast for a specific hour, e.g. 'what's the weather at 3 pm', 'will it rain tonight'. "
            "IMPORTANT PLANNING RULE: When the user asks you to make a plan, itinerary, or journey (e.g. 'plan from Manhattan to Columbia University', 'plan my day', etc.): "
            "Create a smart, realistic plan with AT MOST 6 concise steps! Output your response in this JSON format: "
            "```json\n"
            "{\n"
            "  \"plan\": {\n"
            "    \"title\": \"Route to Columbia University\",\n"
            "    \"steps\": [\"Step 1\", \"Step 2\", \"Step 3\"]\n"
            "  },\n"
            "  \"speech\": \"Spoken answer explaining the plan concisely to the user in 1-2 conversational sentences.\"\n"
            "}\n"
            "```\n"
            "TRANSIT RULE: For subway, MTA, train, bus, or getting-around questions, answer the question that was asked. "
            "1. If a route or destination is requested, call set_navigation_route with mode='transit'. "
            "2. MTA subway fare is $2.90 per ride with free 2-hour transfers — mention it only when cost is relevant. "
            "3. Do NOT call check_bank_balance or bring up money unless the user actually asks about their balance, "
            "   account, Capital One, funds, or whether they can afford something. Volunteering their balance is annoying. "
            "4. When they DO ask about money, state the balance, how many rides it covers, and compare subway versus a $30+ rideshare. "
            "Help the user with ANYTHING they ask: planning tasks, checking bank balances, managing money, identifying objects, "
            "reading text, analyzing screens, spatial navigation, or casual conversation. "
            "For non-planning questions, provide natural, direct, and concise spoken responses in 1 to 2 conversational sentences. "
            "Respond in whatever language the user speaks to you (Tajik, English, Russian, Uzbek, etc.). "
            f"Recent visual memory: {'; '.join(rolling_context) if rolling_context else 'None'}. "
            f"User message: {user_prompt if user_prompt else 'Look at the camera feed and give a brief observation if something noteworthy is present.'}"
        )



        try:
            contents = []
            if image_bytes and len(image_bytes) > 100:
                image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
                contents.append(image_part)
            contents.append(context_prompt)
            
            response = await asyncio.wait_for(
                self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        tools=tools,
                        temperature=0.2,
                    )
                ),
                timeout=settings.GEMINI_TIMEOUT_SECONDS,
            )



            tool_calls = []
            text_parts = []

            if response.candidates:
                cand = response.candidates[0]
                if cand.content and cand.content.parts:
                    for part in cand.content.parts:
                        # Collect text parts safely
                        if getattr(part, "text", None):
                            text_parts.append(part.text)
                        # Collect function calls from parts
                        if getattr(part, "function_call", None):
                            tool_calls.append({
                                "name": part.function_call.name,
                                "args": dict(part.function_call.args)
                            })
                # Also check top-level function_calls shortcut
                if getattr(cand, "function_calls", None) and not tool_calls:
                    for fn in cand.function_calls:
                        tool_calls.append({"name": fn.name, "args": dict(fn.args)})

            raw_text = " ".join(text_parts).strip()
            # Strip markdown code fences (```json ... ```) that Gemini sometimes wraps around JSON
            import re
            raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text, flags=re.MULTILINE)
            raw_text = re.sub(r'```\s*$', '', raw_text, flags=re.MULTILINE).strip()

            return {
                "text": raw_text,
                "tool_calls": tool_calls
            }
        except asyncio.TimeoutError:
            logger.error(
                f"Gemini did not answer within {settings.GEMINI_TIMEOUT_SECONDS}s; falling back."
            )
            return {"text": "", "tool_calls": [], "timed_out": True}
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            return {
                "text": "",
                "tool_calls": []
            }



gemini_service = GeminiService()
