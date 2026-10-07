import { getRelationshipDate } from "@/lib/data";
import { DATES } from "@/lib/config";
import { getHomeData } from "@/lib/home";
import Hero from "@/components/Hero";
import TodayCard from "@/components/home/TodayCard";
import OnThisDaySection from "@/components/home/OnThisDaySection";
import AnniversarySection from "@/components/home/AnniversarySection";
import RecentSection from "@/components/home/RecentSection";
import CollectionEntrances from "@/components/home/CollectionEntrances";

// 首页展示「今天」的实时数据（那年今日 / 纪念日倒数 / 最近动态），
// 必须每次请求都新鲜渲染，不能把某一天的日期烤进静态页。
export const dynamic = "force-dynamic";

export default async function Home() {
  const relationshipDate = getRelationshipDate();
  const home = await getHomeData();

  return (
    <>
      <Hero
        startDate={DATES.startDate}
        relationshipDate={relationshipDate}
        counts={home.counts}
      />

      <TodayCard
        startDate={DATES.startDate}
        relationshipDate={relationshipDate}
      />

      <OnThisDaySection data={home.onThisDay} />

      <AnniversarySection anniversaries={home.upcomingAnniversaries} />

      <RecentSection recent={home.recent} />

      <CollectionEntrances />
    </>
  );
}
