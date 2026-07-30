"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, CloudRain, CloudSnow, Cloud, Sun, Wind, AlertTriangle, MapPin, RefreshCw, X, Briefcase, Truck, ClipboardCheck, Calendar, Pencil } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay, isSameDay } from "date-fns";
import { useStore } from "@/lib/store";
import { ConfirmModal } from "@/components/confirm-modal";

type CustomEventType = "meeting" | "inspection" | "delivery" | "permit" | "other";

type CustomEvent = {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  type: CustomEventType;
  description?: string;
  color: string;
};

type CalEvent = { id: string; title: string; date: Date; color: string; source: "task" | "custom"; };

type WeatherDay = {
  date: string;
  weatherCode: number;
  precipMm: number;
  maxTempC: number;
  minTempC: number;
  windKph: number;
};

type WeatherData = {
  location: string;
  days: WeatherDay[];
  fetchedAt: Date;
};

const EVENT_TYPE_CONFIG: Record<CustomEventType, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  meeting:    { label: "Meeting",    color: "#3b82f6", icon: Briefcase },
  inspection: { label: "Inspection", color: "#f59e0b", icon: ClipboardCheck },
  delivery:   { label: "Delivery",   color: "#22c55e", icon: Truck },
  permit:     { label: "Permit",     color: "#8b5cf6", icon: Calendar },
  other:      { label: "Other",      color: "#6b7280", icon: Calendar },
};

const STORAGE_KEY = "constra_schedule_events";

function loadCustomEvents(): CustomEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveCustomEvents(events: CustomEvent[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch {}
}

function wmoToLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 49) return "Fog";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow Showers";
  if (code <= 99) return "Thunder";
  return "Unknown";
}

function isWorkDisruptive(day: WeatherDay): "severe" | "moderate" | null {
  if (day.precipMm > 15 || (day.weatherCode >= 70 && day.weatherCode <= 79) || day.weatherCode >= 95) return "severe";
  if (day.precipMm > 5 || day.weatherCode >= 51) return "moderate";
  return null;
}

function WeatherIcon({ code, size = 14, className = "" }: { code: number; size?: number; className?: string }) {
  if (code === 0 || code === 1) return <Sun size={size} className={className} />;
  if (code <= 3) return <Cloud size={size} className={className} />;
  if (code >= 70 && code <= 79) return <CloudSnow size={size} className={className} />;
  if (code >= 80 && code <= 86) return <CloudSnow size={size} className={className} />;
  return <CloudRain size={size} className={className} />;
}

const DEFAULT_LAT = 43.7;
const DEFAULT_LON = -79.4;
const DEFAULT_LOCATION_NAME = "Toronto, ON";

