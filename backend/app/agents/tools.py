import logging
from typing import Dict, Any, List
from app.services.nessie import nessie_service
from app.services.photon import photon_service
from app.services.supabase_service import supabase_service
from app.services.weather import weather_service

logger = logging.getLogger(__name__)


# Standard Python callable functions for Gemini 2.0 SDK tool calling
def check_bank_balance(account_type: str = "checking") -> dict:
    """Checks the user's Capital One Bank Account balance and available debit card balance."""
    return {"account_type": account_type}


def deposit_money(amount: float, memo: str = "Deposit to Capital One") -> dict:
    """Deposits money into the user's Capital One Bank Account."""
    return {"amount": amount, "memo": memo}


def pay_with_card(amount: float, merchant: str = "MTA Subway Turnstile") -> dict:
    """Charges the user's Capital One debit card / bank balance for purchases or subway turnstiles with auto-reload protection."""
    return {"amount": amount, "merchant": merchant}


def dispatch_imessage_itinerary(destination: str, transit_line: str, steps: list[str], phone_number: str = "+15551234567", warning: str = "") -> dict:
    """Sends a native iOS blue-bubble iMessage with formatted subway directions and detour advisories."""
    return {"destination": destination, "transit_line": transit_line, "steps": steps, "phone_number": phone_number, "warning": warning}


def update_mission_plan(title: str, steps: list[str]) -> dict:
    """Updates the user's live HUD mission plan dashboard on the screen with a title and a list of up to 6 action items or steps."""
    return {"title": title, "steps": steps[:6]}


def clear_mission_plan() -> dict:
    """Destroys and permanently removes the plan dashboard from the live HUD screen when requested by the user."""
    return {}


def hide_mission_plan() -> dict:
    """Collapses / hides the plan dashboard panel from view WITHOUT destroying the plan data. Use when user says 'close plan', 'hide plan', 'collapse dashboard'."""
    return {}


def show_mission_plan() -> dict:
    """Re-opens / reveals the plan dashboard that was previously hidden or collapsed. Use when user says 'open plan', 'show plan', 'bring back dashboard'."""
    return {}


def lookup_transit_alerts(transit_line: str) -> dict:
    """Queries Supabase for real-time MTA transit detours and platform service advisories."""
    return {"transit_line": transit_line}


def set_navigation_route(
    origin: str,
    destination_a: str,
    destination_b: str = "",
    mode: str = "driving"
) -> dict:
    """
    Opens the live Google Maps navigation overlay and computes Route A (primary) and optionally
    Route B (alternative) between the given origin and destinations.
    Use this when the user asks to navigate, get directions, or find routes to a place.
    Modes: 'driving', 'walking', 'transit', 'bicycling'.
    Set origin to 'Current Location' to use the device GPS position.
    """
    return {
        "origin": origin,
        "destination_a": destination_a,
        "destination_b": destination_b,
        "mode": mode,
    }


def close_navigation_map() -> dict:
    """Closes, dismisses, or hides the live navigation map overlay from the HUD screen."""
    return {}


def get_weather_forecast(location: str = "", hour: int = -1, day: str = "today") -> dict:
    """
    Gets the weather for a specific hour: temperature, conditions, rain chance, and wind.
    Use whenever the user asks about weather, temperature, rain, snow, wind, or the forecast,
    including 'what's the weather at 3 pm', 'will it rain tonight', 'how cold tomorrow morning'.
    hour is 0-23 in 24-hour local time, or -1 for right now.
    day is 'today' or 'tomorrow'. Leave location empty for the user's current city.
    """
    return {"location": location, "hour": hour, "day": day}


TOOL_FUNCTIONS = [
    check_bank_balance,
    deposit_money,
    pay_with_card,
    update_mission_plan,
    clear_mission_plan,
    hide_mission_plan,
    show_mission_plan,
    dispatch_imessage_itinerary,
    lookup_transit_alerts,
    set_navigation_route,
    close_navigation_map,
    get_weather_forecast,
]


