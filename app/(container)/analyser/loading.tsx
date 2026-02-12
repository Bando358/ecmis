import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyserLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[250px]" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-[100px]" />
          <Skeleton className="h-8 w-[100px]" />
          <Skeleton className="h-8 w-[100px]" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Skeleton className="h-[600px]" />
        <Skeleton className="h-[600px] lg:col-span-3" />
      </div>
    </div>
  );
}
