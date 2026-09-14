import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  /** true = no data at all; false = filters returned nothing */
  isFiltered?: boolean;
}

/**
 * Shared empty-state card used across all dashboard pages.
 * Shows an icon, title, description, and an optional CTA button.
 */
export function EmptyState({ icon: Icon, title, body, action, isFiltered }: EmptyStateProps) {
  if (isFiltered) {
    // Compact "no results" state — search or filter active
    return (
      <div className="flex flex-col items-center gap-2 py-14 text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-1">
          <Icon size={20} className="text-white/15" />
        </div>
        <p className="text-[13px] font-semibold text-white/35">No results found</p>
        <p className="text-[11px] text-white/20 max-w-[200px] leading-relaxed">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-16 text-center px-6">
      {/* Icon with ambient glow */}
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl blur-xl opacity-20"
          style={{ background: "radial-gradient(circle, rgba(245,196,0,0.4) 0%, transparent 70%)" }} />
        <div className="relative w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}>
          <Icon size={32} className="text-white/25" strokeWidth={1.5} />
        </div>
      </div>
      <div className="space-y-2 max-w-xs">
        <p className="text-[16px] font-bold text-white/65">{title}</p>
        <p className="text-[13px] text-white/30 leading-relaxed">{body}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 inline-flex items-center gap-1.5 font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all active:scale-[0.97]"
          style={{
            background: "linear-gradient(145deg, #F5C400, #d4a900)",
            color: "#000",
            boxShadow: "0 4px 20px rgba(245,196,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          + {action.label}
        </button>
      )}
    </div>
  );
}
