import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportChartCardProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  fullHeight?: boolean;
}

const ReportChartCard = ({
  title,
  icon: Icon,
  iconColor = "text-primary",
  children,
  className,
  action,
  fullHeight = false,
}: ReportChartCardProps) => {
  return (
    <Card className={cn(
      "overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm",
      "transition-all duration-300 hover:shadow-lg hover:border-border",
      fullHeight && "h-full",
      className
    )}>
      <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            {Icon && <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />}
            <span className="truncate">{title}</span>
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4">
        {children}
      </CardContent>
    </Card>
  );
};

export default ReportChartCard;
