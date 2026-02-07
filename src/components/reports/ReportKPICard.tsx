import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'cyan' | 'emerald' | 'pink' | 'indigo' | 'amber' | 'teal';
  className?: string;
  size?: 'default' | 'compact';
}

const variants = {
  blue: {
    card: 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-200/50 dark:border-blue-800/50',
    iconWrapper: 'bg-blue-500/15 ring-1 ring-blue-500/20',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-600/80 dark:text-blue-400/80',
    value: 'text-blue-700 dark:text-blue-300',
    glow: 'shadow-blue-500/5',
  },
  green: {
    card: 'bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-200/50 dark:border-green-800/50',
    iconWrapper: 'bg-green-500/15 ring-1 ring-green-500/20',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-600/80 dark:text-green-400/80',
    value: 'text-green-700 dark:text-green-300',
    glow: 'shadow-green-500/5',
  },
  purple: {
    card: 'bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-200/50 dark:border-purple-800/50',
    iconWrapper: 'bg-purple-500/15 ring-1 ring-purple-500/20',
    icon: 'text-purple-600 dark:text-purple-400',
    title: 'text-purple-600/80 dark:text-purple-400/80',
    value: 'text-purple-700 dark:text-purple-300',
    glow: 'shadow-purple-500/5',
  },
  orange: {
    card: 'bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border-orange-200/50 dark:border-orange-800/50',
    iconWrapper: 'bg-orange-500/15 ring-1 ring-orange-500/20',
    icon: 'text-orange-600 dark:text-orange-400',
    title: 'text-orange-600/80 dark:text-orange-400/80',
    value: 'text-orange-700 dark:text-orange-300',
    glow: 'shadow-orange-500/5',
  },
  red: {
    card: 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-200/50 dark:border-red-800/50',
    iconWrapper: 'bg-red-500/15 ring-1 ring-red-500/20',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-600/80 dark:text-red-400/80',
    value: 'text-red-700 dark:text-red-300',
    glow: 'shadow-red-500/5',
  },
  cyan: {
    card: 'bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent border-cyan-200/50 dark:border-cyan-800/50',
    iconWrapper: 'bg-cyan-500/15 ring-1 ring-cyan-500/20',
    icon: 'text-cyan-600 dark:text-cyan-400',
    title: 'text-cyan-600/80 dark:text-cyan-400/80',
    value: 'text-cyan-700 dark:text-cyan-300',
    glow: 'shadow-cyan-500/5',
  },
  emerald: {
    card: 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200/50 dark:border-emerald-800/50',
    iconWrapper: 'bg-emerald-500/15 ring-1 ring-emerald-500/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-600/80 dark:text-emerald-400/80',
    value: 'text-emerald-700 dark:text-emerald-300',
    glow: 'shadow-emerald-500/5',
  },
  pink: {
    card: 'bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-transparent border-pink-200/50 dark:border-pink-800/50',
    iconWrapper: 'bg-pink-500/15 ring-1 ring-pink-500/20',
    icon: 'text-pink-600 dark:text-pink-400',
    title: 'text-pink-600/80 dark:text-pink-400/80',
    value: 'text-pink-700 dark:text-pink-300',
    glow: 'shadow-pink-500/5',
  },
  indigo: {
    card: 'bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-200/50 dark:border-indigo-800/50',
    iconWrapper: 'bg-indigo-500/15 ring-1 ring-indigo-500/20',
    icon: 'text-indigo-600 dark:text-indigo-400',
    title: 'text-indigo-600/80 dark:text-indigo-400/80',
    value: 'text-indigo-700 dark:text-indigo-300',
    glow: 'shadow-indigo-500/5',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-200/50 dark:border-amber-800/50',
    iconWrapper: 'bg-amber-500/15 ring-1 ring-amber-500/20',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-600/80 dark:text-amber-400/80',
    value: 'text-amber-700 dark:text-amber-300',
    glow: 'shadow-amber-500/5',
  },
  teal: {
    card: 'bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border-teal-200/50 dark:border-teal-800/50',
    iconWrapper: 'bg-teal-500/15 ring-1 ring-teal-500/20',
    icon: 'text-teal-600 dark:text-teal-400',
    title: 'text-teal-600/80 dark:text-teal-400/80',
    value: 'text-teal-700 dark:text-teal-300',
    glow: 'shadow-teal-500/5',
  },
};

const ReportKPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant,
  className,
  size = 'default',
}: ReportKPICardProps) => {
  const styles = variants[variant];
  const isCompact = size === 'compact';

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5",
        styles.card,
        styles.glow,
        isCompact ? "p-3" : "p-4 sm:p-5",
        className
      )}
    >
      {/* Decorative gradient orb */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-2xl opacity-60" />
      
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-semibold uppercase tracking-wider truncate",
            styles.title,
            isCompact ? "text-[10px]" : "text-xs"
          )}>
            {title}
          </p>
          <p className={cn(
            "font-bold tracking-tight mt-1",
            styles.value,
            isCompact ? "text-lg" : "text-xl sm:text-2xl"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              <span className="text-xs font-medium">
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
        
        <div className={cn(
          "shrink-0 rounded-xl flex items-center justify-center",
          styles.iconWrapper,
          isCompact ? "p-2" : "p-2.5 sm:p-3"
        )}>
          <Icon className={cn(
            styles.icon,
            isCompact ? "h-4 w-4" : "h-5 w-5 sm:h-6 sm:w-6"
          )} />
        </div>
      </div>
    </div>
  );
};

export default ReportKPICard;
