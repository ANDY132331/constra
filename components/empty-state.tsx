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
        <Icon size={28} className="text-white/10 mb-1" />
        <p className="text-[13px] text-white/30 font-medium">No results</p>
        <p className="text-[11px] text-white/20">Try changing your search or filters</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
        <Icon size={28} className="text-white/20" />
      </div>
      <div className="space-y-1.5 max-w-xs">
        <p className="text-[15px] font-bold text-white/60">{title}</p>
        <p className="text-[12px] text-white/30 leading-relaxed">{body}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-xl transition-colors"
        >
          + {action.label}
        </button>
      )}
    </div>
  );
}
