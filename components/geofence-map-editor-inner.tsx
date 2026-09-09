"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";

/** Metres east of (lat, lng) at distance rM */
function eastEdge(lat: number, lng: number, rM: number): [number, number] {
  return [lat, lng + rM / (111_320 * Math.cos((lat * Math.PI) / 180))];
}

/** Human-readable radius label */
function fmtR(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2).replace(/\.?0+$/, "")} km` : `${Math.round(m)} m`;
}

export default function GeofenceMapEditorInner({
  lat,
  lng,
  radiusM,
  color,
  onChange,
}: {
  lat: number;
  lng: number;
  radiusM: number;
  color: string;
  onChange: (lat: number, lng: number, radiusM: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  // Keep latest callback in ref so event handlers don't close over stale values
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // ── compute a sensible initial zoom ───────────────────────────────────────
    const z =
      radiusM >= 10_000 ? 10 :
      radiusM >= 5_000  ? 12 :
      radiusM >= 2_000  ? 13 :
      radiusM >= 1_000  ? 14 :
      radiusM >= 500    ? 15 :
      radiusM >= 200    ? 16 : 17;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: z,
      zoomControl: true,
      attributionControl: true,
    });

    // Satellite base layer
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri", maxZoom: 19 }
    ).addTo(map);

    // Street/label overlay
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, opacity: 0.75 }
    ).addTo(map);

    // ── geofence circle ───────────────────────────────────────────────────────
    const circle = L.circle([lat, lng], {
      radius: radiusM,
      color,
      fillColor: color,
      fillOpacity: 0.13,
      weight: 2.5,
      opacity: 0.85,
    }).addTo(map);

    // ── center pin (draggable) ────────────────────────────────────────────────
    const centerIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:22px;height:22px;
        background:${color};
        border:3px solid #fff;
        border-radius:50%;
        box-shadow:0 2px 10px rgba(0,0,0,0.55);
        cursor:move;
      "></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    const centerMarker = L.marker([lat, lng], {
      icon: centerIcon,
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(map);

    // ── edge handle (draggable, placed east of center) ────────────────────────
    const edgeIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:18px;height:18px;
        background:#fff;
        border:2.5px solid ${color};
        border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
        cursor:ew-resize;
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.5 4.5H6.5M5.5 2.5L7.5 4.5L5.5 6.5M3.5 2.5L1.5 4.5L3.5 6.5" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const initialEdge = eastEdge(lat, lng, radiusM);
    const edgeMarker = L.marker(initialEdge, {
      icon: edgeIcon,
      draggable: true,
      zIndexOffset: 1001,
    }).addTo(map);

    // ── dashed line center → edge ─────────────────────────────────────────────
    let line = L.polyline(
      [[lat, lng], initialEdge],
      { color, weight: 1.5, dashArray: "5 5", opacity: 0.6 }
    ).addTo(map);

    // ── radius tooltip attached to circle ─────────────────────────────────────
    circle.bindTooltip(fmtR(radiusM), {
      permanent: true,
      direction: "top",
      className: "geofence-radius-tooltip",
    });

    // ── mutable state inside closure ──────────────────────────────────────────
    let cLat = lat, cLng = lng, cR = radiusM;

    function rebuildLine() {
      map.removeLayer(line);
      line = L.polyline(
        [[cLat, cLng], edgeMarker.getLatLng()],
        { color, weight: 1.5, dashArray: "5 5", opacity: 0.6 }
      ).addTo(map);
    }

    // Center drag
    centerMarker.on("drag", (e) => {
      const ll = (e as L.LeafletMouseEvent).latlng;
      cLat = ll.lat; cLng = ll.lng;
      circle.setLatLng(ll);
      const newEdge = eastEdge(cLat, cLng, cR);
      edgeMarker.setLatLng(newEdge);
      rebuildLine();
    });
    centerMarker.on("dragend", () => cbRef.current(cLat, cLng, cR));

    // Edge drag — resize circle
    edgeMarker.on("drag", (e) => {
      const edgeLL = (e as L.LeafletMouseEvent).latlng;
      const dist = L.latLng(cLat, cLng).distanceTo(edgeLL);
      cR = Math.max(50, dist);
      circle.setRadius(cR);
      circle.setTooltipContent(fmtR(cR));
      rebuildLine();
    });
    edgeMarker.on("dragend", () => cbRef.current(cLat, cLng, cR));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once — props are consumed only at init; onChange kept via ref

  return (
    <>
      <style>{`
        .geofence-radius-tooltip {
          background: rgba(0,0,0,0.72);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          white-space: nowrap;
        }
        .geofence-radius-tooltip::before { display: none; }
        .leaflet-attribution-flag { display: none !important; }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(0,0,0,0.45) !important;
          color: rgba(255,255,255,0.45) !important;
          backdrop-filter: blur(4px);
        }
        .leaflet-control-attribution a { color: rgba(255,255,255,0.55) !important; }
      `}</style>
      <div ref={containerRef} className="w-full h-full" style={{ background: "#1a1a1a" }} />
    </>
  );
}
