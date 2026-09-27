import logging
import asyncio
import base64
import json
import re
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from collections import deque
from enum import Enum
from typing import Dict, Any, List, Optional
from app.services.gemini import gemini_service
from app.services.elevenlabs import elevenlabs_service
from app.services.supabase_service import supabase_service
from app.agents.tools import TOOL_FUNCTIONS, execute_tool

logger = logging.getLogger(__name__)

# "Is $42 enough to get to JFK" is a fare question. Bare "enough" is not —
# "okay enough for me to get there" used to false-trigger this.
_FARE_QUESTION = r'\b(afford|enough to (get|go|make|reach|cover|pay)|enough (money|cash|funds|for the (subway|train|bus|fare)))\b'

# Clock questions only. "What time does the train leave" is a schedule, not the clock.
_CLOCK_INTENT = re.compile(
    r"("
    r"\bwhat(?:'s| is) the time\b"
    r"|\bwhat time is it\b"
    r"|\bcurrent time\b"
    r"|\btime right now\b"
    r"|\btell me the time\b"
    r"|\b(?:got|have) the time\b"
    r"|который час|сколько времени|какое сейчас время"
    r")",
    re.IGNORECASE,
)
_NY_TZ = ZoneInfo("America/New_York")
_MONEY_INTENT = (
    r'\b(balance|afford|how much (money|do i have)|my (money|funds|account)|'
    r'capital one|bank account|bank balance|check my account|fare price|'
    r'enough (money|funds|cash|to (afford|pay|cover))|deposit|top ?up|reload)\b'
)


class TransitLocationState(str, Enum):
    UNKNOWN = "UNKNOWN"
    STREET_ENTRANCE = "STREET_ENTRANCE"
    MEZZANINE = "MEZZANINE"
    TURNSTILE = "TURNSTILE"
    PLATFORM = "PLATFORM"
    TRAIN_BOARDED = "TRAIN_BOARDED"


