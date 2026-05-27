import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-2 h-3 w-72" />
      </div>
      <SkeletonList rows={4} />
    </div>
  );
}
