import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      className="card-hover cursor-pointer group stagger-item border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden relative"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
    >
      {/* Top gradient accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${color} opacity-80 group-hover:opacity-100 transition-opacity`} />
      
      <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 bg-gradient-to-br ${color} rounded-xl shrink-0 group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-semibold leading-tight">{label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden sm:block">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
});

DashboardMenuCard.displayName = "DashboardMenuCard";

export default DashboardMenuCard;
