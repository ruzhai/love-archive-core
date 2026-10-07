"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useUploadProgress } from "@/hooks/useUploadProgress";
import { useTheme } from "@/hooks/useTheme";

export default function UploadToast() {
  const { tasks } = useUploadProgress();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {tasks.map(task => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            className={`pointer-events-auto rounded-xl border backdrop-blur-xl px-4 py-3 min-w-[260px] max-w-[320px] shadow-2xl ${
              isDark
                ? "bg-[#0a0a0a]/90 border-white/[0.08]"
                : "bg-[#FBF7F2]/95 border-[#3D3533]/10"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Icon */}
              <span className="text-lg shrink-0">
                {task.status === "done" ? "✅" : task.status === "error" ? "❌" : "📤"}
              </span>

              <div className="flex-1 min-w-0">
                <p className={`text-[12px] tracking-wider truncate ${isDark ? "text-white/70" : "text-[#3D3533]/70"}`}>
                  {task.name}
                </p>
                {task.status === "uploading" && (
                  <>
                    <p className={`text-[11px] mt-0.5 ${isDark ? "text-white/25" : "text-[#3D3533]/35"}`}>
                      {task.progress}%
                    </p>
                    <div className={`mt-1.5 h-0.5 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-[#3D3533]/06"}`}>
                      <motion.div
                        className={`h-full rounded-full ${
                          isDark ? "bg-gradient-to-r from-amber-400/60 to-amber-400/30" : "bg-gradient-to-r from-[#C97D6B]/60 to-[#C97D6B]/30"
                        }`}
                        animate={{ width: `${task.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </>
                )}
                {task.status === "done" && (
                  <p className={`text-[11px] mt-0.5 ${isDark ? "text-emerald-400/50" : "text-emerald-600/50"}`}>
                    上传完成
                  </p>
                )}
                {task.status === "error" && (
                  <p className={`text-[11px] mt-0.5 ${isDark ? "text-red-400/50" : "text-red-500/50"}`}>
                    上传失败
                  </p>
                )}
              </div>

              {/* Progress ring for uploading */}
              {task.status === "uploading" && (
                <svg className="w-5 h-5 shrink-0 -rotate-90" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="none" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(61,53,51,0.06)"} strokeWidth="2" />
                  <circle cx="10" cy="10" r="8" fill="none"
                    stroke={isDark ? "rgba(212,165,116,0.5)" : "rgba(201,125,107,0.5)"}
                    strokeWidth="2" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 8}`}
                    strokeDashoffset={`${2 * Math.PI * 8 * (1 - task.progress / 100)}`}
                    className="transition-[stroke-dashoffset] duration-300" />
                </svg>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
