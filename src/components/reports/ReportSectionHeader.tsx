import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  action?: React.ReactNode;
  className?: string;
}

const ReportSectionHeader = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  action,
  className,
}: ReportSectionHeaderProps) => {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4",
      className
    )}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
};

export default ReportSectionHeader;
