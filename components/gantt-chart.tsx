"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  addDays,
  differenceInDays,
  eachDayOfInterval,
  format,
  isToday,
  isWeekend,
  startOfDay,
} from "date-fns";
import type { JSX } from "react";

const DAY_WIDTH = 38;
const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 52;
const LEFT_PANEL_W = 480;
const TOTAL_DAYS = 70;

export type GanttTask = {
  id: string;
  name: string;
  progress: number;
  workerName: string;
  workerColor: string;
  workerInitials: string;
  startDate: Date;
  endDate: Date;
  color: string;
  status: string;
  dependsOn?: string;
};

export type GanttProject = {
  id: string;
  name: string;
  clientName: string;
  accentColor: string;
  tasks: GanttTask[];
};

type DragState = {
  projectId: string;
  taskId: string;
  type: "move" | "resize";
  startX: number;
  originalStart: Date;
  originalEnd: Date;
};

function statusColor(status: string, base: string) {
  if (status === "completed") return base + "80";
  if (status === "delayed") return "#ef4444";
  return base;
}

export function GanttChart({
  projects,
  onTaskDatesChange,
}: {
  projects: GanttProject[];
  onTaskDatesChange?: (projectId: string, taskId: string, startDate: Date, endDate: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = useState(0); // in days

  const viewStart = useMemo(() => {
    const d = addDays(new Date(), -10);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const allDates = useMemo(
    () =>
      eachDayOfInterval({
        start: viewStart,
        end: addDays(viewStart, TOTAL_DAYS - 1),
      }),
    [viewStart]
  );

  const todayOffset = differenceInDays(startOfDay(new Date()), viewStart);

  const getBar = useCallback(
    (task: { startDate: Date; endDate: Date }) => {
      const startOff = differenceInDays(startOfDay(task.startDate), viewStart);
      const endOff = differenceInDays(startOfDay(task.endDate), viewStart);
      const left = startOff * DAY_WIDTH;
      const width = (endOff - startOff + 1) * DAY_WIDTH - 4;
      return { left, width: Math.max(DAY_WIDTH - 4, width) };
    },
    [viewStart]
  );

  const groupByMonth = useMemo(() => {
    const months: { label: string; count: number }[] = [];
    let cur = "";
    let count = 0;
    allDates.forEach((d) => {
      const m = format(d, "MMMM yyyy");
      if (m !== cur) {
        if (cur) months.push({ label: cur, count });
        cur = m;
        count = 1;
      } else {
        count++;
      }
    });
    if (cur) months.push({ label: cur, count });
    return months;
  }, [allDates]);

  // Global drag listeners
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = Math.round((e.clientX - dragState.startX) / DAY_WIDTH);
      setDragDelta(delta);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const delta = Math.round((e.clientX - dragState.startX) / DAY_WIDTH);
      if (delta !== 0 && onTaskDatesChange) {
        const newStart =
          dragState.type === "move"
            ? addDays(dragState.originalStart, delta)
            : dragState.originalStart;
        const newEnd = addDays(dragState.originalEnd, delta);
        // Ensure end is always after start
        if (newEnd > newStart) {
          onTaskDatesChange(dragState.projectId, dragState.taskId, newStart, newEnd);
        }
      }
      setDragState(null);
      setDragDelta(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, onTaskDatesChange]);

  // ── Dependency arrows ─────────────────────────────────────────────────────────
  // Build a map of taskId → { barLeft, barRight, centerY } in the right panel
  const taskPositions = useMemo(() => {
    const map = new Map<string, { barLeft: number; barRight: number; centerY: number }>();
    const headerH = HEADER_HEIGHT + 24; // month row + day header
    let y = headerH;
    projects.forEach((project) => {
      y += 44; // project group header spacer
      project.tasks.forEach((task) => {
        const { left, width } = getBar(task);
        map.set(task.id, { barLeft: left + 2, barRight: left + width + 2, centerY: y + ROW_HEIGHT / 2 });
        y += ROW_HEIGHT;
      });
    });
    return map;
  }, [projects, getBar]);

  const dependencyArrows = useMemo(() => {
    const arrows: JSX.Element[] = [];
    projects.forEach((project) => {
      project.tasks.forEach((task) => {
        if (!task.dependsOn) return;
        const from = taskPositions.get(task.dependsOn);
        const to = taskPositions.get(task.id);
        if (!from || !to) return;
        const x1 = from.barRight;
        const y1 = from.centerY;
        const x2 = to.barLeft;
        const y2 = to.centerY;
        const bend = Math.max(20, Math.abs(x2 - x1) * 0.4);
        const d = `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
        arrows.push(
          <g key={`dep-${task.dependsOn}-${task.id}`}>
            <path d={d} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} strokeDasharray="5 3" />
            <polygon
              points={`${x2},${y2} ${x2 - 6},${y2 - 3.5} ${x2 - 6},${y2 + 3.5}`}
              fill="rgba(255,255,255,0.25)"
            />
          </g>
        );
      });
    });
    return arrows;
  }, [projects, taskPositions]);

  // Total height of right panel content for the SVG overlay
  const totalRightHeight = useMemo(() => {
    const headerH = HEADER_HEIGHT + 24;
    return headerH + projects.reduce((sum, p) => sum + 44 + p.tasks.length * ROW_HEIGHT, 0);
  }, [projects]);

  return (
    <div
      className="flex overflow-hidden border border-white/[0.07] rounded-xl bg-[#0f0f0f]"
      style={{
        height: "calc(100vh - 280px)",
        minHeight: 400,
        cursor: dragState ? (dragState.type === "resize" ? "col-resize" : "grabbing") : "default",
      }}
    >
      {/* ─── Left panel (fixed) ─────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-r border-white/[0.07] overflow-y-auto"
        style={{ width: LEFT_PANEL_W }}
      >
        {/* Header row */}
        <div
          className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#0f0f0f] grid text-[10px] font-bold uppercase tracking-widest text-white/25 px-4"
          style={{
            height: HEADER_HEIGHT + 24,
            gridTemplateColumns: "1fr 48px 100px 72px 72px 44px 56px",
            alignItems: "center",
          }}
        >
          <span>Event Name</span>
          <span className="text-center">%</span>
          <span>Worker</span>
          <span>Start</span>
          <span>End</span>
          <span>Days</span>
          <span>After</span>
        </div>

        {projects.map((project) => (
          <div key={project.id}>
            {/* Project group header */}
            <div
              className="flex items-center px-4 py-3 bg-white/[0.02] border-b border-white/[0.05]"
              style={{ borderLeft: `3px solid ${project.accentColor}` }}
            >
              <span className="text-[12px] font-bold text-white/70 truncate">
                {project.clientName}
                <span className="text-white/35 font-normal mx-1.5">—</span>
                {project.name}
              </span>
            </div>

            {project.tasks.map((task) => {
              const days =
                differenceInDays(
                  startOfDay(task.endDate),
                  startOfDay(task.startDate)
                ) + 1;
              const progColor =
                task.progress === 100
                  ? "#22c55e"
                  : task.progress > 0
                  ? "#f59e0b"
                  : "rgba(255,255,255,0.25)";
              const isDragging = dragState?.taskId === task.id;
              const displayDays = isDragging
                ? days // days don't change for left panel
                : days;

              return (
                <div
                  key={task.id}
                  className={`grid px-4 border-b border-white/[0.04] transition-colors group ${isDragging ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}
                  style={{
                    height: ROW_HEIGHT,
                    gridTemplateColumns: "1fr 48px 100px 72px 72px 44px 56px",
                    alignItems: "center",
                  }}
                >
                  <span className="text-[12px] text-white/70 truncate pr-2 group-hover:text-white/90 transition-colors">
                    {task.name}
                  </span>
                  <span
                    className="text-center text-[11px] font-bold"
                    style={{ color: progColor }}
                  >
                    {task.progress}%
                  </span>
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                      style={{
                        backgroundColor: task.workerColor + "30",
                        color: task.workerColor,
                      }}
                    >
                      {task.workerInitials}
                    </div>
                    <span className="text-[11px] text-white/40 truncate">
                      {task.workerName.split(" ")[0]}
                    </span>
                  </div>
                  <span className="text-[11px] text-white/35">
                    {format(
                      isDragging && dragState?.type === "move"
                        ? addDays(task.startDate, dragDelta)
                        : task.startDate,
                      "MMM d"
                    )}
                  </span>
                  <span className="text-[11px] text-white/35">
                    {format(
                      isDragging
                        ? addDays(task.endDate, dragDelta)
                        : task.endDate,
                      "MMM d"
                    )}
                  </span>
                  <span className="text-[11px] text-white/25">{displayDays}d</span>
                  {/* Predecessor name */}
                  {(() => {
                    if (!task.dependsOn) return <span className="text-[10px] text-white/15">—</span>;
                    const pred = project.tasks.find((t) => t.id === task.dependsOn)
                      ?? projects.flatMap((p) => p.tasks).find((t) => t.id === task.dependsOn);
                    return (
                      <span className="text-[10px] text-white/30 truncate" title={pred?.name}>
                        {pred ? pred.name.split(" ").slice(0, 2).join(" ") : "?"}
                      </span>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ─── Right panel (scrollable) ────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-auto" ref={scrollRef}>
        <div style={{ width: TOTAL_DAYS * DAY_WIDTH, position: "relative" }}>
          {/* Month row */}
          <div
            className="sticky top-0 z-10 flex bg-[#0f0f0f] border-b border-white/[0.07]"
            style={{ height: 24 }}
          >
            {groupByMonth.map(({ label, count }) => (
              <div
                key={label}
                className="flex items-center px-2 border-r border-white/[0.07] text-[10px] font-bold text-white/25 uppercase tracking-wide"
                style={{ width: count * DAY_WIDTH, minWidth: count * DAY_WIDTH }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day header */}
          <div
            className="sticky z-10 flex bg-[#0f0f0f] border-b border-white/[0.07]"
            style={{ top: 24, height: HEADER_HEIGHT }}
          >
            {allDates.map((date, i) => {
              const today = isToday(date);
              const weekend = isWeekend(date);
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-center border-r border-white/[0.04] ${
                    weekend ? "bg-white/[0.015]" : ""
                  } ${today ? "bg-amber-500/[0.08]" : ""}`}
                  style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                >
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wide ${
                      today ? "text-amber-400" : "text-white/20"
                    }`}
                  >
                    {format(date, "EEE")}
                  </span>
                  {today ? (
                    <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold text-black mt-0.5">
                      {format(date, "d")}
                    </span>
                  ) : (
                    <span
                      className={`text-[12px] font-bold mt-0.5 ${
                        weekend ? "text-white/20" : "text-white/45"
                      }`}
                    >
                      {format(date, "d")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Today vertical line */}
          {todayOffset >= 0 && todayOffset < TOTAL_DAYS && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-20"
              style={{
                left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 - 1,
                width: 2,
                background:
                  "linear-gradient(to bottom, #f59e0b, #f59e0b80, transparent)",
              }}
            />
          )}

          {/* Dependency arrows SVG overlay */}
          {dependencyArrows.length > 0 && (
            <svg
              className="absolute top-0 left-0 pointer-events-none z-10"
              width={TOTAL_DAYS * DAY_WIDTH}
              height={totalRightHeight}
              overflow="visible"
            >
              {dependencyArrows}
            </svg>
          )}

          {/* Task bar rows */}
          {projects.map((project) => (
            <div key={project.id}>
              {/* Project header spacer */}
              <div
                className="border-b border-white/[0.05] bg-white/[0.01]"
                style={{ height: 44 }}
              />

              {project.tasks.map((task) => {
                const isDragging = dragState?.taskId === task.id;
                const displayStart =
                  isDragging && dragState.type === "move"
                    ? addDays(task.startDate, dragDelta)
                    : task.startDate;
                const displayEnd = isDragging
                  ? addDays(task.endDate, dragDelta)
                  : task.endDate;

                const { left, width } = getBar({ startDate: displayStart, endDate: displayEnd });
                const color = statusColor(task.status, task.color);
                const visible = left + width > 0 && left < TOTAL_DAYS * DAY_WIDTH;
                const canDrag = !!onTaskDatesChange;

                return (
                  <div
                    key={task.id}
                    className={`relative border-b border-white/[0.04] transition-colors group ${
                      isDragging ? "bg-white/[0.03]" : "hover:bg-white/[0.015]"
                    }`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Weekend column shading */}
                    {allDates.map((date, i) =>
                      isWeekend(date) ? (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 bg-white/[0.01]"
                          style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                        />
                      ) : null
                    )}

                    {visible && (
                      <div
                        className={`absolute rounded-md overflow-hidden shadow-lg transition-shadow ${
                          isDragging ? "shadow-xl ring-1 ring-white/20" : "hover:brightness-110"
                        }`}
                        style={{
                          left: left + 2,
                          width: width,
                          top: 10,
                          height: ROW_HEIGHT - 20,
                          backgroundColor: color + "cc",
                          border: `1px solid ${color}40`,
                          cursor: canDrag ? (isDragging ? "grabbing" : "grab") : "pointer",
                          userSelect: "none",
                        }}
                        onMouseDown={
                          canDrag
                            ? (e) => {
                                if (e.button !== 0) return;
                                e.preventDefault();
                                setDragState({
                                  projectId: project.id,
                                  taskId: task.id,
                                  type: "move",
                                  startX: e.clientX,
                                  originalStart: task.startDate,
                                  originalEnd: task.endDate,
                                });
                                setDragDelta(0);
                              }
                            : undefined
                        }
                      >
                        {/* Progress fill */}
                        <div
                          className="absolute inset-0 rounded-md"
                          style={{
                            width: `${task.progress}%`,
                            backgroundColor: "rgba(0,0,0,0.2)",
                          }}
                        />
                        {/* Label */}
                        <span
                          className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-white truncate"
                          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                        >
                          {width > 60 ? task.name : ""}
                        </span>

                        {/* Resize handle — right edge */}
                        {canDrag && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ cursor: "col-resize" }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (e.button !== 0) return;
                              e.preventDefault();
                              setDragState({
                                projectId: project.id,
                                taskId: task.id,
                                type: "resize",
                                startX: e.clientX,
                                originalStart: task.startDate,
                                originalEnd: task.endDate,
                              });
                              setDragDelta(0);
                            }}
                          >
                            <div className="w-0.5 h-4 bg-white/50 rounded-full" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
