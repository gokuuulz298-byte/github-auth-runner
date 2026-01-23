import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorScheme: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'cyan' | 'emerald' | 'pink' | 'indigo';
  className?: string;
}

const colorSchemes = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-700 dark:text-blue-400',
    valueColor: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500',
    titleColor: 'text-green-700 dark:text-green-400',
    valueColor: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    titleColor: 'text-purple-700 dark:text-purple-400',
    valueColor: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
    titleColor: 'text-orange-700 dark:text-orange-400',
    valueColor: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    titleColor: 'text-red-700 dark:text-red-400',
    valueColor: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-500',
    titleColor: 'text-cyan-700 dark:text-cyan-400',
    valueColor: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    titleColor: 'text-emerald-700 dark:text-emerald-400',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-50 to-pink-100/50 dark:from-pink-950/30 dark:to-pink-900/20',
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-500',
    titleColor: 'text-pink-700 dark:text-pink-400',
    valueColor: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-200 dark:border-pink-800',
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20',
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-500',
    titleColor: 'text-indigo-700 dark:text-indigo-400',
    valueColor: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
};

const AnalyticsKPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme,
  className,
}: AnalyticsKPICardProps) => {
  const colors = colorSchemes[colorScheme];

  return (
    <Card className={cn(colors.bg, colors.border, "shadow-sm transition-all hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn("text-xs sm:text-sm font-medium", colors.titleColor)}>
          {title}
        </CardTitle>
        <div className={cn("p-1.5 rounded-lg", colors.iconBg)}>
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", colors.iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-lg sm:text-2xl font-bold", colors.valueColor)}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
        {trend && (
          <p className={cn(
            "text-xs mt-1 flex items-center gap-1",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )}>
            <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalyticsKPICard;
