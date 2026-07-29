"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "./map-view-inner";

export type { MapPin };

const MapViewInner = dynamic(() => import("./map-view-inner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#111] rounded-xl">
      <span className="text-white/30 text-sm">Loading map…</span>
    </div>
  ),
});

export function MapView({ pins, className }: { pins: MapPin[]; className?: string }) {
  return <MapViewInner pins={pins} className={className} />;
}
