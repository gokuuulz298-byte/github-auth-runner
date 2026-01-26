import { memo } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface PageLoaderProps {
  pageName?: string;
}

/**
 * Unified page loader component to be used across all pages.
 * This ensures consistent loading experience throughout the app.
 */
const PageLoader = memo(({ pageName }: PageLoaderProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="fade-in">
        <LoadingSpinner 
          size="lg" 
          text={pageName ? `Loading ${pageName}...` : "Loading..."} 
        />
      </div>
    </div>
  );
});

PageLoader.displayName = "PageLoader";

export default PageLoader;
