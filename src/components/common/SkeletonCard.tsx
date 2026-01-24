import { memo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonCardProps {
  lines?: number;
  showHeader?: boolean;
}

const SkeletonCard = memo(({ lines = 3, showHeader = true }: SkeletonCardProps) => {
  return (
    <Card className="fade-in">
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
      )}
      <CardContent className={showHeader ? "" : "pt-6"}>
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4"
              style={{ width: `${100 - i * 15}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

SkeletonCard.displayName = "SkeletonCard";

export default SkeletonCard;
