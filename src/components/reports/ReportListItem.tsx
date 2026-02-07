import { cn } from "@/lib/utils";

interface ReportListItemProps {
  rank?: number;
  title: string;
  subtitle?: string;
  value: string;
  valueColor?: 'green' | 'blue' | 'red' | 'orange' | 'purple' | 'default';
  secondaryValue?: string;
  secondaryColor?: string;
  highlight?: boolean;
  badge?: React.ReactNode;
}

const valueColors = {
  green: 'text-green-600 dark:text-green-400',
  blue: 'text-blue-600 dark:text-blue-400',
  red: 'text-red-600 dark:text-red-400',
  orange: 'text-orange-600 dark:text-orange-400',
  purple: 'text-purple-600 dark:text-purple-400',
  default: 'text-foreground',
};

const ReportListItem = ({
  rank,
  title,
  subtitle,
  value,
  valueColor = 'green',
  secondaryValue,
  secondaryColor,
  highlight = false,
  badge,
}: ReportListItemProps) => {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg transition-all duration-200",
      "hover:bg-muted/50 group",
      highlight 
        ? "bg-gradient-to-r from-primary/5 to-transparent border border-primary/10" 
        : "bg-muted/30"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        {rank !== undefined && (
          <div className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0",
            rank <= 3 
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm" 
              : "bg-muted text-muted-foreground"
          )}>
            {rank}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{title}</p>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className={cn("font-bold text-sm", valueColors[valueColor])}>
          {value}
        </p>
        {secondaryValue && (
          <p className={cn("text-xs", secondaryColor || "text-muted-foreground")}>
            {secondaryValue}
          </p>
        )}
      </div>
    </div>
  );
};

export default ReportListItem;
