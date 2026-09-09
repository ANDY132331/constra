"use client";

import dynamic from "next/dynamic";

const GeofenceMapEditorInner = dynamic(
  () => import("./geofence-map-editor-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#111] rounded-xl">
        <span className="text-white/30 text-[12px]">Loading map…</span>
      </div>
    ),
  }
);

export function GeofenceMapEditor({
  lat,
  lng,
  radiusM,
  color,
  onChange,
  className,
}: {
  lat: number;
  lng: number;
  radiusM: number;
  color: string;
  onChange: (lat: number, lng: number, radiusM: number) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <GeofenceMapEditorInner
        lat={lat}
        lng={lng}
        radiusM={radiusM}
        color={color}
        onChange={onChange}
      />
    </div>
  );
}
