import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Filter, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Counter {
  id: string;
  name: string;
}

interface ReportFilterBarProps {
  timeRange: string;
  setTimeRange: (value: string) => void;
  selectedCounter: string;
  setSelectedCounter: (value: string) => void;
  counters: Counter[];
  onRefresh: () => void;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

const TIME_RANGE_LABELS: Record<string, string> = {
  today: 'Today',
  week: 'This Week',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  month: 'This Month',
  all: 'All Time',
};

const ReportFilterBar = ({
  timeRange,
  setTimeRange,
  selectedCounter,
  setSelectedCounter,
  counters,
  onRefresh,
  isOpen,
  setIsOpen,
}: ReportFilterBarProps) => {
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "w-full flex items-center justify-between",
            "bg-gradient-to-r from-primary/5 via-background to-primary/5",
            "border-primary/20 hover:border-primary/40",
            "transition-all duration-300"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-primary/10">
              <Filter className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-medium">Filters</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {TIME_RANGE_LABELS[timeRange] || timeRange}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-3">
        <div className={cn(
          "p-4 rounded-xl border border-border/50",
          "bg-gradient-to-br from-card via-card to-muted/20",
          "backdrop-blur-sm"
        )}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Counter</label>
              <Select value={selectedCounter} onValueChange={setSelectedCounter}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Counters</SelectItem>
                  {counters.map((counter) => (
                    <SelectItem key={counter.id} value={counter.id}>
                      {counter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={onRefresh} className="w-full gap-2">
                <Activity className="h-4 w-4" />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ReportFilterBar;
