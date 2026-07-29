"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";

export type MapPin = {
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  color?: string;
};

function makeIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

export default function MapViewInner({
  pins,
  className = "",
}: {
  pins: MapPin[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (pins.length === 0) return;

    const bounds: L.LatLngTuple[] = [];

    pins.forEach((pin) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: makeIcon(pin.color ?? "#f59e0b"),
      });

      const popupHtml = `
        <div style="font-family:system-ui;padding:2px 0">
          <div style="font-weight:700;font-size:13px;color:#111">${pin.label}</div>
          ${pin.sublabel ? `<div style="font-size:11px;color:#666;margin-top:2px">${pin.sublabel}</div>` : ""}
          <div style="font-size:10px;color:#999;margin-top:4px">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</div>
        </div>`;

      marker.bindPopup(popupHtml, { maxWidth: 200 });
      marker.addTo(map);
      bounds.push([pin.lat, pin.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [pins]);

  return <div ref={containerRef} className={className} style={{ background: "#1a1a1a" }} />;
}
