import { useEffect, useRef } from "react";
import AdPlaceholder from "./ads/AdPlaceholder";

type Mode = "pause" | "dead";

type Props = {
  open: boolean;
  mode?: Mode; // 'pause' | 'dead'
  onResume?: () => void;
  onExit: () => void;
};

export default function PauseDialog({
  open,
  mode = "pause",
  onResume,
  onExit,
}: Props) {
  const resumeBtnRef = useRef<HTMLButtonElement | null>(null);
  const isDead = mode === "dead";

  // Focus handling
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (!isDead) resumeBtnRef.current?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open, isDead]);

  // Keyboard shortcuts when open
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isDead) {
        // In death mode, Enter/Escape = Exit
        if (e.key === "Enter" || e.key === "Escape") onExit();
      } else {
        if (e.key === "Escape") onResume?.();
        else if (e.key === "Enter") onExit?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isDead, onExit, onResume]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-[420px] max-w-[92vw] rounded-2xl border border-cyan-400/40 bg-[#0b0f12] p-6 shadow-[0_0_30px_rgba(0,255,255,0.25)]">
        <h2 className="mb-2 text-xl font-semibold">
          {isDead ? (
            <span className="text-rose-300">You Died</span>
          ) : (
            <span className="text-cyan-300">Paused</span>
          )}
        </h2>
        <p className="mb-6 text-sm text-slate-300">
          {isDead
            ? "Exit to the main screen."
            : "Do you want to exit to the main screen or resume the game?"}
        </p>

        <div className="mb-6 flex gap-3">
          {!isDead && (
            <button
              ref={resumeBtnRef}
              onClick={onResume}
              className="flex-1 rounded-lg border border-cyan-400/50 px-4 py-2 text-cyan-200 hover:bg-cyan-400/10 focus:ring focus:ring-cyan-400/40 focus:outline-none"
            >
              Resume
            </button>
          )}
          <button
            onClick={onExit}
            className="flex-1 rounded-lg bg-rose-600/90 px-4 py-2 text-white hover:bg-rose-600 focus:ring focus:ring-rose-500/50 focus:outline-none"
          >
            Exit to Main
          </button>
        </div>
        <AdPlaceholder size="320x100" />
      </div>
    </div>
  );
}
