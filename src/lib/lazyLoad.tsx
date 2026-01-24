import { Suspense, lazy, ComponentType } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

// Lazy load pages for code splitting
export const lazyLoad = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) => {
  const LazyComponent = lazy(importFn);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={<PageLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Page loading fallback
const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
    <LoadingSpinner />
  </div>
);

export default PageLoadingFallback;
