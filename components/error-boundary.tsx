"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white mb-1">Something went wrong</h3>
            <p className="text-[12px] text-white/40 max-w-xs">{this.state.error.message}</p>
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/10 text-white/60 text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <RefreshCw size={14} /> Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
