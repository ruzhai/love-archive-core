import type { Metadata } from "next";
import { Inter, Noto_Sans_SC, Noto_Serif_SC, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/config";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/lib/auth/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminBar from "@/components/AdminBar";
import { UploadProgressProvider } from "@/hooks/useUploadProgress";
import UploadToast from "@/components/UploadToast";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// 衬线字体 —— 双主题的「展示标题」灵魂：
//   --font-serif       中文衬线（Noto Serif SC）
//   --font-serif-latin 英文衬线（Playfair Display，用于 "LOVE ARCHIVE" 品牌字）
const notoSerifSC = Noto_Serif_SC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-serif-latin",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${SITE.name} · ${SITE.nameCn}`,
  description: SITE.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${notoSansSC.variable} ${notoSerifSC.variable} ${playfairDisplay.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Blocking script: set theme BEFORE paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('love-archive-theme');
                  if (theme === 'light' || (!theme && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'light');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary font-[family-name:var(--font-body)]">
        {/* Global SVG filters for glow effects */}
        <svg className="absolute w-0 h-0" aria-hidden="true">
          <defs>
            <filter id="glow-amber">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-amber-strong">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
              <feGaussianBlur stdDeviation="12" result="blur2" />
              <feComposite in="blur" in2="blur2" operator="over" />
            </filter>
          </defs>
        </svg>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
            <UploadProgressProvider>
              <Navbar />
              <main className="relative z-10 min-h-screen">{children}</main>
              <Footer />
              <AdminBar />
              <UploadToast />
            </UploadProgressProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
