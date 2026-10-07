// ==================== 站点集中配置 ====================
// 这是**唯一**需要改动的地方：改成你自己的名字、日期和站点标题。
//
// 每一项都可以用环境变量覆盖（见 .env.example），也有能直接跑起来的默认值。
// 注意 NEXT_PUBLIC_* 是在**构建时**注入客户端代码的 —— 用 Docker 部署时要把它们
// 作为 build args 传进去，改了之后需要重新 build（不是重新 start）。

export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "Love Archive",
  nameCn: process.env.NEXT_PUBLIC_SITE_NAME_CN || "恋爱档案馆",
  /** 首页大标题上方的那行小字 */
  supertitle: process.env.NEXT_PUBLIC_SITE_SUPERTITLE || "Private Digital Archive",
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || "我们的小宇宙，正在慢慢长大。",
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    "这里收藏着我们相遇以来，那些没有被时间冲淡的小事。",
};

export const DATES = {
  /** 相识日 / 故事的起点，用于首页的「已记录天数」 */
  startDate: process.env.NEXT_PUBLIC_START_DATE || "2024-01-01",
  /** 正式在一起的日子，用于「相伴天数」和纪念日倒数 */
  relationshipDate: process.env.NEXT_PUBLIC_RELATIONSHIP_DATE || "2024-02-14",
};

/** 两位记录者。key 是数据库里的稳定标识，label 是显示名 —— 改 label 不会动数据。 */
export const AUTHORS = {
  author1: {
    key: "author1",
    label: process.env.NEXT_PUBLIC_AUTHOR1_NAME || "我",
    emoji: process.env.NEXT_PUBLIC_AUTHOR1_EMOJI || "🧑",
    accent: "amber",
  },
  author2: {
    key: "author2",
    label: process.env.NEXT_PUBLIC_AUTHOR2_NAME || "你",
    emoji: process.env.NEXT_PUBLIC_AUTHOR2_EMOJI || "👧",
    accent: "rose",
  },
} as const;

export type AuthorKey = keyof typeof AUTHORS;

/** 根据作者 key 返回展示名，未知 key 原样返回。 */
export function authorLabel(key: string | null | undefined): string {
  if (!key) return "";
  return (AUTHORS as Record<string, { label: string }>)[key]?.label ?? key;
}

/** 首页「今天」卡片每月一句寄语，按月份索引（0 = 一月）。 */
export const MONTHLY_NOTES = [
  "一月，万物还在酝酿，我们也是。",
  "二月，短，但足够藏下一整份想念。",
  "三月，风里有花的消息。",
  "四月，适合把心事摊开晒一晒。",
  "五月，正是相爱的天气。",
  "六月，夏天替我们把话说完。",
  "七月，蝉鸣与晚风都记得。",
  "八月，热烈的日子慢慢收尾。",
  "九月，落叶在给下一次重逢写信。",
  "十月，秋天适合慢慢走。",
  "十一月，把温柔都收进大衣口袋。",
  "十二月，一年的故事落笔成章。",
];

export interface NavLink {
  href: string;
  label: string;
  num: string;
}

/** 全站主导航（Navbar 桌面/移动端共用一份）。 */
export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "首页", num: "01" },
  { href: "/timeline", label: "时间线", num: "02" },
  { href: "/diary", label: "日记", num: "03" },
  { href: "/gallery", label: "照片墙", num: "04" },
  { href: "/videos", label: "视频影院", num: "05" },
  { href: "/playlist", label: "我们的歌", num: "06" },
  { href: "/capsules", label: "时间胶囊", num: "07" },
  { href: "/stats", label: "数据", num: "08" },
];
