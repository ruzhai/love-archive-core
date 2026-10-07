"use client";

import { SITE } from "@/lib/config";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: "radial-gradient(ellipse at 50% 50%, #c97d6b15 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #8b5e7b10 0%, transparent 50%)",
      backgroundColor: "#0d0a0a",
    }}>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/10 to-rose-400/10 border border-white/[0.04] mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-amber-300/40">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" opacity="0.6" />
          </svg>
        </div>
        <p className="text-sm tracking-[0.15em] text-white/30 animate-pulse">{SITE.name}</p>
        <p className="text-[10px] tracking-[0.3em] text-white/10 mt-2">正在加载…</p>
      </div>
    </div>
  );
}
