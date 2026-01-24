import { memo, ReactNode, useEffect, useState } from "react";

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

const PageWrapper = memo(({ children, className = "" }: PageWrapperProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 ${
        mounted ? "page-enter" : "opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
});

PageWrapper.displayName = "PageWrapper";

export default PageWrapper;
