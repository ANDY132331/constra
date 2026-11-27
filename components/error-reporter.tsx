"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

// Catches errors that never reach a React error boundary (event handlers, timers, failed promises).
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError("window", e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => reportError("promise", e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
