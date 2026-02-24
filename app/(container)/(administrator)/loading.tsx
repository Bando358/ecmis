import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-4 max-w-225 mx-auto p-4">
      {/* Header: back button + title + toggle button */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-8" />
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 max-w-sm" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <th key={i} className="p-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, row) => (
              <tr key={row} className="border-b">
                {Array.from({ length: 5 }).map((_, col) => (
                  <td key={col} className="p-3">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
