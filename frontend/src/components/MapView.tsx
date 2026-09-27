import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, X, MapPin, Route, Loader2, ChevronDown } from "lucide-react";
import { NavigationRoute } from "../types/stream";

// ── OpenStreetMap standard tiles — always free, no API key ───────────────
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// ── Nominatim geocoding ───────────────────────────────────────────────────
async function geocode(query: string): Promise<[number, number] | null> {
  try {
    const q = /new york|nyc|manhattan|brooklyn|queens|bronx/i.test(query)
      ? query
      : `${query}, New York`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=en`,
      { signal: AbortSignal.timeout(6000) }
    );
    const data = await res.json();
    if (!data.length) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {
    return null;
  }
}

// ── Google encoded-polyline decoder (OTP/Transitous geometry format) ──────
function decodePolyline(encoded: string): [number, number][] {
  let index = 0, lat = 0, lng = 0;
  const coords: [number, number][] = [];
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

// ── Transit leg color by mode ─────────────────────────────────────────────
function transitLegColor(mode: string, routeColor?: string): string {
  if (routeColor) return `#${routeColor}`;
  switch (mode) {
    case "SUBWAY": return "#00C8E8";
    case "BUS":    return "#FFB800";
    case "RAIL":   return "#A855F7";
    case "TRAM":   return "#10B981";
    case "FERRY":  return "#3B82F6";
    default:       return "#9CA3AF"; // WALK
  }
}

interface TransitLeg {
  mode: string;
  coords: [number, number][];
  color: string;
  dashed: boolean;
  routeName?: string;
  from: string;
  to: string;
  durationMin: number;
}

// ── Transitous public OTP — subway / transit routing ──────────────────────
// Free open-source server, no API key needed
async function fetchTransitRoute(
  from: [number, number],
  to: [number, number]
): Promise<{ legs: TransitLeg[]; distance: string; duration: string } | null> {
  const url =
    `https://api.transitous.org/otp/routers/default/plan` +
    `?fromPlace=${from[0]},${from[1]}&toPlace=${to[0]},${to[1]}` +
    `&numItineraries=1&mode=TRANSIT,WALK&locale=en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) return null;
    const data = await res.json();
    const itinerary = data.plan?.itineraries?.[0];
    if (!itinerary) return null;

    let totalDistM = 0;
    const legs: TransitLeg[] = itinerary.legs.map((leg: any) => {
      totalDistM += leg.distance ?? 0;
      return {
        mode: leg.mode as string,
        coords: decodePolyline(leg.legGeometry.points),
        color: transitLegColor(leg.mode, leg.routeColor),
        dashed: leg.mode === "WALK",
        routeName: leg.route ?? leg.routeShortName ?? undefined,
        from: leg.from?.name ?? "",
        to: leg.to?.name ?? "",
        durationMin: Math.round((leg.endTime - leg.startTime) / 60000),
      };
    });

    return {
      legs,
      distance: (totalDistM / 1000).toFixed(1) + " km",
      duration: Math.round(itinerary.duration / 60) + " min",
    };
  } catch {
    return null;
  }
}

// ── OSRM routing — driving | walking | cycling ────────────────────────────
async function fetchRoute(
  from: [number, number],
  to: [number, number],
  mode: string
): Promise<{ coords: [number, number][]; distance: string; duration: string } | null> {
  const profile =
    mode === "walking" ? "walking" : mode === "bicycling" ? "cycling" : "driving";
  const url =
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;
    const r = data.routes[0];
    const coords: [number, number][] = r.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );
    return {
      coords,
      distance: (r.distance / 1000).toFixed(1) + " km",
      duration: Math.round(r.duration / 60) + " min",
    };
  } catch {
    return null;
  }
}

// ── Fix Leaflet icon paths broken by Vite bundler ─────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Types ─────────────────────────────────────────────────────────────────
interface MapViewProps {
  navigationRoute: NavigationRoute | null;
  onClose: () => void;
}

interface RouteInfo {
  distance: string;
  duration: string;
  transitLegs?: TransitLeg[];
}

// ── Component ─────────────────────────────────────────────────────────────
export const MapView: React.FC<MapViewProps> = ({ navigationRoute, onClose }) => {
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const mapRef     = useRef<L.Map | null>(null);
  const userMarkerRef   = useRef<L.CircleMarker | null>(null);
  const routeLayersRef  = useRef<L.Layer[]>([]);
  const watchIdRef      = useRef<number | null>(null);

  const [isMapReady, setIsMapReady]   = useState(false);
  const [userPos, setUserPos]         = useState<[number, number] | null>(null);
  const [gpsError, setGpsError]       = useState<string | null>(null);
  const [routeInfoA, setRouteInfoA]   = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [routeError, setRouteError]   = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // ── Initialize Leaflet map ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: [40.7580, -73.9855], // NYC default
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);

    // Dark mode: invert tiles only, markers stay normal
    const tilePaneEl = map.getPanes().tilePane as HTMLElement;
    tilePaneEl.style.filter =
      "invert(100%) hue-rotate(180deg) saturate(0.55) brightness(0.85)";

    mapRef.current = map;
    setIsMapReady(true);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── GPS tracking ──────────────────────────────────────────────────────
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("Geolocation not supported."); return; }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(coords);
        setGpsError(null);
        const map = mapRef.current;
        if (!map) return;
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(coords);
        } else {
          userMarkerRef.current = L.circleMarker(coords, {
            radius: 10, fillColor: "#00F0FF", fillOpacity: 1,
            color: "#ffffff", weight: 2,
          }).addTo(map).bindPopup("📍 Your Location");
          map.setView(coords, 14);
        }
      },
      (err) => setGpsError(`GPS: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!isMapReady) return;
    startGPS();
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isMapReady, startGPS]);

  // ── Draw route when navigationRoute changes ───────────────────────────
  useEffect(() => {
    if (!isMapReady || !navigationRoute?.destination_a) return;

    const map = mapRef.current!;
    setIsLoading(true);
    setRouteError(null);
    setRouteInfoA(null);

    // Clear old layers
    routeLayersRef.current.forEach((l) => l.remove());
    routeLayersRef.current = [];

    const mode = navigationRoute.mode ?? "driving";
    const isTransit = mode === "transit";

    const resolveOrigin = async (): Promise<[number, number] | null> => {
      if (!navigationRoute.origin || navigationRoute.origin === "Current Location") {
        if (userPos) return userPos;
        return new Promise((resolve) => {
          let tries = 0;
          const t = setInterval(() => {
            if (userPos || tries++ > 8) { clearInterval(t); resolve(userPos); }
          }, 400);
        });
      }
      return geocode(navigationRoute.origin);
    };

    (async () => {
      try {
        const [originCoords, destCoords] = await Promise.all([
          resolveOrigin(),
          geocode(navigationRoute.destination_a),
        ]);

        if (!originCoords) {
          setRouteError("Could not locate origin. Enable GPS or specify a place name.");
          return;
        }
        if (!destCoords) {
          setRouteError(`Could not find "${navigationRoute.destination_a}".`);
          return;
        }

        // ── Transit routing via Transitous OTP ────────────────────────
        if (isTransit) {
          const transit = await fetchTransitRoute(originCoords, destCoords);
          if (transit) {
            const allCoords: [number, number][] = [];
            transit.legs.forEach((leg) => {
              const casing = L.polyline(leg.coords, {
                color: "#ffffff", weight: leg.dashed ? 7 : 11, opacity: 0.9,
              }).addTo(map);
              const poly = L.polyline(leg.coords, {
                color: leg.color,
                weight: leg.dashed ? 3 : 6,
                opacity: 1,
                dashArray: leg.dashed ? "6 5" : undefined,
              }).addTo(map);
              routeLayersRef.current.push(casing, poly);
              allCoords.push(...leg.coords);

              // Station markers for non-walk legs
              if (!leg.dashed && leg.to) {
                const last = leg.coords[leg.coords.length - 1];
                const stationIcon = L.divIcon({
                  className: "",
                  html: `<div style="width:10px;height:10px;border-radius:50%;background:${leg.color};border:2px solid white;"></div>`,
                  iconSize: [10, 10],
                  iconAnchor: [5, 5],
                });
                const marker = L.marker(last, { icon: stationIcon })
                  .addTo(map)
                  .bindPopup(`🚇 ${leg.routeName ? `[${leg.routeName}] ` : ""}${leg.to}`);
                routeLayersRef.current.push(marker);
              }
            });

            if (allCoords.length)
              map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30] });

            setRouteInfoA({
              distance: transit.distance,
              duration: transit.duration,
              transitLegs: transit.legs,
            });
          } else {
            // Transitous failed — still draw the road so the trip is visible.
            const drive = await fetchRoute(originCoords, destCoords, "driving");
            if (drive) {
              const casing = L.polyline(drive.coords, { color: "#ffffff", weight: 12, opacity: 0.95 }).addTo(map);
              const poly = L.polyline(drive.coords, { color: "#1A73E8", weight: 6, opacity: 1 }).addTo(map);
              routeLayersRef.current.push(casing, poly);
              map.invalidateSize();
              map.fitBounds(poly.getBounds(), { padding: [40, 40] });
              setRouteInfoA({ distance: drive.distance, duration: drive.duration });
              setRouteError(null);
            }
          }
          return;
        }

        // ── OSRM for driving / walking / cycling — the line follows the road ──
        const routeA = await fetchRoute(originCoords, destCoords, mode);
        if (routeA) {
          map.invalidateSize();
          // White casing under a Maps-blue line, so the road reads as a highlighted route.
          const casing = L.polyline(routeA.coords, {
            color: "#ffffff", weight: 12, opacity: 0.95,
          }).addTo(map);
          const poly = L.polyline(routeA.coords, {
            color: "#1A73E8", weight: 6, opacity: 1,
          }).addTo(map);
          routeLayersRef.current.push(casing, poly);

          const originMarker = L.circleMarker(originCoords, {
            radius: 8, fillColor: "#FCCC0A", fillOpacity: 1, color: "#ffffff", weight: 2,
          }).addTo(map).bindPopup(`From ${navigationRoute.origin}`);
          const destMarker = L.circleMarker(destCoords, {
            radius: 8, fillColor: "#00F0FF", fillOpacity: 1, color: "#ffffff", weight: 2,
          }).addTo(map).bindPopup(`To ${navigationRoute.destination_a}`).openPopup();
          routeLayersRef.current.push(originMarker, destMarker);

          map.fitBounds(poly.getBounds(), { padding: [40, 40] });
          setRouteInfoA({ distance: routeA.distance, duration: routeA.duration });
        } else {
          setRouteError("Could not compute route.");
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isMapReady, navigationRoute]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Transit legs summary ──────────────────────────────────────────────
  const transitSummary = routeInfoA?.transitLegs?.filter((l) => !l.dashed);

  // ── Collapsed pill ────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div
        className="absolute bottom-16 right-3 flex items-center gap-2 px-3 py-1.5
                   border border-stark-cyan/60 bg-black/90 backdrop-blur-xl rounded-full
                   shadow-[0_0_14px_rgba(0,240,255,0.25)] z-30 cursor-pointer
                   hover:border-stark-cyan transition-all group"
        onClick={() => setIsCollapsed(false)}
      >
        <Navigation className="w-3.5 h-3.5 text-stark-cyan group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest text-stark-cyan stark-text-glow">MAP ACTIVE</span>
        {userPos && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-stark-cyan/20 text-stark-cyan border border-stark-cyan/40">GPS ✓</span>
        )}
      </div>
    );
  }

  // ── Full panel ────────────────────────────────────────────────────────
  return (
    <div className="absolute inset-3 top-12 border-2 border-stark-cyan bg-black/95 backdrop-blur-xl rounded-lg shadow-[0_0_35px_rgba(0,240,255,0.45)] z-30 font-mono flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="corner-tl" /><div className="corner-tr" />
      <div className="corner-bl" /><div className="corner-br" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stark-cyan/30 bg-stark-cyan/10 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-stark-cyan animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-stark-cyan stark-text-glow">
            NAVIGATION // OSM + {navigationRoute?.mode === "transit" ? "TRANSIT" : "OSRM"}
          </span>
          {userPos && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/40 animate-pulse">● GPS</span>
          )}
          {isLoading && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">ROUTING...</span>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          <button onClick={() => setIsCollapsed(true)} className="p-1 rounded hover:bg-stark-cyan/20 text-gray-400 hover:text-stark-cyan transition-colors">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Route summary strip */}
      {navigationRoute?.destination_a && (
        <div className="px-3 py-2 border-b border-stark-cyan/20 bg-black/60 flex-shrink-0 space-y-1.5">
          {/* Main route card */}
          <div className="flex items-start gap-2 p-2 rounded border border-stark-cyan/40 bg-stark-cyan/5">
            <div className="w-2 h-2 rounded-full bg-stark-cyan mt-0.5 flex-shrink-0 shadow-[0_0_6px_#00f0ff]" />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-black uppercase tracking-widest text-stark-cyan mb-0.5">ROUTE</div>
              <div className="text-[10px] text-white truncate">
                {navigationRoute.origin && navigationRoute.origin !== "Current Location"
                  ? navigationRoute.origin : "Current Pos"} → {navigationRoute.destination_a}
              </div>
              {routeInfoA ? (
                <div className="text-[9px] text-gray-400 mt-0.5">
                  {routeInfoA.distance} · {routeInfoA.duration}
                </div>
              ) : isLoading ? (
                <div className="text-[9px] text-gray-500 mt-0.5 flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Computing route...
                </div>
              ) : routeError ? (
                <div className="text-[9px] text-amber-400 mt-0.5">{routeError}</div>
              ) : null}
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/20 text-gray-300 uppercase tracking-wider flex-shrink-0">
              {navigationRoute.mode === "transit" ? "🚇 transit" : navigationRoute.mode ?? "driving"}
            </span>
          </div>

          {/* Transit legs breakdown */}
          {transitSummary && transitSummary.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {transitSummary.map((leg, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border"
                  style={{ borderColor: leg.color + "60", background: leg.color + "15", color: leg.color }}
                >
                  <span>{leg.mode === "SUBWAY" ? "🚇" : leg.mode === "BUS" ? "🚌" : "🚆"}</span>
                  {leg.routeName && <span>{leg.routeName}</span>}
                  <span className="text-gray-400 font-normal">{leg.durationMin}min</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map canvas */}
      <div className="flex-1 relative min-h-0">
        {!isMapReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e1a] z-10">
            <Loader2 className="w-8 h-8 text-stark-cyan animate-spin mb-3" />
            <span className="text-xs text-stark-cyan/70 uppercase tracking-widest">INITIALIZING MAP ENGINE...</span>
          </div>
        )}
        {gpsError && (
          <div className="absolute top-2 left-2 right-2 px-3 py-2 rounded border border-red-500/50 bg-red-950/60 backdrop-blur text-[10px] text-red-300 z-[500] flex items-center gap-2">
            <MapPin className="w-3 h-3 flex-shrink-0" />{gpsError}
          </div>
        )}
        {isMapReady && !navigationRoute?.destination_a && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-[500] pointer-events-none">
            <div className="px-3 py-2 rounded border border-stark-cyan/30 bg-black/70 backdrop-blur text-[10px] text-stark-cyan/60 text-center">
              <Route className="w-3 h-3 inline mr-1 mb-0.5" />
              Say <span className="text-stark-cyan font-bold">"Navigate to [place]"</span> or{" "}
              <span className="text-stark-cyan font-bold">"Subway from A to B"</span>
            </div>
          </div>
        )}
        <div ref={mapDivRef} className="w-full h-full" />
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 bg-black/60 border-t border-stark-cyan/20 flex items-center justify-between text-[9px] text-gray-400 flex-shrink-0">
        <div className="flex items-center space-x-1">
          <MapPin className="w-2.5 h-2.5 text-stark-cyan" />
          {userPos ? (
            <span>{userPos[0].toFixed(5)}°, {userPos[1].toFixed(5)}°</span>
          ) : (
            <span>ACQUIRING GPS...</span>
          )}
        </div>
        <span className="text-stark-cyan">OSM // OSRM + TRANSITOUS</span>
      </div>
    </div>
  );
};
