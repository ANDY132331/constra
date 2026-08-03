"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, X, RotateCcw, AlertTriangle, CheckCircle2, Loader2, MapPin, FlipHorizontal } from "lucide-react";
import type { GpsLocation } from "@/lib/mock-data";

type Props = {
  workerName: string;
  onCapture: (dataUrl: string, gps?: GpsLocation) => void;
  onClose: () => void;
};

type CameraState = "requesting" | "ready" | "captured" | "error";
type GpsState = "idle" | "fetching" | "ok" | "denied" | "unavailable";

export function CameraCapture({ workerName, onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("requesting");
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [gps, setGps] = useState<GpsLocation | undefined>(undefined);
  const [gpsState, setGpsState] = useState<GpsState>("idle");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsState("unavailable");
      return;
    }
    setGpsState("fetching");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGpsState("ok");
      },
      () => {
        setGpsState("denied");
      },
      { timeout: 8000, maximumAge: 30000, enableHighAccuracy: true }
    );
  }, []);

  const startCamera = useCallback(async (facing?: "user" | "environment") => {
    stopStream();
    setCameraState("requesting");
    setErrorMsg("");
    const mode = facing ?? facingMode;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");
    } catch (err: unknown) {
      const e = err as Error;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setErrorMsg("Camera access denied. Please allow camera access in your browser settings and try again.");
      } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
        setErrorMsg("No camera found on this device.");
      } else if (e.name === "NotReadableError" || e.name === "TrackStartError") {
        setErrorMsg("Camera is already in use by another application.");
      } else if (e.name === "OverconstrainedError") {
        setErrorMsg("Camera does not meet the required specifications.");
      } else {
        setErrorMsg(`Camera unavailable: ${e.message}`);
      }
      setCameraState("error");
    }
  }, [stopStream, facingMode]);

  useEffect(() => {
    startCamera();
    requestGps();
    return () => stopStream();
  }, [startCamera, requestGps, stopStream]);

  const flipCamera = useCallback(() => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const capture = useCallback((): void => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const rawW = video.videoWidth || 640;
    const rawH = video.videoHeight || 480;
    const MAX = 1280;
    const scale = Math.min(MAX / rawW, MAX / rawH, 1);
    const w = Math.round(rawW * scale);
    const h = Math.round(rawH * scale);
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror the canvas for front camera (undoes CSS flip so stored image is correct)
    if (facingMode === "user") {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -w, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, w, h);
    }

    // Burn timestamp + name + GPS into image
    const ts = new Date().toLocaleString("en-CA", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const gpsLabel = gps
      ? `GPS ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} ±${gps.accuracy}m`
      : "GPS unavailable";
    const lines = [`${workerName} · ${ts}`, gpsLabel];
    const lineH = 18;
    const barH = lineH * lines.length + 12;
    ctx.fillStyle = "rgba(0,0,0,0.60)";
    ctx.fillRect(0, h - barH, w, barH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    lines.forEach((line, i) => {
      ctx.fillText(line, 10, h - barH + 14 + i * lineH);
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    setPreview(dataUrl);
    stopStream();
    setCameraState("captured");
  }, [workerName, gps, stopStream, facingMode]);

  const retake = useCallback(() => {
    setPreview(null);
    startCamera();
  }, [startCamera]);

  const confirm = useCallback(() => {
    if (preview) onCapture(preview, gps);
  }, [preview, gps, onCapture]);

  const gpsIndicator = () => {
    if (gpsState === "fetching") return (
      <div className="flex items-center gap-1.5 text-[10px] text-white/40">
        <Loader2 size={10} className="animate-spin" />
        Getting GPS…
      </div>
    );
    if (gpsState === "ok" && gps) return (
      <div className="flex items-center gap-1.5 text-[10px] text-green-400">
        <MapPin size={10} />
        ±{gps.accuracy}m accuracy
      </div>
    );
    if (gpsState === "denied" || gpsState === "unavailable") return (
      <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70">
        <MapPin size={10} />
        GPS not available
      </div>
    );
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-sm max-h-[90dvh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-[15px] font-bold text-white">Clock-In Photo</h3>
            <p className="text-[11px] text-white/35 mt-0.5">Live photo required — no uploads allowed</p>
          </div>
          <button
            onClick={() => { stopStream(); onClose(); }}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
          {/* Loading */}
          {cameraState === "requesting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="text-amber-500 animate-spin" />
              <p className="text-[12px] text-white/40">Starting camera…</p>
            </div>
          )}

          {/* Error */}
          {cameraState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <p className="text-[13px] text-white/60 leading-snug">{errorMsg}</p>
              <button
                onClick={() => startCamera()}
                className="text-[12px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-4 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Live video */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
            style={{
              display: cameraState === "ready" ? "block" : "none",
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
            }}
          />

          {/* Captured preview */}
          {cameraState === "captured" && preview && (
            <img src={preview} alt="Clock-in photo" className="w-full h-full object-cover" />
          )}

          {/* LIVE badge */}
          {cameraState === "ready" && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 text-[10px] font-bold text-white px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </div>
          )}

          {/* GPS indicator + flip camera button */}
          {cameraState === "ready" && (
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5">
              <button
                onClick={flipCamera}
                className="flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white/70 hover:text-white px-2 py-1 rounded transition-colors"
                title="Flip camera"
              >
                <FlipHorizontal size={13} />
                <span className="text-[10px] font-medium">Flip</span>
              </button>
              <div className="bg-black/60 px-2 py-1 rounded">
                {gpsIndicator()}
              </div>
            </div>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Actions */}
        <div className="p-5">
          {cameraState === "ready" && (
            <button
              onClick={capture}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] py-3 rounded-xl transition-colors"
            >
              <Camera size={15} />
              Take Photo to Clock In
            </button>
          )}

          {cameraState === "captured" && (
            <div className="flex gap-3">
              <button
                onClick={retake}
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/8 text-white/60 font-bold text-[13px] py-3 rounded-xl transition-colors"
              >
                <RotateCcw size={13} />
                Retake
              </button>
              <button
                onClick={confirm}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500/15 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-[13px] py-3 rounded-xl transition-colors"
              >
                <CheckCircle2 size={14} />
                Confirm
              </button>
            </div>
          )}

          {(cameraState === "requesting" || cameraState === "error") && (
            <div className="h-[50px]" />
          )}
        </div>
      </div>
    </div>
  );
}
