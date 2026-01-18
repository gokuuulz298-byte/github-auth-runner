import { useState, useEffect } from "react";
import { Printer, WifiOff, CheckCircle } from "lucide-react";
import { checkPrintServiceAvailable } from "@/lib/escposPrinter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PrinterStatusIndicatorProps {
  className?: string;
}

const PrinterStatusIndicator = ({ className }: PrinterStatusIndicatorProps) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = async () => {
    try {
      const available = await checkPrintServiceAvailable();
      setIsConnected(available);
      setLastChecked(new Date());
    } catch {
      setIsConnected(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    // Check immediately on mount
    checkStatus();

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (isConnected === null) return "text-muted-foreground";
    return isConnected ? "text-green-500" : "text-red-500";
  };

  const getStatusBg = () => {
    if (isConnected === null) return "bg-muted";
    return isConnected ? "bg-green-500/10" : "bg-red-500/10";
  };

  const getStatusText = () => {
    if (isConnected === null) return "Checking printer...";
    return isConnected ? "Printer Connected" : "Printer Offline";
  };

  const getStatusIcon = () => {
    if (isConnected === null) {
      return <Printer className="h-4 w-4 animate-pulse" />;
    }
    if (isConnected) {
      return <CheckCircle className="h-4 w-4" />;
    }
    return <WifiOff className="h-4 w-4" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer ${getStatusBg()} ${getStatusColor()} ${className}`}
            onClick={checkStatus}
          >
            {getStatusIcon()}
            <span className="text-xs font-medium hidden sm:inline">
              {isConnected === null ? "..." : isConnected ? "Online" : "Offline"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{getStatusText()}</p>
            {lastChecked && (
              <p className="text-xs text-muted-foreground">
                Last checked: {lastChecked.toLocaleTimeString()}
              </p>
            )}
            {!isConnected && isConnected !== null && (
              <p className="text-xs text-muted-foreground">
                Start local print service on port 3001
              </p>
            )}
            <p className="text-xs text-muted-foreground italic">
              Click to refresh status
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PrinterStatusIndicator;
