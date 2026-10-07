"use client";

import { useTheme } from "@/hooks/useTheme";

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

export default function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className={`text-center max-w-sm ${isDark ? "text-white/70" : "text-[#3D3533]/70"}`}>
        <span className="text-4xl block mb-4 opacity-30">⚠</span>
        <p className="text-sm tracking-wider mb-2">出了点问题</p>
        <p className={`text-[11px] tracking-wider mb-6 ${isDark ? "text-white/25" : "text-[#3D3533]/35"}`}>
          {error.message || "页面加载失败，请刷新重试"}
        </p>
        <button
          onClick={reset}
          className={`text-[11px] tracking-wider px-5 py-2 rounded-full border transition-colors ${
            isDark ? "border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20"
                   : "border-[#3D3533]/08 text-[#3D3533]/50 hover:text-[#3D3533]/80"
          }`}
        >
          重试
        </button>
      </div>
    </div>
  );
}
