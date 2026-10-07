"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import SectionHeading from "./SectionHeading";

const ENTRANCES = [
  { href: "/timeline", num: "02", label: "时间线", en: "Timeline", emoji: "🕯️", desc: "沿着时间，回望每个重要节点。" },
  { href: "/diary", num: "03", label: "日记", en: "Diary", emoji: "📖", desc: "一封封日记，是我们的小小馆藏。" },
  { href: "/gallery", num: "04", label: "照片墙", en: "Gallery", emoji: "📷", desc: "定格那些笑得最真的瞬间。" },
  { href: "/videos", num: "05", label: "视频影院", en: "Cinema", emoji: "🎬", desc: "会动的回忆，值得再看一遍。" },
  { href: "/playlist", num: "06", label: "我们的歌", en: "Playlist", emoji: "🎧", desc: "每首歌，都替我们说着话。" },
  { href: "/private", num: "08", label: "私密区", en: "Vault", emoji: "🔐", desc: "只属于我们的小秘密。" },
];

/** 「馆藏入口」：六个分馆的精致入口卡片。 */
export default function CollectionEntrances() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          supertitle="Collections"
          title="馆藏入口"
          subtitle="六个分馆，各自收藏着一种想念。"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ENTRANCES.map((e, i) => (
            <motion.div
              key={e.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.07, ease: [0.4, 0, 0.2, 1] }}
            >
              <Link href={e.href} className="card card-interactive p-6 flex flex-col gap-4 h-full group">
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{e.emoji}</span>
                  <span className="text-[11px] tracking-[0.2em] text-page-supertitle">{e.num}</span>
                </div>
                <div>
                  <p className="font-display-serif text-lg md:text-xl font-bold text-page-heading">
                    {e.label}
                  </p>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-page-supertitle mt-1">
                    {e.en}
                  </p>
                </div>
                <p className="text-xs leading-relaxed tracking-wider text-page-subtitle">
                  {e.desc}
                </p>
                <span className="text-page-supertitle text-xs transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
