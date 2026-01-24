import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MenuCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  index: number;
  onClick: () => void;
}

const DashboardMenuCard = memo(({
  icon: Icon,
  label,
  description,
  color,
  index,
  onClick,
}: MenuCardProps) => {
  return (
    <Card
      className="card-hover cursor-pointer group stagger-item"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
    >
      <CardHeader className="p-3 sm:p-6">
        <div
          className={`p-2 sm:p-3 bg-gradient-to-br ${color} rounded-xl w-fit mb-2 group-hover:scale-110 transition-transform duration-200`}
        >
          <Icon className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
        </div>
        <CardTitle className="text-sm sm:text-base md:text-lg">{label}</CardTitle>
        <CardDescription className="hidden sm:block text-xs sm:text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0 hidden md:block">
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      </CardContent>
    </Card>
  );
});

DashboardMenuCard.displayName = "DashboardMenuCard";

export default DashboardMenuCard;