const WEATHER_LOC_KEY = "constra_weather_location";
function loadSavedLocation(): { lat: number; lon: number; name: string } | null {
  try { const raw = localStorage.getItem(WEATHER_LOC_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveLocation(lat: number, lon: number, name: string) {
  try { localStorage.setItem(WEATHER_LOC_KEY, JSON.stringify({ lat, lon, name })); } catch {}
}

function fmtTemp(c: number, imperial: boolean) { return imperial ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°`; }
function fmtWind(kph: number, imperial: boolean) { return imperial ? `${Math.round(kph * 0.621)}mph` : `${Math.round(kph)}km/h`; }

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

export default function SchedulePage() {
  const { projects } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [locationName, setLocationName] = useState("Toronto, ON");
  const [weatherError, setWeatherError] = useState(false);
  const [imperial, setImperial] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [geoResults, setGeoResults] = useState<{ name: string; country: string; admin1?: string; lat: number; lon: number }[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [deleteEventConfirm, setDeleteEventConfirm] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ title: "", date: format(new Date(), "yyyy-MM-dd"), type: "meeting" as CustomEventType, description: "" });

  useEffect(() => {
    setCustomEvents(loadCustomEvents());
  }, []);

  const taskEvents: CalEvent[] = projects.flatMap((p) =>
    p.tasks.flatMap((t) => [
      { id: t.id + "-start", title: t.name + " (Start)", date: t.startDate, color: p.color, source: "task" as const },
      { id: t.id + "-end", title: t.name + " (Due)", date: t.endDate, color: p.color, source: "task" as const },
    ])
  );

  const customCalEvents: CalEvent[] = customEvents.map((e) => ({
    id: e.id,
    title: e.title,
    date: new Date(e.date + "T12:00:00"),
    color: e.color,
    source: "custom" as const,
  }));

  const calEvents: CalEvent[] = [...taskEvents, ...customCalEvents];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);
  const paddingDays = Array.from({ length: startPad }, (_, i) => i);

  const eventsOnDay = (day: Date) => calEvents.filter((e) => isSameDay(e.date, day));
  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  const fetchWeather = useCallback(async (latitude: number, longitude: number, name?: string) => {
    setWeatherLoading(true);
    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", latitude.toString());
      url.searchParams.set("longitude", longitude.toString());
      url.searchParams.set("daily", "weather_code,precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max");
      url.searchParams.set("timezone", "auto");
      url.searchParams.set("forecast_days", "14");
      const res = await fetch(url.toString());
      const json = await res.json();
      const d = json.daily;
      const days: WeatherDay[] = (d.time as string[]).map((date: string, i: number) => ({
        date,
        weatherCode: d.weather_code[i],
        precipMm: d.precipitation_sum[i],
        maxTempC: d.temperature_2m_max[i],
        minTempC: d.temperature_2m_min[i],
        windKph: d.wind_speed_10m_max[i],
      }));
      setWeather({ location: name ?? locationName, days, fetchedAt: new Date() });
      setWeatherError(false);
    } catch (err) {
      console.error("Weather fetch failed", err);
      setWeatherError(true);
    }
    setWeatherLoading(false);
  }, [locationName]);

  useEffect(() => {
    const fallbackFn = () => {
      const saved = loadSavedLocation();
      const loc = saved ?? { lat: DEFAULT_LAT, lon: DEFAULT_LON, name: DEFAULT_LOCATION_NAME };
      setLat(loc.lat); setLon(loc.lon); setLocationName(loc.name);
      fetchWeather(loc.lat, loc.lon, loc.name);
    };
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const name = "Your Location";
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
          setLocationName(name);
          fetchWeather(pos.coords.latitude, pos.coords.longitude, name);
        },
        fallbackFn
      );
    } else {
      fallbackFn();
    }
  }, []);

  function getWeatherForDay(day: Date): WeatherDay | null {
    if (!weather) return null;
    const key = format(day, "yyyy-MM-dd");
    return weather.days.find((d) => d.date === key) ?? null;
  }

  async function searchLocation(query: string) {
    if (!query.trim()) { setGeoResults([]); return; }
    setGeoLoading(true);
    try {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.searchParams.set("name", query.trim());
      url.searchParams.set("count", "6");
      url.searchParams.set("language", "en");
      url.searchParams.set("format", "json");
      const res = await fetch(url.toString());
      const json = await res.json();
      setGeoResults((json.results ?? []).map((r: { name: string; country: string; admin1?: string; latitude: number; longitude: number }) => ({
        name: r.name, country: r.country, admin1: r.admin1, lat: r.latitude, lon: r.longitude,
      })));
    } catch { setGeoResults([]); }
    setGeoLoading(false);
  }

  async function applyGeoResult(result: { name: string; country: string; admin1?: string; lat: number; lon: number }) {
    const label = [result.name, result.admin1, result.country].filter(Boolean).join(", ");
    setLat(result.lat); setLon(result.lon); setLocationName(label);
    saveLocation(result.lat, result.lon, label);
    setLocationInput(""); setGeoResults([]); setShowLocationPicker(false);
    await fetchWeather(result.lat, result.lon, label);
  }

  function openEditEvent(evt: CustomEvent) {
    setEditEventId(evt.id);
    setAddForm({ title: evt.title, date: evt.date, type: evt.type, description: evt.description ?? "" });
    setShowAddModal(true);
  }

  function handleAddEvent() {
    if (!addForm.title.trim() || !addForm.date) return;
    const cfg = EVENT_TYPE_CONFIG[addForm.type];
    if (editEventId) {
      const updated = customEvents.map((e) =>
        e.id === editEventId
          ? { ...e, title: addForm.title.trim(), date: addForm.date, type: addForm.type, description: addForm.description.trim() || undefined, color: cfg.color }
          : e
      );
      setCustomEvents(updated);
      saveCustomEvents(updated);
    } else {
      const newEvent: CustomEvent = {
        id: `evt-${Date.now()}`,
        title: addForm.title.trim(),
        date: addForm.date,
        type: addForm.type,
        description: addForm.description.trim() || undefined,
        color: cfg.color,
      };
      const updated = [...customEvents, newEvent];
      setCustomEvents(updated);
      saveCustomEvents(updated);
    }
    setAddForm({ title: "", date: format(new Date(), "yyyy-MM-dd"), type: "meeting", description: "" });
    setEditEventId(null);
    setShowAddModal(false);
  }

  function deleteCustomEvent(id: string) {
    const updated = customEvents.filter((e) => e.id !== id);
    setCustomEvents(updated);
    saveCustomEvents(updated);
  }

  const selectedWeather = selectedDay ? getWeatherForDay(selectedDay) : null;
  const disruption = selectedWeather ? isWorkDisruptive(selectedWeather) : null;

  return (
    <div className="space-y-5 max-w-[1000px]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white tracking-tight">Schedule</h2>
        <div className="flex items-center gap-2">
          {/* Weather location */}
          <div className="relative">
            <button
              onClick={() => setShowLocationPicker(!showLocationPicker)}
              className="flex items-center gap-1.5 bg-[#111] hover:bg-white/5 border border-white/[0.07] text-white/50 hover:text-white/80 text-[12px] px-3 py-2 rounded-lg transition-colors"
            >
              <MapPin size={12} />
              {locationName}
            </button>
            {showLocationPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => { setShowLocationPicker(false); setLocationInput(""); setGeoResults([]); }} />
                <div className="absolute right-0 top-full mt-2 z-20 bg-[#1a1a1a] border border-white/[0.1] rounded-xl p-3 w-72 shadow-2xl">
                <p className="text-[11px] text-white/40 mb-2">Search by city or town name</p>
                <input
                  autoFocus value={locationInput}
                  onChange={(e) => { setLocationInput(e.target.value); searchLocation(e.target.value); }}
                  placeholder="e.g. Toronto, Calgary…"
                  className="w-full bg-[#111] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-amber-500/40"
                  onKeyDown={(e) => e.key === "Escape" && setShowLocationPicker(false)}
                />
                {geoLoading && <p className="text-[11px] text-white/30 mt-2 text-center">Searching…</p>}
                {geoResults.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {geoResults.map((r, i) => (
                      <button key={i} onClick={() => applyGeoResult(r)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-white/[0.05] transition-colors">
                        <MapPin size={11} className="text-amber-400 flex-shrink-0" />
                        <div>
                          <p className="text-[12px] font-semibold text-white/80">{r.name}</p>
                          <p className="text-[10px] text-white/35">{[r.admin1, r.country].filter(Boolean).join(", ")}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {!geoLoading && locationInput.length > 1 && geoResults.length === 0 && (
                  <p className="text-[11px] text-white/25 mt-2 text-center">No results found</p>
                )}
              </div>
              </>
            )}
          </div>

          {weather && (
            <>
              <button
                onClick={() => setImperial((v) => !v)}
                className="text-[11px] font-bold text-white/40 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.07] px-2.5 py-1.5 rounded-lg transition-colors"
                title="Toggle temperature units"
              >
                {imperial ? "°F" : "°C"}
              </button>
              <button onClick={() => fetchWeather(lat, lon)} disabled={weatherLoading}
                className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors" title="Refresh weather">
                <RefreshCw size={14} className={weatherLoading ? "animate-spin" : ""} />
              </button>
            </>
          )}

          <span className="text-[12px] text-white/35">{calEvents.length} events</span>
          <button
            onClick={() => { setEditEventId(null); setAddForm({ title: "", date: selectedDay ? format(selectedDay, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"), type: "meeting", description: "" }); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Add Event
          </button>
        </div>
      </div>

      {weatherError && !weatherLoading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/8 border border-red-500/15 rounded-xl text-[12px] text-red-400">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>Could not load weather — check your connection or try a different location.</span>
          <button onClick={() => fetchWeather(lat, lon)} className="ms-auto text-red-300 hover:text-red-200 font-semibold underline">Retry</button>
        </div>
      )}

      {weather && (
        <div className="bg-[#111] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={10} /> {weather.location} — 14-Day Forecast
            </span>
            <span className="text-[10px] text-white/25">Updated {format(weather.fetchedAt, "h:mm a")}</span>
          </div>
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(14, minmax(46px, 1fr))", minWidth: 660 }}>
              {weather.days.slice(0, 14).map((d) => {
                const disrupts = isWorkDisruptive(d);
                return (
                  <div key={d.date}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg ${disrupts === "severe" ? "bg-red-500/10 border border-red-500/20" : disrupts === "moderate" ? "bg-amber-500/8 border border-amber-500/15" : "bg-white/[0.03]"}`}>
                    <span className="text-[9px] text-white/30 font-semibold">{format(new Date(d.date + "T12:00:00"), "EEE")}</span>
                    <span className="text-[9px] text-white/25">{format(new Date(d.date + "T12:00:00"), "d")}</span>
                    <WeatherIcon code={d.weatherCode} size={14} className={disrupts === "severe" ? "text-red-400" : disrupts === "moderate" ? "text-amber-400" : "text-white/40"} />
                    {d.precipMm > 0 && (
                      <span className={`text-[9px] font-semibold ${disrupts === "severe" ? "text-red-400" : "text-blue-400"}`}>{d.precipMm.toFixed(0)}mm</span>
                    )}
                    <span className="text-[9px] text-white/30">{fmtTemp(d.maxTempC, imperial)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.05]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
              <span className="text-[10px] text-white/35">Work disruption</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500/15 border border-amber-500/20" />
              <span className="text-[10px] text-white/35">Possible delays</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
                  <span className="text-[9px] text-white/30">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-[15px] font-bold text-white">{format(currentMonth, "MMMM yyyy")}</h3>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="min-w-[480px]">
          <div className="grid grid-cols-7 border-b border-white/[0.06]">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-white/25 py-2.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {paddingDays.map((i) => (
              <div key={`pad-${i}`} className="h-24 border-r border-b border-white/[0.04] bg-white/[0.01]" />
            ))}
            {days.map((day) => {
              const dayEvents = eventsOnDay(day);
              const today = isToday(day);
              const isSelected = selectedDay && isSameDay(selectedDay, day);
              const dayWeather = getWeatherForDay(day);
              const disrupts = dayWeather ? isWorkDisruptive(dayWeather) : null;
              return (
                <div key={day.toISOString()}
                  className={`h-24 border-r border-b border-white/[0.04] p-1.5 cursor-pointer transition-colors relative ${isSelected ? "bg-amber-500/[0.08]" : disrupts === "severe" ? "bg-red-500/[0.04] hover:bg-red-500/[0.07]" : disrupts === "moderate" ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]" : "hover:bg-white/[0.02]"}`}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${today ? "bg-amber-500 text-black" : "text-white/50"}`}>
                      {format(day, "d")}
                    </div>
                    {dayWeather && (disrupts || dayWeather.precipMm > 0) && (
                      <div className="flex items-center gap-0.5" title={`${wmoToLabel(dayWeather.weatherCode)} · ${dayWeather.precipMm}mm`}>
                        {disrupts === "severe" && <AlertTriangle size={9} className="text-red-400" />}
                        <WeatherIcon code={dayWeather.weatherCode} size={10}
                          className={disrupts === "severe" ? "text-red-400" : disrupts === "moderate" ? "text-amber-400" : "text-blue-400"} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div key={e.id} className="text-[9px] font-semibold px-1.5 py-0.5 rounded truncate"
                        style={{ backgroundColor: e.color + "25", color: e.color }}>
                        {e.source === "task" ? e.title.replace(" (Start)", "★").replace(" (Due)", "✓") : e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <p className="text-[9px] text-white/25 px-1">+{dayEvents.length - 2} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {calEvents.length === 0 && (
        <div className="text-center py-6 text-white/25 text-[13px]">
          No events yet — add tasks to projects or click "Add Event" above
        </div>
      )}

      {selectedDay && (
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[14px] font-bold text-white">{format(selectedDay, "EEEE, MMMM d, yyyy")}</h4>
            <button
              onClick={() => { setEditEventId(null); setAddForm({ title: "", date: format(selectedDay, "yyyy-MM-dd"), type: "meeting", description: "" }); setShowAddModal(true); }}
              className="flex items-center gap-1.5 text-[12px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} /> Add Event
            </button>
          </div>

          {selectedWeather && (
            <div className={`mb-4 p-3 rounded-xl flex items-center gap-4 ${disruption === "severe" ? "bg-red-500/10 border border-red-500/20" : disruption === "moderate" ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/[0.04]"}`}>
              <WeatherIcon code={selectedWeather.weatherCode} size={24}
                className={disruption === "severe" ? "text-red-400" : disruption === "moderate" ? "text-amber-400" : "text-white/50"} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-white/80">{wmoToLabel(selectedWeather.weatherCode)}</span>
                  {disruption && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${disruption === "severe" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>
                      {disruption === "severe" ? "⚠ Work Disruption" : "⚠ Possible Delays"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-white/35">
                  <span>{fmtTemp(selectedWeather.minTempC, imperial)} – {fmtTemp(selectedWeather.maxTempC, imperial)}</span>
                  {selectedWeather.precipMm > 0 && <span className="flex items-center gap-1"><CloudRain size={10} />{selectedWeather.precipMm.toFixed(1)}mm</span>}
                  {selectedWeather.windKph > 0 && <span className="flex items-center gap-1"><Wind size={10} />{fmtWind(selectedWeather.windKph, imperial)}</span>}
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-2">
            {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-[12px] text-white/30 italic">No events on this day</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e) => {
                const customEvt = customEvents.find((c) => c.id === e.id);
                return (
                  <div key={e.id} className="flex items-center gap-3 group">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-white/70">{e.title}</span>
                      {customEvt?.description && (
                        <p className="text-[11px] text-white/35 truncate">{customEvt.description}</p>
                      )}
                    </div>
                    {customEvt && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => openEditEvent(customEvt)}
                          className="p-1 rounded text-white/25 hover:text-white/60 transition-colors">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => setDeleteEventConfirm(e.id)}
                          className="p-1 rounded text-white/25 hover:text-red-400 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">{editEventId ? "Edit Event" : "Add Event"}</h3>
              <button onClick={() => { setShowAddModal(false); setEditEventId(null); }} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Event Title *</label>
                <input className={inp} placeholder="e.g. Site inspection with engineer"
                  value={addForm.title} onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleAddEvent()} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Date *</label>
                  <input className={inp} type="date" value={addForm.date}
                    onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Type</label>
                  <select className={inp} value={addForm.type}
                    onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value as CustomEventType }))}>
                    {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Notes (optional)</label>
                <textarea className={inp + " resize-none"} rows={2} placeholder="Details, attendees, location…"
                  value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: EVENT_TYPE_CONFIG[addForm.type].color + "18" }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EVENT_TYPE_CONFIG[addForm.type].color }} />
                <span className="text-[12px]" style={{ color: EVENT_TYPE_CONFIG[addForm.type].color }}>
                  {EVENT_TYPE_CONFIG[addForm.type].label} · Will appear on the calendar
                </span>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setShowAddModal(false); setEditEventId(null); }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">Cancel</button>
              <button onClick={handleAddEvent} disabled={!addForm.title.trim() || !addForm.date}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editEventId ? "Save Changes" : "Add to Calendar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteEventConfirm}
        title="Delete Event"
        body="Delete this scheduled event? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteEventConfirm) deleteCustomEvent(deleteEventConfirm); setDeleteEventConfirm(null); }}
        onCancel={() => setDeleteEventConfirm(null)}
      />
    </div>
  );
}
