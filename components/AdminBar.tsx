"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/auth-context";
import { useTheme } from "@/hooks/useTheme";

export default function AdminBar() {
  const { user, isAdmin, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [expanded, setExpanded] = useState(false);

  if (!isAdmin || !user) return null;

  const badgeBg = isDark
    ? "bg-amber-400/12 border-amber-400/20"
    : "bg-[#C97D6B]/12 border-[#C97D6B]/20";
  const textColor = isDark ? "text-amber-300/80" : "text-[#C97D6B]";
  const menuBg = isDark
    ? "bg-[#111] border-white/[0.08]"
    : "bg-white border-[#3D3533]/10";

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2">
      {/* Expanded menu */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            className={`rounded-xl border backdrop-blur-xl shadow-lg px-4 py-3 min-w-[180px] ${menuBg}`}
          >
            <p
              className={`text-xs font-medium ${
                isDark ? "text-white/50" : "text-[#3D3533]/50"
              }`}
            >
              管理员模式
            </p>
            <p
              className={`text-sm font-semibold mt-0.5 ${
                isDark ? "text-white/85" : "text-[#3D3533]"
              }`}
            >
              {user.displayName}
            </p>
            <a
              href="/api/export"
              download
              onClick={() => setExpanded(false)}
              className={`mt-3 block w-full text-center text-xs py-1.5 rounded-lg border transition-all duration-200 ${
                isDark
                  ? "border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/[0.15]"
                  : "border-[#3D3533]/08 text-[#3D3533]/40 hover:text-[#3D3533]/70 hover:border-[#3D3533]/15"
              }`}
            >
              导出数据
            </a>
            <button
              onClick={() => {
                setExpanded(false);
                logout();
              }}
              className={`mt-2 w-full text-xs py-1.5 rounded-lg border transition-all duration-200 ${
                isDark
                  ? "border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/[0.15]"
                  : "border-[#3D3533]/08 text-[#3D3533]/40 hover:text-[#3D3533]/70 hover:border-[#3D3533]/15"
              }`}
            >
              退出登录
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle pill */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-medium backdrop-blur-xl shadow-sm transition-colors duration-200 ${badgeBg} ${textColor}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        <span className="hidden sm:inline">管理</span>
      </motion.button>
    </div>
  );
}
