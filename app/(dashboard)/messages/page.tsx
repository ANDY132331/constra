"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Send, Paperclip, X, Download, Trash2, Mic, SmilePlus, Check, MessagesSquare,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { useStore } from "@/lib/store";
import { MicButton } from "@/components/mic-button";

// ── Colours (Light mix palette — airy, modern, Constra amber) ─────────────────
const C = {
  sidebarBg:      "#ffffff",
  sidebarActive:  "#fff8ed",          // warm amber tint on active row
  chatBg:         "#f0f2f5",          // soft neutral grey — like Messenger light
  headerBg:       "#ffffff",
  inputBg:        "#f0f2f5",
  inputField:     "#ffffff",
  sentBubble:     "#f59e0b",          // Constra amber-500
  sentBubbleGrad: "linear-gradient(135deg,#fbbf24,#d97706)", // amber gradient
  receivedBubble: "#ffffff",
  sentText:       "#1a0a00",          // near-black on amber (readable)
  receivedText:   "#111827",          // dark gray on white
  secondaryText:  "#6b7280",          // medium gray
  border:         "rgba(0,0,0,0.07)",
  datePill:       "rgba(0,0,0,0.10)",
  divider:        "rgba(0,0,0,0.06)",
};

function fmtTime(d: Date) { return format(d, "h:mm a"); }

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `0:${String(s % 60).padStart(2, "0")}`;
}

function DateSeparator({ date }: { date: Date }) {
  const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d, yyyy");
  return (
    <div className="flex items-center justify-center my-2">
      <span className="text-[11.5px] font-medium px-3 py-1 rounded-full" style={{ background: C.datePill, color: C.secondaryText }}>
        {label}
      </span>
    </div>
  );
}

