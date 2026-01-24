import { memo, ReactNode } from "react";

interface ContentWrapperProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

const ContentWrapper = memo(({ children, className = "", noPadding = false }: ContentWrapperProps) => {
  return (
    <main
      className={`flex-1 smooth-scroll ${
        noPadding ? "" : "container mx-auto px-4 py-6"
      } ${className}`}
    >
      {children}
    </main>
  );
});

ContentWrapper.displayName = "ContentWrapper";

export default ContentWrapper;
