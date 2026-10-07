"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/auth-context";
import { useTheme } from "@/hooks/useTheme";
import { AUTHORS, authorLabel } from "@/lib/config";

interface LoginFormProps {
  onSuccess?: () => void;
  compact?: boolean;
}

const ADMIN_ACCOUNTS = (["author1", "author2"] as const).map((key) => ({
  username: key,
  label: `${AUTHORS[key].emoji} ${authorLabel(key)}`,
}));

export default function LoginForm({ onSuccess, compact }: LoginFormProps) {
  const { login } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [username, setUsername] = useState(ADMIN_ACCOUNTS[0].username);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("请输入密码");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    setError("");

    const result = await login(username, password);

    setLoading(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || "登录失败");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword("");
    }
  };

  const inputClass = isDark
    ? "bg-white/[0.06] border-white/[0.12] text-white/90 placeholder:text-white/25 focus:border-amber-400/50"
    : "bg-[#3D3533]/[0.04] border-[#3D3533]/12 text-[#3D3533] placeholder:text-[#3D3533]/35 focus:border-[#C97D6B]/60";

  const btnClass = isDark
    ? "bg-amber-400/15 text-amber-300 border-amber-400/25 hover:bg-amber-400/25"
    : "bg-[#C97D6B]/12 text-[#C97D6B] border-[#C97D6B]/30 hover:bg-[#C97D6B]/22";

  return (
    <div className={compact ? "" : "max-w-sm mx-auto"}>
      {/* Lock icon */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-4xl">🔐</span>
        <h2
          className={`mt-3 text-xl font-semibold ${
            isDark ? "text-white/85" : "text-[#3D3533]"
          }`}
        >
          管理员登录
        </h2>
        <p
          className={`mt-1 text-sm ${
            isDark ? "text-white/30" : "text-[#3D3533]/45"
          }`}
        >
          登录后可管理私密内容
        </p>
      </motion.div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="space-y-4"
      >
        {/* Username selector */}
        <div>
          <label
            className={`block text-xs font-medium mb-1.5 ${
              isDark ? "text-white/35" : "text-[#3D3533]/50"
            }`}
          >
            账号
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ADMIN_ACCOUNTS.map((acct) => (
              <button
                key={acct.username}
                type="button"
                onClick={() => setUsername(acct.username)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  username === acct.username
                    ? isDark
                      ? "bg-amber-400/15 border-amber-400/40 text-amber-300"
                      : "bg-[#C97D6B]/12 border-[#C97D6B]/40 text-[#C97D6B]"
                    : isDark
                      ? "bg-white/[0.04] border-white/[0.08] text-white/50 hover:border-white/[0.15]"
                      : "bg-[#3D3533]/[0.03] border-[#3D3533]/08 text-[#3D3533]/55 hover:border-[#3D3533]/18"
                }`}
              >
                {acct.label}
              </button>
            ))}
          </div>
        </div>

        {/* Password input */}
        <div>
          <label
            className={`block text-xs font-medium mb-1.5 ${
              isDark ? "text-white/35" : "text-[#3D3533]/50"
            }`}
          >
            密码
          </label>
          <motion.input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            placeholder="输入管理员密码"
            autoFocus
            animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all duration-200 ${inputClass}`}
          />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-xs text-center ${
                isDark ? "text-red-400/80" : "text-red-500"
              }`}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 disabled:opacity-40 ${btnClass}`}
        >
          {loading ? "验证中…" : "登 录"}
        </button>
      </motion.form>
    </div>
  );
}
