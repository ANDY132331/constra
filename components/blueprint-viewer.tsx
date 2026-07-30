"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, Plus, X, Check, AlertTriangle, Info, ShieldAlert, MessageSquare } from "lucide-react";
import type { BlueprintPin } from "@/lib/mock-data";

const PIN_TYPES = [
  { value: "issue",  label: "Issue",  color: "#ef4444", icon: AlertTriangle },
  { value: "safety", label: "Safety", color: "#f59e0b", icon: ShieldAlert },
  { value: "rfi",    label: "RFI",    color: "#8b5cf6", icon: MessageSquare },
  { value: "info",   label: "Info",   color: "#60a5fa", icon: Info },
] as const;

type PinType = typeof PIN_TYPES[number]["value"];

type Props = {
  fileUrl: string;
  fileType: "pdf" | "image";
  documentId: string;
  pins: BlueprintPin[];
  onAddPin: (pin: Omit<BlueprintPin, "id" | "createdAt">) => void;
  onUpdatePin: (id: string, u: Partial<BlueprintPin>) => void;
  onDeletePin: (id: string) => void;
};

export function BlueprintViewer({ fileUrl, fileType, documentId, pins, onAddPin, onUpdatePin, onDeletePin }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });

  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [pdfPages, setPdfPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [rendering, setRendering] = useState(false);

  // Placement mode
  const [placingPin, setPlacingPin] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [newPinType, setNewPinType] = useState<PinType>("issue");
  const [newPinNote, setNewPinNote] = useState("");

  // Selected pin popover
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  // ── PDF rendering ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (fileType !== "pdf" || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      setRendering(true);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdf = await (pdfjsLib as any).getDocument({ url: fileUrl }).promise;
        if (cancelled) return;
        setPdfPages(pdf.numPages);

        const page = await pdf.getPage(currentPage);
        if (cancelled) return;

        const vp = page.getViewport({ scale: 2 });
        const canvas = canvasRef.current!;
        canvas.width = vp.width;
        canvas.height = vp.height;
        setCanvasSize({ w: vp.width, h: vp.height });

        const ctx = canvas.getContext("2d")!;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
      } catch (e) {
        console.error("PDF render error", e);
      } finally {
        if (!cancelled) setRendering(false);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [fileUrl, fileType, currentPage]);

  // Image size detection
  useEffect(() => {
    if (fileType !== "image" || !imgRef.current) return;
    const img = imgRef.current;
    const update = () => setCanvasSize({ w: img.naturalWidth || img.offsetWidth, h: img.naturalHeight || img.offsetHeight });
    if (img.complete) update();
    img.addEventListener("load", update);
    return () => img.removeEventListener("load", update);
  }, [fileUrl, fileType]);

  // ── Pan handlers ─────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (placingPin) return;
    if ((e.target as HTMLElement).closest("[data-pin]")) return;
    e.preventDefault();
    setPanning(true);
    setPanStart({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y });
  }, [pan, placingPin]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!panning) return;
    setPan({ x: panStart.px + (e.clientX - panStart.mx), y: panStart.py + (e.clientY - panStart.my) });
  }, [panning, panStart]);

  const onMouseUp = useCallback(() => setPanning(false), []);

  // ── Zoom handler (zoom toward cursor position) ───────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    const rect = outerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setZoom((z) => {
      const newZoom = Math.min(8, Math.max(0.2, z * factor));
      const actualFactor = newZoom / z;
      setPan((p) => ({
        x: mx - (mx - p.x) * actualFactor,
        y: my - (my - p.y) * actualFactor,
      }));
      return newZoom;
    });
  }, []);

  // ── Place pin on click ───────────────────────────────────────────────────────
  const onCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!placingPin) return;
    if ((e.target as HTMLElement).closest("[data-pin]")) return;
    const rect = innerRef.current!.getBoundingClientRect();
    const px = (e.clientX - rect.left) / zoom;
    const py = (e.clientY - rect.top) / zoom;
    setPendingPin({ x: px / canvasSize.w, y: py / canvasSize.h });
    setNewPinNote("");
  }, [placingPin, zoom, canvasSize]);

  const confirmPin = () => {
    if (!pendingPin) return;
    onAddPin({
      documentId,
      page: currentPage,
      x: pendingPin.x,
      y: pendingPin.y,
      type: newPinType,
      note: newPinNote,
      resolved: false,
    });
    setPendingPin(null);
    setPlacingPin(false);
  };

  const cancelPending = () => { setPendingPin(null); setPlacingPin(false); };

  const zoomIn = () => setZoom((z) => Math.min(8, z * 1.25));
  const zoomOut = () => setZoom((z) => Math.max(0.2, z / 1.25));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const pagePins = pins.filter((p) => p.documentId === documentId && p.page === currentPage);

  return (
    <div className="flex flex-col h-full bg-[#080808] rounded-xl overflow-hidden border border-white/[0.06]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-[#0d0d0d] flex-shrink-0">
        {/* Zoom controls */}
        <button onClick={zoomOut} className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center transition-colors"><ZoomOut size={13} /></button>
        <span className="text-[11px] text-white/40 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={zoomIn} className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center transition-colors"><ZoomIn size={13} /></button>
        <button onClick={resetView} className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center transition-colors"><Maximize2 size={12} /></button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Page controls (PDF only) */}
        {fileType === "pdf" && pdfPages > 1 && (
          <>
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="text-[11px] px-2 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 disabled:opacity-30 transition-colors">←</button>
            <span className="text-[11px] text-white/40">{currentPage} / {pdfPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(pdfPages, p + 1))} disabled={currentPage === pdfPages} className="text-[11px] px-2 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 disabled:opacity-30 transition-colors">→</button>
            <div className="w-px h-4 bg-white/10 mx-1" />
          </>
        )}

        {/* Pin mode */}
        <button
          onClick={() => { setPlacingPin((v) => !v); setPendingPin(null); }}
          className={`flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-semibold transition-colors ${placingPin ? "bg-amber-500 text-black" : "bg-white/[0.05] hover:bg-white/10 text-white/70"}`}
        >
          <Plus size={12} /> {placingPin ? "Click to place…" : "Add Pin"}
        </button>

        {/* Pin legend */}
        <div className="ml-auto flex items-center gap-3">
          {PIN_TYPES.map(({ value, label, color }) => (
            <div key={value} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] text-white/30">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={outerRef}
        className="flex-1 overflow-hidden relative select-none"
        style={{ cursor: placingPin ? "crosshair" : panning ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onClick={onCanvasClick}
      >
        {/* Inner transformed container */}
        <div
          ref={innerRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0, left: 0,
            width: canvasSize.w,
            height: canvasSize.h,
          }}
        >
          {fileType === "pdf"
            ? <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
            : <img ref={imgRef} src={fileUrl} alt="Blueprint" style={{ display: "block", maxWidth: "none", width: canvasSize.w }} draggable={false} />
          }

          {/* Existing pins */}
          {pagePins.map((pin) => {
            const meta = PIN_TYPES.find((t) => t.value === pin.type) ?? PIN_TYPES[0];
            const isSelected = selectedPin === pin.id;
            return (
              <div
                key={pin.id}
                data-pin
                onClick={(e) => { e.stopPropagation(); setSelectedPin(isSelected ? null : pin.id); }}
                style={{
                  position: "absolute",
                  left: pin.x * canvasSize.w,
                  top: pin.y * canvasSize.h,
                  transform: "translate(-50%, -100%)",
                  zIndex: 10,
                }}
              >
                {/* Pin marker */}
                <div
                  className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    background: meta.color,
                    opacity: pin.resolved ? 0.4 : 1,
                  }}
                >
                  <meta.icon size={12} className="text-white" />
                </div>
                {/* Stem */}
                <div className="w-0.5 h-2 mx-auto" style={{ background: meta.color, opacity: pin.resolved ? 0.4 : 1 }} />

                {/* Popover */}
                {isSelected && (
                  <div
                    data-pin
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 bg-[#1a1a1a] border border-white/10 rounded-xl p-3 shadow-2xl"
                    style={{ zIndex: 20 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</span>
                      <button onClick={() => setSelectedPin(null)} className="text-white/30 hover:text-white/70"><X size={12} /></button>
                    </div>
                    <p className="text-[12px] text-white/70 mb-3">{pin.note || <span className="italic text-white/30">No note</span>}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onUpdatePin(pin.id, { resolved: !pin.resolved }); setSelectedPin(null); }}
                        className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-lg transition-colors ${pin.resolved ? "bg-white/[0.05] text-white/40 hover:bg-white/10" : "bg-green-500/20 text-green-400 hover:bg-green-500/30"}`}
                      >
                        <Check size={10} /> {pin.resolved ? "Reopen" : "Resolve"}
                      </button>
                      <button
                        onClick={() => { onDeletePin(pin.id); setSelectedPin(null); }}
                        className="flex items-center justify-center w-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Pending pin (before confirming) */}
          {pendingPin && (
            <div
              data-pin
              style={{
                position: "absolute",
                left: pendingPin.x * canvasSize.w,
                top: pendingPin.y * canvasSize.h,
                transform: "translate(-50%, -100%)",
                zIndex: 30,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-7 h-7 rounded-full bg-amber-500 border-2 border-black flex items-center justify-center shadow-lg animate-pulse">
                <Plus size={12} className="text-black" />
              </div>
              <div className="w-0.5 h-2 mx-auto bg-amber-500" />
              {/* Quick-add form */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-[#1a1a1a] border border-amber-500/30 rounded-xl p-3 shadow-2xl">
                <p className="text-[10px] font-bold text-amber-400 mb-2 uppercase tracking-wider">New Pin</p>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {PIN_TYPES.map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => setNewPinType(value)}
                      className="text-[10px] px-2 py-1 rounded-lg font-semibold transition-colors"
                      style={{
                        background: newPinType === value ? color + "30" : "rgba(255,255,255,0.04)",
                        color: newPinType === value ? color : "rgba(255,255,255,0.4)",
                        border: `1px solid ${newPinType === value ? color + "60" : "transparent"}`,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  autoFocus
                  value={newPinNote}
                  onChange={(e) => setNewPinNote(e.target.value)}
                  placeholder="Describe the issue…"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 resize-none mb-2"
                  rows={2}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmPin(); } if (e.key === "Escape") cancelPending(); }}
                />
                <div className="flex gap-2">
                  <button onClick={confirmPin} className="flex-1 bg-amber-500 text-black text-[10px] font-bold py-1.5 rounded-lg hover:bg-amber-400 transition-colors">Place</button>
                  <button onClick={cancelPending} className="flex-1 bg-white/[0.05] text-white/40 text-[10px] font-bold py-1.5 rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading overlay */}
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-[13px] text-white/50 animate-pulse">Rendering…</div>
          </div>
        )}
      </div>
    </div>
  );
}
