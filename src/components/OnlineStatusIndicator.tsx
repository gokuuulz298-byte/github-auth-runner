import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const OnlineStatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Badge 
      variant={isOnline ? "default" : "destructive"} 
      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 ${
        isOnline 
          ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700' 
          : 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-2.5 w-2.5" />
          <span className="hidden sm:inline">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-2.5 w-2.5" />
          <span className="hidden sm:inline">Offline</span>
        </>
      )}
    </Badge>
  );
};

export default OnlineStatusIndicator;
