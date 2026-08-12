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
  const c = color ?? "#F5C400";
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:32px;height:40px;">
        <!-- Drop shadow -->
        <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:12px;height:6px;background:rgba(0,0,0,0.4);border-radius:50%;filter:blur(3px);"></div>
        <!-- Pin body -->
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0;">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="${c}"/>
          <circle cx="16" cy="16" r="7" fill="white" fill-opacity="0.9"/>
          <circle cx="16" cy="16" r="4" fill="${c}"/>
        </svg>
      </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
  });
}

export default function MapViewInner({
  pins,
  className = "",
  zoom,
}: {
  pins: MapPin[];
  className?: string;
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: zoom ?? 2,
      zoomControl: true,
      attributionControl: true,
    });

    // ESRI World Imagery — high-res satellite, free, no API key
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        maxZoom: 19,
      }
    ).addTo(map);

    // Road/label overlay on top of satellite
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "",
        maxZoom: 19,
        opacity: 0.7,
      }
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (pins.length === 0) return;

    const bounds: L.LatLngTuple[] = [];

    pins.forEach((pin) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: makeIcon(pin.color ?? "#F5C400"),
      });

      const popupHtml = `
        <div style="font-family:system-ui;padding:4px 2px;min-width:160px;">
          <div style="font-weight:700;font-size:13px;color:#111;line-height:1.3">${pin.label}</div>
          ${pin.sublabel ? `<div style="font-size:11px;color:#555;margin-top:2px">${pin.sublabel}</div>` : ""}
          <div style="font-size:10px;color:#999;margin-top:5px;font-variant-numeric:tabular-nums">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</div>
        </div>`;

      marker.bindPopup(popupHtml, { maxWidth: 220, className: "constra-popup" });
      marker.addTo(map);
      bounds.push([pin.lat, pin.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], zoom ?? 16);
    } else {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [pins, zoom]);

  return (
    <>
      <style>{`
        .constra-popup .leaflet-popup-content-wrapper {
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.18);
          border: none;
          padding: 0;
        }
        .constra-popup .leaflet-popup-content {
          margin: 10px 14px;
        }
        .constra-popup .leaflet-popup-tip {
          background: #fff;
        }
        .leaflet-attribution-flag { display: none !important; }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(0,0,0,0.45) !important;
          color: rgba(255,255,255,0.5) !important;
          backdrop-filter: blur(4px);
        }
        .leaflet-control-attribution a { color: rgba(255,255,255,0.6) !important; }
      `}</style>
      <div ref={containerRef} className={className} style={{ background: "#1a1a1a" }} />
    </>
  );
}
