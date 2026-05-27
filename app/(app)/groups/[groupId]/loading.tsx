import { SkeletonList, SkeletonStat } from "@/components/ui/skeleton";

export default function GroupLoading() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonList rows={3} />
        <SkeletonList rows={3} />
      </div>
      <SkeletonList rows={5} />
    </div>
  );
}
