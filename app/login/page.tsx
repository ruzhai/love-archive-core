"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SITE } from "@/lib/config";

interface Particle {
  left: number;
  top: number;
  duration: number;
  delay: number;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 粒子位置只在客户端生成：在渲染期调 Math.random() 会让服务端与客户端
  // 算出不同坐标，触发 hydration 不匹配并导致加载时闪一下。
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 3 + Math.random() * 4,
        delay: Math.random() * 5,
      }))
    );
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError("");

    try {
      // CSRF token is already present: middleware issues it on every response
      // where it's missing. Reading it directly avoids the race where a
      // re-fetch of /api/auth/session rotated the cookie mid-submit and 403'd.
      const csrfToken = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        // 整页跳转，不能改成 router.push：Navbar 的 <Link> 会在登录页预取
        // /diary，未登录时预取到的是 307 → /login，这份重定向被缓存在客户端
        // Router Cache 里；登录后 push 会命中陈旧缓存又弹回登录页（提交两次
        // 才成功的根因）。整页跳转绕开 Router Cache。replace 不留历史记录。
        window.location.replace("/diary");
        return;
      }
      setError(data.error || "登录失败");
    } catch {
      setError("网络错误，请重试");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a0a] via-[#2d1a1a] to-[#1a0a14]">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: "radial-gradient(ellipse at 20% 50%, #c97d6b20 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #8b5e7b20 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, #c97d6b15 0%, transparent 50%)",
        }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 bg-amber-300/30 rounded-full"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/30">
          {/* Logo / Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-rose-400/20 border border-white/[0.06] mb-5"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-amber-300/80">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" opacity="0.8" />
              </svg>
            </motion.div>
            <h1 className="text-2xl font-light tracking-[0.05em] text-white/90 mb-1.5">
              {SITE.name}
            </h1>
            <p className="text-[11px] tracking-[0.3em] text-white/25">
              {SITE.tagline}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="用户名"
                autoComplete="username"
                autoFocus
                enterKeyHint="next"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 outline-none transition-all focus:border-white/[0.2] focus:bg-white/[0.06]"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码"
                autoComplete="current-password"
                enterKeyHint="go"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 outline-none transition-all focus:border-white/[0.2] focus:bg-white/[0.06]"
              />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-[11px] text-red-400/80 text-center tracking-wider">
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full py-3 rounded-xl text-sm font-medium tracking-wider transition-all duration-300
                bg-white text-black hover:bg-white/90 hover:shadow-lg hover:shadow-white/10
                disabled:bg-white/[0.06] disabled:text-white/15 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? "登录中…" : "登录"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-[10px] tracking-wider text-white/10 mt-6">
            · 仅属于两个人的空间 ·
          </p>
        </div>
      </motion.div>
    </div>
  );
}
