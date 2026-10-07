"use client";

import Link from "next/link";
import { useTheme } from "@/hooks/useTheme";
import { NAV_LINKS, SITE } from "@/lib/config";

export default function Footer() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <footer className="border-t border-footer-border bg-footer-bg">
      <div className="max-w-[80rem] mx-auto px-6 lg:px-28 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Left */}
          <div>
            <p className="text-sm tracking-[0.2em] text-footer-logo">
              {SITE.name}
            </p>
            <p className="text-[11px] mt-1 tracking-widest text-footer-tagline">
              {SITE.tagline}
            </p>
          </div>

          {/* Center nav */}
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {NAV_LINKS.filter((link) => link.href !== "/").map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12px] transition-colors duration-300 tracking-wider text-footer-link hover:text-footer-link-hover"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right */}
          <p className="text-[11px] tracking-widest text-footer-copyright">
            Built with love · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
