import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Default to NYC so a bare "what's the weather" needs no geocoding round trip.
_DEFAULT_PLACE = {"name": "New York", "latitude": 40.7128, "longitude": -74.0060}

_HERE_ALIASES = {"", "here", "current location", "my location", "outside", "nyc", "new york city"}

# WMO codes condensed to phrases short enough to speak in one breath.
_CONDITIONS = {
    0: "clear", 1: "mostly clear", 2: "partly cloudy", 3: "overcast",
    45: "foggy", 48: "freezing fog",
    51: "light drizzle", 53: "drizzle", 55: "heavy drizzle",
    56: "freezing drizzle", 57: "heavy freezing drizzle",
    61: "light rain", 63: "rain", 65: "heavy rain",
    66: "freezing rain", 67: "heavy freezing rain",
    71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains",
    80: "rain showers", 81: "heavy rain showers", 82: "violent rain showers",
    85: "snow showers", 86: "heavy snow showers",
    95: "thunderstorms", 96: "thunderstorms with hail", 99: "severe thunderstorms with hail",
}


def _clock_label(hour: int) -> str:
    suffix = "AM" if hour < 12 else "PM"
    display = hour % 12 or 12
    return f"{display} {suffix}"


class WeatherService:
    """Hourly forecasts via Open-Meteo — no API key, no account, no rate limit for demo traffic."""

    async def _resolve_place(self, client: httpx.AsyncClient, location: str) -> Dict[str, Any]:
        if location.strip().lower() in _HERE_ALIASES:
            return dict(_DEFAULT_PLACE)

        res = await client.get(
            _GEOCODE_URL,
            params={"name": location, "count": 1, "language": "en", "format": "json"},
        )
        results = (res.json() or {}).get("results") or []
        if not results:
            logger.info(f"Geocoding miss for '{location}', defaulting to New York")
            return dict(_DEFAULT_PLACE)

        top = results[0]
        return {
            "name": top.get("name") or location,
            "latitude": top["latitude"],
            "longitude": top["longitude"],
        }

    @staticmethod
    def _pick_index(times: list, current_time: str, hour: Optional[int], day_offset: int) -> Optional[int]:
        if not times:
            return None

        if hour is None:
            prefix = (current_time or times[0])[:13]
        else:
            # Hourly series starts at 00:00 local on day 0, so day 0's date anchors the offset.
            base = datetime.fromisoformat(times[0][:10]) + timedelta(days=day_offset)
            prefix = f"{base.date().isoformat()}T{hour:02d}"

        for i, t in enumerate(times):
            if t.startswith(prefix):
                return i
        return 0 if hour is None else None

    async def get_hourly_forecast(
        self,
        location: str = "",
        hour: Optional[int] = None,
        day_offset: int = 0,
    ) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                place = await self._resolve_place(client, location)
                res = await client.get(
                    _FORECAST_URL,
                    params={
                        "latitude": place["latitude"],
                        "longitude": place["longitude"],
                        "hourly": "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
                        "current": "temperature_2m",
                        "temperature_unit": "fahrenheit",
                        "wind_speed_unit": "mph",
                        "timezone": "auto",
                        "forecast_days": 3,
                    },
                )
                res.raise_for_status()
                data = res.json()
        except Exception as e:
            logger.error(f"Weather lookup failed: {e}")
            return {"success": False, "message": "I couldn't reach the weather service just now."}

        hourly = data.get("hourly") or {}
        times = hourly.get("time") or []
        index = self._pick_index(times, (data.get("current") or {}).get("time", ""), hour, day_offset)

        if index is None or index >= len(times):
            return {"success": False, "message": "I don't have a forecast that far ahead."}

        def at(key: str, default: Any = 0):
            series = hourly.get(key) or []
            return series[index] if index < len(series) else default

        target_hour = int(times[index][11:13])
        day_label = "tomorrow" if day_offset == 1 else ("today" if day_offset == 0 else f"in {day_offset} days")
        time_label = "right now" if hour is None else f"{day_label} at {_clock_label(target_hour)}"

        temperature = round(at("temperature_2m"))
        feels_like = round(at("apparent_temperature"))
        rain_chance = int(at("precipitation_probability"))
        condition = _CONDITIONS.get(int(at("weather_code")), "unsettled")
        wind = round(at("wind_speed_10m"))

        message = (
            f"{place['name']} {time_label}: {temperature} degrees and {condition}, "
            f"feels like {feels_like}, with a {rain_chance} percent chance of precipitation."
        )
        if rain_chance >= 50:
            message += " Take an umbrella."
        elif temperature <= 40:
            message += " Dress warm."

        return {
            "success": True,
            "location": place["name"],
            "time_label": time_label,
            "hour": target_hour,
            "temperature": temperature,
            "feels_like": feels_like,
            "precipitation_probability": rain_chance,
            "condition": condition,
            "wind_mph": wind,
            "message": message,
        }


weather_service = WeatherService()
