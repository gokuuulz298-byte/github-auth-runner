import { memo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

const SkeletonTable = memo(({ rows = 5, columns = 4 }: SkeletonTableProps) => {
  return (
    <Card className="fade-in">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex gap-4 border-b pb-3">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {/* Data rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className="h-4 flex-1"
                  style={{ opacity: 1 - rowIndex * 0.1 }}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

SkeletonTable.displayName = "SkeletonTable";

export default SkeletonTable;