export default function MessagesPage() {
  const { projects, messages, addMessage, deleteMessage, currentUser } = useStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id ?? "");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  useEffect(() => {
    if (!selectedProjectId && projects[0]?.id) setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  const [text, setText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{ name: string; data: string } | null>(null);
  const [lightboxData, setLightboxData] = useState<{ name: string; data: string } | null>(null);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const projectMessages = useMemo(
    () => messages
      .filter((m) => m.projectId === selectedProjectId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages, selectedProjectId],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [projectMessages.length, selectedProjectId]);

  // ── Visual-viewport resize: keep chat visible when keyboard opens (iOS PWA) ─
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !containerRef.current) return;
    const update = () => {
      if (containerRef.current) containerRef.current.style.height = `${vv.height}px`;
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    setPendingAttachment({ name: file.name, data });
    if (fileRef.current) fileRef.current.value = "";
  }

  const sendMessage = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !pendingAttachment) return;
    if (!selectedProjectId) return;
    addMessage({
      projectId: selectedProjectId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderInitials: currentUser.initials,
      senderColor: currentUser.color,
      text: trimmed,
      timestamp: new Date(),
      attachmentName: pendingAttachment?.name,
      attachmentData: pendingAttachment?.data,
    });
    setText("");
    setPendingAttachment(null);
    textareaRef.current?.focus();
  }, [text, pendingAttachment, selectedProjectId, addMessage, currentUser]);

  const handleAudio = useCallback((dataUrl: string, durationSeconds: number) => {
    if (!selectedProjectId) return;
    addMessage({
      projectId: selectedProjectId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderInitials: currentUser.initials,
      senderColor: currentUser.color,
      text: "",
      timestamp: new Date(),
      attachmentName: `voice-${durationSeconds}s.webm`,
      attachmentData: dataUrl,
    });
  }, [selectedProjectId, addMessage, currentUser]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function downloadAttachment(name: string, data: string) {
    const a = document.createElement("a");
    a.href = data; a.download = name; a.click();
  }

  const isImage = (data: string) => data.startsWith("data:image");
  const isAudio = (name: string, data: string) => data.startsWith("data:audio") || name.startsWith("voice-");

  const project = projects.find((p) => p.id === selectedProjectId);

  return (
    <div
      ref={containerRef}
      className="flex overflow-hidden rounded-2xl"
      style={{ height: "calc(100dvh - 168px)", border: `1px solid ${C.border}` }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          SIDEBAR — project / conversation list (WhatsApp left panel)
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex-shrink-0 flex flex-col
          ${mobileSidebarOpen ? "flex" : "hidden"} sm:flex
          w-full sm:w-[260px]`}
        style={{ background: C.sidebarBg, borderRight: `1px solid ${C.border}` }}
      >
        {/* Sidebar header */}
        <div className="px-4 py-3.5 flex items-center gap-3" style={{ background: C.headerBg }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
            style={{ background: currentUser.color + "33", color: currentUser.color }}>
            {currentUser.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold leading-none" style={{ color: C.sentText }}>Crew Chat</p>
            <p className="text-[10px] mt-0.5" style={{ color: C.secondaryText }}>
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {projects.length === 0 ? (
            <p className="text-[12px] px-4 py-6 text-center" style={{ color: C.secondaryText }}>No projects yet</p>
          ) : (
            projects.map((p, idx) => {
              const last = messages
                .filter((m) => m.projectId === p.id)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
              const active = p.id === selectedProjectId;
              const unread = 0; // future: track unread count
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProjectId(p.id); setMobileSidebarOpen(false); }}
                  className="w-full text-start flex items-center gap-3 px-4 py-3 transition-colors relative"
                  style={{ background: active ? C.sidebarActive : "transparent" }}
                >
                  {/* Project colour avatar */}
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                    style={{ background: p.color + "33", color: p.color }}>
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[13.5px] font-semibold truncate" style={{ color: C.sentText }}>{p.name}</span>
                      {last && (
                        <span className="text-[10.5px] flex-shrink-0" style={{ color: C.secondaryText }}>
                          {isToday(new Date(last.timestamp))
                            ? format(new Date(last.timestamp), "h:mm a")
                            : format(new Date(last.timestamp), "MM/dd/yy")}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] truncate" style={{ color: C.secondaryText }}>
                      {last
                        ? `${last.senderName.split(" ")[0]}: ${last.attachmentName?.startsWith("voice-") ? "🎙 Voice message" : last.text || "📎 Attachment"}`
                        : "No messages yet"}
                    </p>
                  </div>

                  {/* Bottom divider — skip last item */}
                  {idx < projects.length - 1 && (
                    <div className="absolute bottom-0 right-0 left-16" style={{ height: 1, background: C.border }} />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CHAT PANEL
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${mobileSidebarOpen ? "hidden sm:flex" : "flex"}`}
        style={{ background: C.chatBg }}
      >
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ background: C.headerBg }}>
          {/* Mobile back */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="sm:hidden w-7 h-7 flex items-center justify-center rounded-full transition-all"
            style={{ color: C.secondaryText }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          {project ? (
            <>
              <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold"
                style={{ background: project.color + "33", color: project.color }}>
                {project.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[14px] font-bold leading-none" style={{ color: C.sentText }}>{project.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: C.secondaryText }}>
                  {projectMessages.length} message{projectMessages.length !== 1 ? "s" : ""}
                </p>
              </div>
            </>
          ) : (
            <p className="text-[13px]" style={{ color: C.secondaryText }}>Select a project to start chatting</p>
          )}
        </div>

        {/* ── Messages ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
          {projectMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: C.sidebarActive }}>
                <MessagesSquare size={28} style={{ color: C.secondaryText }} />
              </div>
              <p className="text-[13px]" style={{ color: C.secondaryText }}>No messages yet</p>
              <p className="text-[11px]" style={{ color: C.secondaryText + "99" }}>Send a message or voice note to start the conversation</p>
            </div>
          )}

          {projectMessages.map((msg, i) => {
            const isMe = msg.senderId === currentUser.id;
            const ts = new Date(msg.timestamp);
            const prevMsg = i > 0 ? projectMessages[i - 1] : null;
            const prevTs  = prevMsg ? new Date(prevMsg.timestamp) : null;

            // Show date separator when day changes
            const showDate = !prevTs || !isSameDay(ts, prevTs);
            // Show avatar + sender name when sender changes or date changes
            const showAvatar = showDate || !prevMsg || prevMsg.senderId !== msg.senderId;
            // Tail only on first bubble from this sender in this group
            const showTail = showAvatar;

            const hasAudio  = !!(msg.attachmentName && msg.attachmentData && isAudio(msg.attachmentName, msg.attachmentData));
            const durMatch  = msg.attachmentName?.match(/voice-(\d+)s/);
            const audioDur  = durMatch ? parseInt(durMatch[1]) : 0;

            // Whether this is the last in a group (different next sender or last overall)
            const nextMsg = projectMessages[i + 1];
            const isGroupEnd = !nextMsg || nextMsg.senderId !== msg.senderId;

            return (
              <div key={msg.id}>
                {showDate && <DateSeparator date={ts} />}

                <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""} ${showAvatar && !showDate ? "mt-3" : "mt-[2px]"}`}>
                  {/* Avatar — show at group end (bottom of group), like WhatsApp */}
                  <div className={`w-8 flex-shrink-0 flex items-end ${isMe ? "hidden" : ""}`}>
                    {isGroupEnd && !isMe ? (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: msg.senderColor + "33", color: msg.senderColor }}>
                        {msg.senderInitials}
                      </div>
                    ) : (
                      <div className="w-8 h-8" /> /* spacer */
                    )}
                  </div>

                  {/* Bubble wrapper */}
                  <div className={`relative group/msg max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    {/* Sender name (received only, first in group) */}
                    {showAvatar && !isMe && (
                      <p className="text-[11px] font-bold mb-1 px-1" style={{ color: msg.senderColor }}>
                        {msg.senderName}
                      </p>
                    )}

                    {/* TEXT bubble */}
                    {msg.text && (
                      <div className="relative">
                        {/* Tail */}
                        {showTail && (
                          isMe ? (
                            <span className="absolute top-0 -right-[7px]" style={{
                              width: 0, height: 0,
                              borderLeft: `7px solid #fbbf24`,
                              borderBottom: "7px solid transparent",
                            }} />
                          ) : (
                            <span className="absolute top-0 -left-[7px]" style={{
                              width: 0, height: 0,
                              borderRight: `7px solid ${C.receivedBubble}`,
                              borderBottom: "7px solid transparent",
                            }} />
                          )
                        )}

                        <div
                          className="px-3 pt-2 pb-1.5 rounded-[10px] text-[13.5px] leading-relaxed break-words"
                          style={{
                            background: isMe ? C.sentBubbleGrad : C.receivedBubble,
                            color: isMe ? C.sentText : C.receivedText,
                            boxShadow: isMe ? "0 1px 3px rgba(0,0,0,0.10)" : "0 1px 2px rgba(0,0,0,0.08)",
                            borderTopRightRadius: (showTail && isMe) ? "2px" : undefined,
                            borderTopLeftRadius:  (showTail && !isMe) ? "2px" : undefined,
                          }}
                        >
                          {msg.text}
                          {/* Time + check row */}
                          <span className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                            <span className="text-[10px]" style={{ color: isMe ? "rgba(233,237,239,0.55)" : C.secondaryText }}>
                              {fmtTime(ts)}
                            </span>
                            {isMe && <Check size={11} style={{ color: "rgba(233,237,239,0.55)" }} />}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* AUDIO voice message */}
                    {hasAudio && (
                      <div className="relative">
                        {showTail && (
                          isMe ? (
                            <span className="absolute top-0 -right-[7px]" style={{
                              width: 0, height: 0,
                              borderLeft: `7px solid #fbbf24`,
                              borderBottom: "7px solid transparent",
                            }} />
                          ) : (
                            <span className="absolute top-0 -left-[7px]" style={{
                              width: 0, height: 0,
                              borderRight: `7px solid ${C.receivedBubble}`,
                              borderBottom: "7px solid transparent",
                            }} />
                          )
                        )}
                        <div
                          className="px-3 py-2.5 rounded-[10px] flex items-center gap-2.5 min-w-[200px]"
                          style={{
                            background: isMe ? C.sentBubbleGrad : C.receivedBubble,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                            borderTopRightRadius: (showTail && isMe) ? "2px" : undefined,
                            borderTopLeftRadius:  (showTail && !isMe) ? "2px" : undefined,
                          }}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: isMe ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.06)" }}>
                            <Mic size={14} style={{ color: isMe ? C.sentText : C.secondaryText }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <audio
                              controls
                              src={msg.attachmentData!}
                              className="w-full h-6"
                              style={{ colorScheme: "dark" }}
                              preload="metadata"
                            />
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {audioDur > 0 && (
                              <span className="text-[10px] font-mono" style={{ color: "rgba(233,237,239,0.55)" }}>
                                {fmtDur(audioDur)}
                              </span>
                            )}
                            <span className="text-[10px]" style={{ color: "rgba(233,237,239,0.55)" }}>
                              {fmtTime(ts)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* IMAGE / FILE attachment */}
                    {msg.attachmentName && msg.attachmentData && !hasAudio && (
                      <div className="relative overflow-hidden rounded-[10px]" style={{ maxWidth: 260 }}>
                        {showTail && (
                          isMe ? (
                            <span className="absolute top-0 -right-[7px] z-10" style={{
                              width: 0, height: 0,
                              borderLeft: `7px solid #fbbf24`,
                              borderBottom: "7px solid transparent",
                            }} />
                          ) : (
                            <span className="absolute top-0 -left-[7px] z-10" style={{
                              width: 0, height: 0,
                              borderRight: `7px solid ${C.receivedBubble}`,
                              borderBottom: "7px solid transparent",
                            }} />
                          )
                        )}
                        {isImage(msg.attachmentData) ? (
                          <div className="relative">
                            <img
                              src={msg.attachmentData}
                              alt={msg.attachmentName}
                              className="block max-w-full cursor-pointer"
                              style={{ borderRadius: 10 }}
                              onClick={() => setLightboxData({ name: msg.attachmentName!, data: msg.attachmentData! })}
                            />
                            <span className="absolute bottom-1.5 right-2 flex items-center gap-0.5">
                              <span className="text-[10px] text-white/80 drop-shadow">{fmtTime(ts)}</span>
                              {isMe && <Check size={11} className="text-white/80 drop-shadow" />}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => downloadAttachment(msg.attachmentName!, msg.attachmentData!)}
                            className="flex items-center gap-2.5 px-3 py-2.5 w-full text-left"
                            style={{ background: isMe ? C.sentBubbleGrad : C.receivedBubble, borderRadius: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }}
                          >
                            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: "rgba(255,255,255,0.15)" }}>
                              <Download size={14} style={{ color: C.sentText }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold truncate" style={{ color: C.sentText }}>{msg.attachmentName}</p>
                              <p className="text-[10px]" style={{ color: "rgba(233,237,239,0.55)" }}>Tap to download · {fmtTime(ts)}</p>
                            </div>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Delete button on hover */}
                    {isMe && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="opacity-0 group-hover/msg:opacity-100 mt-0.5 self-end p-1 rounded-full transition-all"
                        style={{ color: C.secondaryText }}
                        aria-label="Delete"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── Pending attachment preview ──────────────────────────────────── */}
        {pendingAttachment && (
          <div className="px-4 py-2 flex-shrink-0 border-t" style={{ borderColor: C.border, background: C.inputBg }}>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: C.inputField }}>
              {isImage(pendingAttachment.data) ? (
                <img src={pendingAttachment.data} alt="" className="w-10 h-10 rounded object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <Paperclip size={13} style={{ color: C.sentText }} />
                </div>
              )}
              <span className="text-[12px] max-w-[200px] truncate" style={{ color: C.sentText }}>{pendingAttachment.name}</span>
              <button onClick={() => setPendingAttachment(null)} style={{ color: C.secondaryText }} className="hover:opacity-70 ms-1">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Input bar ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-end gap-2 px-3 py-2.5" style={{ background: C.inputBg }}>
          {/* Emoji / sticker (cosmetic) */}
          <button
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-opacity opacity-60 hover:opacity-100"
            style={{ color: C.secondaryText }}
            title="Emoji"
          >
            <SmilePlus size={20} />
          </button>

          {/* Text input pill */}
          <div className="flex-1 flex items-end rounded-2xl px-4 py-2" style={{ background: C.inputField }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message"
              rows={1}
              inputMode="text"
              enterKeyHint="send"
              className="flex-1 bg-transparent text-[13.5px] outline-none resize-none max-h-28 leading-relaxed"
              style={{ color: C.sentText, caretColor: "#25d366", overflowY: "auto" }}
            />
            {/* Attach button inside pill */}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-shrink-0 ml-2 mb-0.5 opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: C.secondaryText }}
              title="Attach file"
            >
              <Paperclip size={18} />
            </button>
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />

          {/* Mic / Send */}
          {text.trim() || pendingAttachment ? (
            <button
              onClick={sendMessage}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              style={{ background: C.sentBubbleGrad }}
            >
              <Send size={17} style={{ color: C.sentText, marginLeft: 2 }} />
            </button>
          ) : (
            <MicButton
              onAudio={handleAudio}
              className="!w-10 !h-10 !rounded-full"
              size="md"
            />
          )}
        </div>
      </div>

      {/* ── Image lightbox ─────────────────────────────────────────────────── */}
      {lightboxData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxData.data} alt={lightboxData.name} className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <div className="absolute top-2 right-2 flex gap-2">
              <button onClick={() => downloadAttachment(lightboxData.name, lightboxData.data)}
                className="p-2 rounded-full bg-black/60 text-white/70 hover:text-white">
                <Download size={15} />
              </button>
              <button onClick={() => setLightboxData(null)}
                className="p-2 rounded-full bg-black/60 text-white/70 hover:text-white">
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
