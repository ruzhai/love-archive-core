"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth/auth-context";
import LoginForm from "@/components/LoginForm";
import { NAV_LINKS, SITE } from "@/lib/config";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const { isAdmin, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // All colors via Tailwind theme tokens (compiled to var() references)
  const headerBg = scrolled
    ? "bg-nav-bg-scrolled backdrop-blur-md"
    : "bg-nav-bg";

  return (
    <>
      {/* Header bar */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-500 ${headerBg} ${scrolled && !isDark ? "border-b border-chat-topbar-border" : ""}`}
      >
        <div className="flex items-center justify-between h-16 px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="text-base tracking-[0.15em] font-medium transition-colors duration-300 text-nav-logo hover:text-nav-logo-hover"
          >
            {SITE.name}
          </Link>

          {/* Desktop nav + theme toggle */}
          <div className="hidden lg:flex items-center gap-6">
            <nav className="flex items-center gap-8">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm tracking-[0.1em] transition-colors duration-300 ${
                      isActive
                        ? "text-nav-link-active"
                        : "text-nav-link hover:text-nav-link-hover"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Theme toggle pill */}
            <button
              onClick={toggleTheme}
              className="relative w-9 h-5 rounded-full transition-colors duration-500 flex items-center px-[3px] bg-nav-toggle-bg hover:bg-nav-toggle-bg-hover"
              aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
            >
              <motion.div
                animate={{ x: isDark ? 0 : 16 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] bg-nav-toggle-dot"
              >
                {isDark ? "🌙" : "☀️"}
              </motion.div>
            </button>

            {/* Admin button */}
            {isAdmin ? (
              <button
                onClick={logout}
                className="text-[11px] tracking-[0.15em] transition-colors duration-300 text-nav-link hover:text-nav-link-hover"
                title="退出管理"
              >
                退出
              </button>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="text-[11px] tracking-[0.15em] transition-colors duration-300 text-nav-link hover:text-nav-link-hover"
              >
                管理员
              </button>
            )}
          </div>

          {/* Mobile: theme toggle + menu button */}
          <div className="flex lg:hidden items-center gap-3">
            <button
              onClick={toggleTheme}
              className="text-sm transition-colors text-nav-link hover:text-nav-link-hover"
              aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
            >
              {isDark ? "🌙" : "☀️"}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex flex-col gap-[5px] p-2 group"
              aria-label="Toggle menu"
            >
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }}
                className="w-5 h-[1.5px] block transition-colors bg-nav-link group-hover:bg-nav-link-hover"
              />
              <motion.span
                animate={menuOpen ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }}
                className="w-5 h-[1.5px] block transition-colors bg-nav-link group-hover:bg-nav-link-hover"
              />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Fullscreen mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40 flex flex-col justify-center lg:hidden bg-nav-mobile-bg"
          >
            <nav className="flex flex-col px-8 gap-1">
              {NAV_LINKS.map((link, i) => {
                const isActive = pathname === link.href;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.5 }}
                  >
                    <Link
                      href={link.href}
                      className={`group flex items-center gap-4 py-4 border-b border-nav-mobile-border transition-colors duration-300 ${
                        isActive
                          ? "text-nav-mobile-link-active"
                          : "text-nav-mobile-link hover:text-nav-mobile-link-hover"
                      }`}
                    >
                      <span className="text-[11px] text-nav-mobile-num w-5">{link.num}</span>
                      <span className="text-2xl font-light tracking-wider">{link.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Bottom info + admin */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="absolute bottom-10 left-8 right-8 flex items-center justify-between text-[11px] tracking-widest"
            >
              <span className="text-nav-mobile-tagline">{SITE.tagline}</span>
              {isAdmin ? (
                <button
                  onClick={logout}
                  className="text-nav-mobile-tagline hover:text-nav-mobile-link-hover transition-colors"
                >
                  退出管理
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setTimeout(() => setLoginOpen(true), 300);
                  }}
                  className="text-nav-mobile-tagline hover:text-nav-mobile-link-hover transition-colors"
                >
                  管理员登录
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login modal */}
      <AnimatePresence>
        {loginOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLoginOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className={`relative z-10 w-full max-w-sm rounded-2xl p-8 shadow-2xl ${
                isDark
                  ? "bg-[#121212] border border-white/[0.08]"
                  : "bg-white border border-[#3D3533]/08"
              }`}
            >
              {/* Close button */}
              <button
                onClick={() => setLoginOpen(false)}
                className={`absolute top-4 right-4 text-lg transition-colors ${
                  isDark ? "text-white/20 hover:text-white/50" : "text-[#3D3533]/25 hover:text-[#3D3533]/55"
                }`}
              >
                ✕
              </button>
              <LoginForm onSuccess={() => setLoginOpen(false)} compact />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
