import { memo, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";

interface PageHeaderProps {
  title: string;
  backPath?: string;
  showBackButton?: boolean;
  showOnlineStatus?: boolean;
  rightContent?: ReactNode;
  children?: ReactNode;
}

const PageHeader = memo(({
  title,
  backPath = "/dashboard",
  showBackButton = true,
  showOnlineStatus = true,
  rightContent,
  children,
}: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backPath)}
            className="btn-press shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-xl font-bold truncate">{title}</h1>
        
        {showOnlineStatus && (
          <div className="ml-2">
            <OnlineStatusIndicator />
          </div>
        )}
        
        <div className="flex-1" />
        
        {rightContent}
        {children}
      </div>
    </header>
  );
});

PageHeader.displayName = "PageHeader";

export default PageHeader;
