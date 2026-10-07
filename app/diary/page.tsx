import { Suspense } from "react";
import DiaryContent from "./DiaryContent";

export default function DiaryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <span className="text-white/20 text-xs tracking-widest">Loading…</span>
      </div>
    }>
      <DiaryContent />
    </Suspense>
  );
}