class VisualStateOrchestrator:
    def __init__(self, session_id: str):
        self.session_id = session_id
        # Rolling visual memory: Keep last 10 contextual observations
        self.visual_memory = deque(maxlen=10)
        self.current_state: TransitLocationState = TransitLocationState.UNKNOWN
        self.active_destination: str = "Columbia University (116 St)"
        self.preferred_language: str = "tg"
        self.turnstile_checked: bool = False
        self.imessage_sent: bool = False
        self.last_route: Optional[Dict[str, str]] = None

    def update_visual_memory(self, frame_summary: str, state: TransitLocationState):
        self.current_state = state
        self.visual_memory.append({
            "timestamp": time.time(),
            "summary": frame_summary,
            "state": state.value
        })

    def get_context_list(self) -> List[str]:
        return [f"[{item['state']}] {item['summary']}" for item in self.visual_memory]

    @staticmethod
    def _clock_card(user_text: str) -> Optional[Dict[str, Any]]:
        """Local New York clock. Returns None unless the user actually asked the time."""
        if not user_text or not _CLOCK_INTENT.search(user_text):
            return None
        now = datetime.now(_NY_TZ)
        hour = now.strftime("%I").lstrip("0") or "12"
        clock = f"{hour}:{now.strftime('%M')}"
        period = now.strftime("%p")
        spoken = f"It's {clock} {period} in New York."
        return {
            "response_text": spoken,
            "card": {
                "type": "clock",
                "title": now.strftime("%A, %B %-d"),
                "details": f"{clock} {period}",
                "status": "success",
            },
        }

    @staticmethod
    def _parse_weather_time(text_lower: str) -> tuple[int, str]:
        """Maps spoken time references to a 24-hour clock. Returns (hour, day); hour -1 means 'now'."""
        day = "tomorrow" if "tomorrow" in text_lower else "today"

        # Explicit clock time wins over vague parts of the day: "at 3 pm", "3:30pm", "at 15".
        match = re.search(r'\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)', text_lower)
        if match:
            hour = int(match.group(1)) % 12
            if match.group(3).startswith("p"):
                hour += 12
            return hour, day

        match = re.search(r'\bat\s+(\d{1,2})\b', text_lower)
        if match and 0 <= int(match.group(1)) <= 23:
            return int(match.group(1)), day

        if "midnight" in text_lower:
            return 0, "tomorrow"
        if "noon" in text_lower or "midday" in text_lower:
            return 12, day
        if "tonight" in text_lower:
            return 21, day
        if "morning" in text_lower:
            return 9, day
        if "afternoon" in text_lower:
            return 15, day
        if "evening" in text_lower:
            return 19, day
        # "weather tomorrow" with no hour: midday reads better than 00:00.
        return (12, day) if day == "tomorrow" else (-1, day)

    @staticmethod
    def _parse_weather_location(text_lower: str) -> str:
        match = re.search(
            r'\b(?:in|for|at)\s+([a-z][a-z\s\.\-]{2,40}?)'
            r'(?=\s+(?:at|tomorrow|tonight|today|right now|this|next)\b|[?.!,]|$)',
            text_lower,
        )
        if not match:
            return ""
        candidate = match.group(1).strip()
        # Guard against swallowing time words or bare weather nouns as a place name.
        if re.fullmatch(r'(the\s+)?(morning|afternoon|evening|night|weather|hour|moment|minute|now)s?', candidate):
            return ""
        return candidate.title()

    def _deduce_spatial_state_and_intent(self, user_text: str) -> tuple[TransitLocationState, str, List[Dict[str, Any]]]:
        """
        Detects specific trigger keywords to guarantee prompt tool dispatch if model didn't call functions directly.
        """
        text_lower = user_text.lower()
        forced_tools = []
        state = TransitLocationState.UNKNOWN

        # DESTROY — permanent wipe
        _destroy_kw = [
            "destroy plan", "delete plan", "wipe dashboard", "wipe the dashboard",
            "remove plan", "remove the plan", "clear plan", "clear the plan",
            "clean the plan dashboard", "clean plan", "erase plan", "erase the plan",
        ]
        if any(w in text_lower for w in _destroy_kw):
            forced_tools.append({"name": "clear_mission_plan", "args": {}})
            return state, "Mission plan permanently destroyed and removed from your HUD.", forced_tools

        # HIDE / COLLAPSE — keeps data
        _hide_kw = [
            "close plan", "close the plan", "close planning", "close the planning",
            "close dashboard", "close the dashboard",
            "hide plan", "hide the plan", "hide planning", "hide the planning",
            "collapse plan", "collapse the plan", "collapse dashboard",
            "minimize plan", "minimize the plan", "minimize dashboard",
            "put away the plan", "put away plan",
        ]
        if any(w in text_lower for w in _hide_kw):
            forced_tools.append({"name": "hide_mission_plan", "args": {}})
            return state, "Mission plan dashboard collapsed. Say 'open plan' to restore it.", forced_tools

        # SHOW / REOPEN
        _show_kw = [
            "open plan", "open the plan", "open planning", "open the planning",
            "open dashboard", "open the dashboard",
            "show plan", "show the plan", "show planning", "show the planning",
            "show dashboard", "show the dashboard",
            "bring back plan", "bring back the plan", "bring back dashboard",
            "restore plan", "restore the plan", "reopen plan", "reopen dashboard",
        ]
        if any(w in text_lower for w in _show_kw):
            forced_tools.append({"name": "show_mission_plan", "args": {}})
            return state, "Mission plan dashboard restored to your HUD.", forced_tools

        # Close / Hide Map trigger
        _close_map_kw = [
            "close the map", "close map", "hide the map", "hide map",
            "exit the map", "exit map", "dismiss the map", "dismiss map",
            "shut the map", "shut map", "turn off the map", "turn off map",
            "remove the map", "remove map", "close navigation", "exit navigation",
            "hide navigation", "dismiss navigation"
        ]
        if any(w in text_lower for w in _close_map_kw):
            forced_tools.append({"name": "close_navigation_map", "args": {}})
            return state, "Navigation map closed.", forced_tools

        # "close that weather" is a dismissal, not a new forecast request.
        if re.search(r'\b(close|hide|dismiss|clear|remove)\b.{0,12}\b(weather|forecast|card|cards)\b', text_lower):
            return state, "Clearing that from your HUD.", forced_tools

        # Weather trigger — word boundaries matter here so "train" never reads as "rain".
        if re.search(
            r'\b(weather|forecast|temperature|degrees|humid|humidity|rain|raining|rainy|'
            r'snow|snowing|windy|sunny|cloudy|umbrella|how hot|how cold|how warm)\b',
            text_lower,
        ):
            hour, day = self._parse_weather_time(text_lower)
            forced_tools.append({
                "name": "get_weather_forecast",
                "args": {
                    "location": self._parse_weather_location(text_lower),
                    "hour": hour,
                    "day": day,
                }
            })
            return state, "", forced_tools

        # Planning trigger: only force parse if user already provided explicit numbered items like "1) ... 2) ..."
        if any(w in text_lower for w in ["plan: 1", "1) go", "1. go"]) or ("plan" in text_lower and "1)" in text_lower):
            cleaned = re.sub(r'^(jarvis|hey jarvis|please)?\s*,?\s*(plan my day|make a plan|plan to|plan)\s*:?\s*', '', user_text, flags=re.IGNORECASE).strip()
            raw_parts = re.split(r'(?:\d+[\.\)]\s*|\n+|;\s*)', cleaned)
            steps = [p.strip(" ,.-") for p in raw_parts if p.strip(" ,.-")]
            if steps:
                forced_tools.append({
                    "name": "update_mission_plan",
                    "args": {
                        "title": "Mission Plan",
                        "steps": steps[:6]
                    }
                })
                return state, f"I have locked your mission plan onto your HUD with {len(steps[:6])} steps.", forced_tools

        # Balance on an explicit money ask only. No early return: "check my account and
        # route me to X" is one sentence with two intents, so navigation parsing continues.
        if re.search(_MONEY_INTENT, text_lower):
            forced_tools.append({
                "name": "check_bank_balance",
                "args": {"account_type": "checking"}
            })

        # Transit MTA alert trigger
        elif any(w in text_lower for w in ["mta alert", "transit alert", "train detour", "subway delay"]):
            state = TransitLocationState.MEZZANINE
            forced_tools.append({
                "name": "lookup_transit_alerts",
                "args": {"transit_line": "1"}
            })
            return state, "", forced_tools

        _NAV_KEYWORDS = [
            "navigate to", "navigation to", "directions to", "route to", "take me to",
            "how do i get to", "show route", "get directions",
            "set route", "set a route", "set the route",
            "set road", "set the road", "set a road",
            "find route", "find the route", "find road", "find a route",
            "show me how to get", "show me the way", "show the way",
            "open the map", "open map", "launch map", "show map",
            "show the map", "launch navigation", "open navigation",
            "bring up the map", "bring up map",
            "plan route", "plan the route", "plot route", "plot a route",
            "subway to", "take subway to", "subway route", "subway directions",
            "train to", "take train to", "bus to", "take bus to",
        ]

        is_transit = any(w in text_lower for w in [
            "subway", "train", "bus", "transit", "mta", "metro", "turnstile", "fare", "fares", "omny", "метро"
        ])
        # "Is it enough to get there" is a fare question even when nobody says "subway".
        asks_if_enough = bool(re.search(_FARE_QUESTION, text_lower))
        if asks_if_enough:
            is_transit = True
            if not any(t.get("name") == "check_bank_balance" for t in forced_tools):
                forced_tools.append({
                    "name": "check_bank_balance",
                    "args": {"account_type": "checking"}
                })
        mode = "transit" if is_transit else "driving"

        # ── Shared extraction patterns
        from_to_match = re.search(
            r'from\s+(.+?)\s+to\s+(.+?)(?:\s+(?:by|via|using|on)\s+[\w\s]+)?\s*[.!?]*$',
            text_lower
        )
        # "get to JFK from Columbia" is the same trip, said backwards.
        # The inner group refuses to swallow an earlier "to", so "enough to get to JFK from Columbia"
        # lands on JFK, not on "get to JFK".
        to_from_match = re.search(
            r'\bto\s+(?:the\s+)?((?:(?!\bto\b).)+?)\s+from\s+(.+?)\s*[.!?]*$',
            text_lower
        )
        to_match = re.search(
            r'(?:navigate to|directions to|route to|take me to|'
            r'how do i get to|show route to|get directions to|'
            r'set route to|set a route to|set the route to|'
            r'set road to|set the road to|find route to|find road to|'
            r'show me the way to|show me how to get to|'
            r'bring up map to|plot route to|plan route to|'
            r'subway to|take subway to|subway route to|train to|take train to|bus to)\s+(.+)',
            text_lower
        )

        _ROUTING_CONTEXT = ["road", "route", "map", "subway", "train", "bus", "transit",
                            "way", "path", "directions", "direction", "metro"]

        def _place(raw: str) -> str:
            name = raw.strip().rstrip('.!?,').title()
            for code in ("Jfk", "Lga", "Ewr", "Nyc"):
                name = name.replace(code, code.upper())
            return name

        # Navigation trigger — fires on explicit nav keywords or routing context
        wants_route = (
            any(w in text_lower for w in _NAV_KEYWORDS)
            or any(w in text_lower for w in _ROUTING_CONTEXT)
            or asks_if_enough
        )
        if from_to_match and wants_route:
            origin = _place(from_to_match.group(1))
            dest   = _place(from_to_match.group(2))
            forced_tools.append({
                "name": "set_navigation_route",
                "args": {"origin": origin, "destination_a": dest, "destination_b": "", "mode": mode}
            })
            if is_transit:
                state = TransitLocationState.MEZZANINE
                return state, f"Subway route from {origin} to {dest} is live on your HUD.", forced_tools
            return state, f"Navigation from {origin} to {dest} is live on your HUD.", forced_tools

        if to_from_match and wants_route:
            dest   = _place(to_from_match.group(1))
            origin = _place(to_from_match.group(2))
            forced_tools.append({
                "name": "set_navigation_route",
                "args": {"origin": origin, "destination_a": dest, "destination_b": "", "mode": mode}
            })
            if is_transit:
                state = TransitLocationState.MEZZANINE
                return state, f"Subway route from {origin} to {dest} is live on your HUD.", forced_tools
            return state, f"Navigation from {origin} to {dest} is live on your HUD.", forced_tools

        # "Times Square from Columbia" is the same request with the "to" left off,
        # which is how a paused sentence often arrives. Draw the street unless they
        # asked for the subway.
        bare_from = re.fullmatch(
            r'(?:the\s+)?(.+?)\s+from\s+(.+)',
            text_lower.strip().rstrip('.!?'),
        )
        if bare_from and not to_from_match and len(text_lower.split()) <= 12:
            dest = _place(re.sub(r'^(?:road\s+to\s+(?:the\s+)?|the\s+)', '', bare_from.group(1)))
            origin = _place(bare_from.group(2))
            road_mode = mode if is_transit else "driving"
            forced_tools.append({
                "name": "set_navigation_route",
                "args": {"origin": origin, "destination_a": dest, "destination_b": "", "mode": road_mode}
            })
            if road_mode == "transit":
                state = TransitLocationState.MEZZANINE
                return state, f"Subway route from {origin} to {dest} is live on your HUD.", forced_tools
            return state, f"The road from {origin} to {dest} is on your map.", forced_tools

        elif to_match and wants_route:
            dest = to_match.group(1).strip().rstrip('.!?').title()
            forced_tools.append({
                "name": "set_navigation_route",
                "args": {"origin": "Current Location", "destination_a": dest, "destination_b": "", "mode": mode}
            })
            if is_transit:
                state = TransitLocationState.MEZZANINE
                return state, f"Checking MTA fare and opening transit route to {dest}.", forced_tools
            return state, f"Opening navigation to {dest} on your HUD.", forced_tools

        # "I'm in Columbia and I want to go to Times Square, could you create a route"
        # remembers the trip and lets the subway answer through. The map stays closed
        # until they ask to see it.
        here = re.search(
            r'\b(?:at|in|near)\s+(?:the\s+)?(.+?)\s+(?:and|i|we|really|want|wanna|going)\b',
            text_lower,
        )
        going = re.search(
            r'\b(?:go|get|head|heading|going)\s+to\s+(?:the\s+)?(.+?)(?:\s+\b(?:could|can|please)\b|\s*$)',
            text_lower.rstrip('.!?'),
        )
        if here and going:
            origin = _place(here.group(1))
            dest = _place(re.split(r'\b(?:could|can|please)\b', going.group(1))[0])
            if origin and dest and origin.lower() != dest.lower():
                self.last_route = {
                    "origin": origin,
                    "destination_a": dest,
                    "destination_b": "",
                    "mode": "driving",
                }

        # Only an explicit "show it on the map" opens the highlighted road.
        asks_for_map = bool(re.search(
            r'\b(show|open|display|pull up|highlight|bring up)\b.{0,40}\bmap\b'
            r'|\bdisplay the route\b|\bshow the route\b|\bhighlight the route\b',
            text_lower,
        ))
        if asks_for_map and not (from_to_match or to_from_match or to_match):
            saved = self.last_route if self.last_route and self.last_route.get("destination_a") else None
            if saved:
                forced_tools.append({"name": "set_navigation_route", "args": dict(saved)})
                return state, (
                    f"Opening the map. The route from {saved['origin']} to {saved['destination_a']} is highlighted."
                ), forced_tools
            return state, "Tell me the two places first, then I can highlight that route on the map.", forced_tools

        # General transit talk with no destination: let Gemini answer conversationally.
        if is_transit:
            state = TransitLocationState.MEZZANINE
            return state, "", forced_tools

        # Plain "open map" is handled above, together with "display the route".

        return state, "", forced_tools




    async def process_frame_and_speech(
        self,
        image_base64: str,
        user_text: str = "",
        language: str = "tg"
    ) -> Dict[str, Any]:
        """
        Coordinates visual scene processing, state machine transitions, Gemini inference,
        tool dispatching, and rolling memory updates.
        """
        self.preferred_language = language
        try:
            image_bytes = base64.b64decode(image_base64)
        except Exception:
            image_bytes = b""

        rolling_context = self.get_context_list()

        # The clock is local and instant — no reason to spend a Gemini call on it.
        clock = self._clock_card(user_text)
        if clock:
            return {
                "response_text": clock["response_text"],
                "language": self.preferred_language,
                "action_cards": [clock["card"]],
                "spatial_state": self.current_state.value,
            }

        # Step 1: Call Gemini only when user asks something or provides speech
        if user_text and user_text.strip():
            gemini_result = await gemini_service.analyze_frame_and_speech(
                image_bytes=image_bytes,
                user_prompt=user_text.strip(),
                rolling_context=rolling_context,
                tools=TOOL_FUNCTIONS
            )
            detected_text = gemini_result.get("text", "")
            detected_tools = gemini_result.get("tool_calls", [])
        else:
            # Passive background frame: do not generate conversational responses or speak
            detected_text = ""
            detected_tools = []

        # Step 2: Evaluate spatial state transitions / forced fallbacks
        deduced_state, fallback_text, forced_tools = self._deduce_spatial_state_and_intent(user_text)

        action_cards = []
        tool_messages = []

        # Gemini sometimes answers in the plan JSON shape even for ordinary questions,
        # so any JSON carrying "speech" is unwrapped — never read aloud with its braces.
        if detected_text and "{" in detected_text and ("plan" in detected_text or "speech" in detected_text):
            try:
                # Find JSON block or substring
                json_match = re.search(r'\{.*\}', detected_text, flags=re.DOTALL)
                if json_match:
                    plan_data = json.loads(json_match.group(0))
                    if "plan" in plan_data:
                        p_info = plan_data["plan"]
                        p_title = p_info.get("title", "Mission Plan")
                        p_steps = p_info.get("steps", [])[:6]
                        p_speech = plan_data.get("speech", "")

                        action_cards.append({
                            "type": "mission_plan",
                            "title": p_title,
                            "details": "\n".join(f"{i+1}. {step}" for i, step in enumerate(p_steps)),
                            "status": "success",
                            "plan": {
                                "title": p_title,
                                "steps": p_steps
                            }
                        })
                        if p_speech:
                            detected_text = p_speech
                        else:
                            detected_text = f"I've projected your {len(p_steps)}-step plan onto the HUD."
                    elif plan_data.get("speech"):
                        detected_text = str(plan_data["speech"])
            except Exception as e:
                logger.error(f"Error parsing Gemini plan JSON: {e}")

        # Step 3: Execute triggered agent tools
        # Merge tools from Gemini detection and intent deduction cleanly
        all_tool_names = set()
        all_tools = []
        for t in (detected_tools + forced_tools):
            t_name = t.get("name")
            if t_name and t_name not in all_tool_names:
                all_tool_names.add(t_name)
                all_tools.append(t)

        # Balance is only ever fetched on an explicit ask, so its presence below means
        # the user wanted money talk. Transit wording just picks the richer phrasing.
        is_transit_talk = any(w in user_text.lower() for w in [
            "subway", "mta", "metro", "transit", "train", "bus", "fare", "fares", "turnstile", "omny", "метро"
        ])
        asked_enough = bool(re.search(_FARE_QUESTION, user_text.lower()))

        mta_balance_info = None
        navigation_info = None

        for tool in all_tools:
            tool_name = tool.get("name")
            tool_args = tool.get("args", {})
            result = await execute_tool(tool_name, tool_args)

            if tool_name in ("check_bank_balance", "check_and_reload_transit_fare"):
                bal = result.get("balance", 0.0)
                mta_fare = 2.90
                rides = int(bal // mta_fare) if bal > 0 else 0
                mta_balance_info = {
                    "balance": bal,
                    "mta_fare": mta_fare,
                    "rides": rides
                }
                # The fare paragraph below already states the balance, so don't say it twice.
                if not is_transit_talk and not asked_enough:
                    tool_messages.append(f"Your Capital One bank account balance is ${bal:.2f} USD.")
                    action_cards.append({
                        "type": "nessie",
                        "title": "Capital One Bank Balance",
                        "details": f"Checking Account Balance: ${bal:.2f} USD (Active)",
                        "status": "success"
                    })
            elif tool_name == "deposit_money":
                amt = result.get("amount", 0.0)
                new_bal = result.get("new_balance", amt)
                tool_messages.append(f"Successfully deposited ${amt:.2f} into your Capital One bank account. Your new balance is ${new_bal:.2f}.")
                action_cards.append({
                    "type": "nessie",
                    "title": "Capital One Deposit",
                    "details": f"Deposited ${amt:.2f} | New Balance: ${new_bal:.2f}",
                    "status": "success"
                })
            elif tool_name == "pay_with_card":
                amt = result.get("amount_charged", 0.0)
                rem = result.get("remaining_balance", 0.0)
                reloaded = result.get("auto_reloaded", False)
                msg = f"Card payment of ${amt:.2f} processed."
                if reloaded:
                    msg += f" Account auto-reloaded $10.00."
                msg += f" Remaining balance is ${rem:.2f}."
                tool_messages.append(msg)
                action_cards.append({
                    "type": "nessie",
                    "title": "Capital One Card Payment",
                    "details": msg,
                    "status": "success"
                })
            elif tool_name == "update_mission_plan":
                p_title = result.get("title", "Daily Mission Plan")
                p_steps = result.get("steps", [])
                action_cards.append({
                    "type": "mission_plan",
                    "title": p_title,
                    "details": "\n".join(f"{i+1}. {step}" for i, step in enumerate(p_steps)),
                    "status": "success",
                    "plan": {
                        "title": p_title,
                        "steps": p_steps
                    }
                })

            elif tool_name == "clear_mission_plan":
                action_cards.append({
                    "type": "destroy_plan",
                    "title": "Mission Plan Destroyed",
                    "details": "Dashboard permanently wiped.",
                    "status": "success"
                })
                tool_messages.append("Mission plan permanently destroyed from your HUD.")

            elif tool_name == "hide_mission_plan":
                action_cards.append({
                    "type": "hide_plan",
                    "title": "Mission Plan Hidden",
                    "details": "Dashboard collapsed. Say 'open plan' to restore.",
                    "status": "success"
                })
                tool_messages.append("Mission plan dashboard collapsed. Say 'open plan' to bring it back.")

            elif tool_name == "show_mission_plan":
                action_cards.append({
                    "type": "show_plan",
                    "title": "Mission Plan Restored",
                    "details": "Dashboard re-opened.",
                    "status": "success"
                })
                tool_messages.append("Mission plan dashboard restored to your HUD.")

            elif tool_name == "dispatch_imessage_itinerary":
                action_cards.append({
                    "type": "imessage",
                    "title": "Photon iMessage Dispatched",
                    "details": f"Blue-bubble route guide sent for {tool_args.get('destination', 'Columbia University')}",
                    "status": "success"
                })
            elif tool_name == "lookup_transit_alerts":
                action_cards.append({
                    "type": "transit_alert",
                    "title": "MTA Service Advisory (Supabase)",
                    "details": "1 Train: Uptown local bypasses 110 St. 116 St Columbia Univ operating normally.",
                    "status": "warning"
                })

            elif tool_name == "set_navigation_route":
                dest_a = result.get("destination_a", "")
                dest_b = result.get("destination_b", "")
                mode = result.get("mode", "driving")
                navigation_info = {
                    "origin": result.get("origin", "Current Location"),
                    "destination_a": dest_a,
                    "destination_b": dest_b if dest_b else None,
                    "mode": mode,
                }
                action_cards.append({
                    "type": "navigation",
                    "title": "MTA Subway Navigation" if mode == "transit" else "Road on the map",
                    "details": f"Route A: {dest_a}" + (f" | Route B: {dest_b}" if dest_b else ""),
                    "status": "success",
                    "navigation": navigation_info
                })
                if dest_a:
                    self.last_route = {
                        "origin": str(navigation_info["origin"] or "Current Location"),
                        "destination_a": str(dest_a),
                        "destination_b": str(dest_b or ""),
                        "mode": str(mode or "driving"),
                    }
                    if mode != "transit":
                        tool_messages.append(
                            f"The route from {navigation_info['origin']} to {dest_a} is highlighted on your map."
                        )

            elif tool_name == "get_weather_forecast":
                tool_messages.append(result.get("message", "Weather data is unavailable right now."))
                if result.get("success"):
                    action_cards.append({
                        "type": "weather",
                        "title": f"Weather — {result.get('location', 'New York')}",
                        "details": (
                            f"{result.get('time_label', 'now').title()}: {result.get('temperature')}°F, "
                            f"{result.get('condition')} | Feels {result.get('feels_like')}°F | "
                            f"Rain {result.get('precipitation_probability')}% | Wind {result.get('wind_mph')} mph"
                        ),
                        "status": "warning" if result.get("precipitation_probability", 0) >= 50 else "success",
                    })

            elif tool_name in ("close_navigation_map", "close_map", "hide_map"):
                action_cards.append({
                    "type": "close_map",
                    "title": "Navigation Map Closed",
                    "details": "Map overlay dismissed from HUD.",
                    "status": "success"
                })
                tool_messages.append("Navigation map closed.")

        # When money talk owns the reply, still confirm the route was set.
        if navigation_info and tool_messages and not is_transit_talk and not asked_enough:
            route_dest = navigation_info.get("destination_a")
            already = any("on your map" in m for m in tool_messages)
            if route_dest and not already:
                tool_messages.append(f"Route to {route_dest} is live on your HUD.")

        if (is_transit_talk or asked_enough) and mta_balance_info:
            bal = mta_balance_info["balance"]
            fare = mta_balance_info["mta_fare"]
            rides = mta_balance_info["rides"]
            dest = navigation_info.get("destination_a") if navigation_info else ""

            if dest:
                if bal >= fare:
                    transit_speech = (
                        f"MTA subway fare is ${fare:.2f}. With your Capital One balance of ${bal:.2f} ({rides} rides available), "
                        f"taking the subway is your best economical option, saving around $30 compared to a taxi. "
                        f"Subway route to {dest} is live on your HUD."
                    )
                else:
                    transit_speech = (
                        f"MTA subway fare is ${fare:.2f}, but your Capital One balance is only ${bal:.2f}. "
                        f"You need a quick reload or deposit before tapping at the turnstile. "
                        f"Subway route to {dest} is active on your HUD."
                    )
            else:
                if bal >= fare:
                    transit_speech = (
                        f"MTA NYC subway fare is ${fare:.2f} per ride with free transfers for 2 hours. "
                        f"Your Capital One balance is ${bal:.2f}, covering {rides} rides. "
                        f"Subway is by far your most economical option compared to $30+ rideshares."
                    )
                else:
                    transit_speech = (
                        f"MTA NYC subway fare is ${fare:.2f} per ride. "
                        f"Your Capital One balance is currently ${bal:.2f}, which is below the fare price. "
                        f"I recommend depositing funds or auto-reloading before entering the station."
                    )

            tool_messages.insert(0, transit_speech)
            action_cards.insert(0, {
                "type": "nessie",
                "title": "MTA Transit & Capital One Economics",
                "details": f"Balance: ${bal:.2f} | MTA Fare: ${fare:.2f} ({rides} rides available) | Best Economical Choice",
                "status": "success" if bal >= fare else "warning"
            })

        # Formulate final response text:
        # If tools executed with specific monetary or clear messages, prioritize them; otherwise use Gemini's natural conversational speech
        if tool_messages:
            final_response_text = " ".join(tool_messages)
        elif detected_text and len(detected_text.strip()) > 3:
            final_response_text = detected_text.strip()
        elif user_text.strip():
            final_response_text = fallback_text
        else:
            final_response_text = ""

        # Step 4: Save checkpoint to rolling visual memory
        self.update_visual_memory(
            frame_summary=f"Query: '{user_text[:40]}' -> Copilot: '{final_response_text[:40]}'",
            state=deduced_state
        )

        # Non-blocking async fire-and-forget checkpoint to Supabase
        if final_response_text:
            asyncio.create_task(
                supabase_service.save_session_checkpoint(self.session_id, {
                    "timestamp": time.time(),
                    "state": deduced_state.value,
                    "query": user_text,
                    "response": final_response_text
                })
            )


        return {
            "response_text": final_response_text,
            "language": self.preferred_language,
            "action_cards": action_cards,
            "spatial_state": deduced_state.value
        }