async def execute_tool(tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes the function called by Gemini model and returns structured output.
    """
    logger.info(f"Executing tool: {tool_name} with args {args}")

    if tool_name in ("check_bank_balance", "check_and_reload_transit_fare"):
        acc_info = await nessie_service.get_transit_account_balance()
        current_balance = acc_info.get("balance", 0.0)
        mta_fare = 2.90
        rides = int(current_balance // mta_fare) if current_balance > 0 else 0
        return {
            "success": True,
            "account_id": acc_info.get("account_id"),
            "account_type": acc_info.get("type", "Checking"),
            "balance": current_balance,
            "mta_fare": mta_fare,
            "rides_affordable": rides,
            "message": f"Capital One checking balance is ${current_balance:.2f} USD. MTA NYC subway fare is $2.90 ({rides} rides available)."
        }

    elif tool_name == "deposit_money":
        amount = float(args.get("amount", 20.0))
        memo = args.get("memo", "Deposit to Capital One")
        res = await nessie_service.deposit_money(amount=amount, description=memo)
        return res

    elif tool_name == "pay_with_card":
        amount = float(args.get("amount", 2.90))
        merchant = args.get("merchant", "MTA Subway Turnstile")
        res = await nessie_service.charge_transit_card(amount=amount, description=merchant)
        return res

    elif tool_name == "update_mission_plan":
        title = args.get("title", "Daily Mission Plan")
        steps = args.get("steps", [])
        if isinstance(steps, str):
            steps = [s.strip() for s in steps.split("\n") if s.strip()]
        steps = steps[:6]
        return {
            "success": True,
            "action": "update_plan",
            "title": title,
            "steps": steps,
            "message": f"Updated mission plan with {len(steps)} steps."
        }

    elif tool_name == "clear_mission_plan":
        return {
            "success": True,
            "action": "destroy_plan",
            "message": "Mission plan dashboard permanently destroyed."
        }

    elif tool_name == "hide_mission_plan":
        return {
            "success": True,
            "action": "hide_plan",
            "message": "Mission plan dashboard collapsed."
        }

    elif tool_name == "show_mission_plan":
        return {
            "success": True,
            "action": "show_plan",
            "message": "Mission plan dashboard restored."
        }

    elif tool_name == "dispatch_imessage_itinerary":
        phone = args.get("phone_number", "+15551234567")
        destination = args.get("destination", "Columbia University")
        line = args.get("transit_line", "1 Train")
        steps = args.get("steps", ["Follow signs down to Uptown 1 Train platform"])
        warning = args.get("warning")

        res = await photon_service.send_imessage_itinerary(
            phone_number=phone,
            destination=destination,
            transit_line=line,
            steps=steps,
            warning=warning
        )
        return {"success": True, "result": res}

    elif tool_name == "lookup_transit_alerts":
        line = args.get("transit_line", "1")
        alerts = await supabase_service.get_transit_alerts(line)
        return {"success": True, "alerts": alerts}

    elif tool_name == "set_navigation_route":
        origin = args.get("origin", "Current Location")
        destination_a = args.get("destination_a", "")
        destination_b = args.get("destination_b", "")
        mode = args.get("mode", "driving")
        return {
            "success": True,
            "origin": origin,
            "destination_a": destination_a,
            "destination_b": destination_b if destination_b else None,
            "mode": mode,
        }

    elif tool_name == "get_weather_forecast":
        try:
            hour = int(args.get("hour", -1))
        except (TypeError, ValueError):
            hour = -1
        day_offset = 1 if str(args.get("day", "today")).lower().startswith("tomorrow") else 0
        return await weather_service.get_hourly_forecast(
            location=str(args.get("location") or ""),
            hour=hour if 0 <= hour <= 23 else None,
            day_offset=day_offset,
        )

    elif tool_name in ("close_navigation_map", "close_map", "hide_map"):
        return {
            "success": True,
            "action": "close_map",
            "message": "Navigation map closed."
        }

    return {"error": f"Unknown tool {tool_name}"}

