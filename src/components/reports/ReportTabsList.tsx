import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  hidden?: boolean;
}

interface ReportTabsListProps {
  tabs: TabItem[];
  className?: string;
}

const ReportTabsList = ({ tabs, className }: ReportTabsListProps) => {
  const visibleTabs = tabs.filter(tab => !tab.hidden);
  
  return (
    <div className={cn("overflow-x-auto -mx-2 px-2 pb-2 scrollbar-thin", className)}>
      <TabsList className={cn(
        "inline-flex w-auto min-w-full h-auto p-1.5 gap-1",
        "bg-muted/50 backdrop-blur-sm rounded-xl border border-border/50",
        "flex-wrap md:flex-nowrap"
      )}>
        {visibleTabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:shadow-sm",
              "data-[state=active]:text-primary data-[state=active]:border-primary/20",
              "rounded-lg px-3 py-2 text-sm font-medium transition-all",
              "hover:bg-background/50 hover:text-foreground",
              "flex items-center gap-1.5 whitespace-nowrap"
            )}
          >
            {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
            <span>{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
};

export default ReportTabsList;
