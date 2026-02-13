import { memo } from "react";
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
    <button
      className="group relative w-full text-left rounded-xl border border-border/60 bg-card hover:bg-accent/5 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring/40"
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={onClick}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${color} opacity-70 group-hover:opacity-100 transition-opacity`} />
      
      <div className="flex items-center gap-3 p-3.5 sm:p-4 pl-4 sm:pl-5">
        <div
          className={`flex-shrink-0 p-2 sm:p-2.5 bg-gradient-to-br ${color} rounded-lg group-hover:scale-105 transition-transform duration-200`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-[15px] font-semibold text-foreground leading-tight truncate">{label}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
});

DashboardMenuCard.displayName = "DashboardMenuCard";

export default DashboardMenuCard;
