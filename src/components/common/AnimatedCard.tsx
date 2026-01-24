import { memo, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  index?: number;
  hoverable?: boolean;
  onClick?: () => void;
}

const AnimatedCard = memo(({
  children,
  className,
  index = 0,
  hoverable = true,
  onClick,
}: AnimatedCardProps) => {
  return (
    <Card
      className={cn(
        "stagger-item",
        hoverable && "card-hover cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onClick}
    >
      {children}
    </Card>
  );
});

AnimatedCard.displayName = "AnimatedCard";

export default AnimatedCard;
