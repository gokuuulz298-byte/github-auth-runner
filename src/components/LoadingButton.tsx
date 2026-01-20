import { forwardRef, useState, useCallback } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonProps {
  loadingText?: string;
  lockDuration?: number; // Duration in ms to lock the button after click
  isLoading?: boolean; // External loading state control
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, onClick, loadingText, lockDuration = 1000, disabled, className, isLoading: externalLoading, ...props }, ref) => {
    const [internalLoading, setInternalLoading] = useState(false);
    
    const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;

    const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading || disabled) return;
      
      if (externalLoading === undefined) {
        setInternalLoading(true);
      }
      
      try {
        if (onClick) {
          await onClick(e);
        }
      } finally {
        if (externalLoading === undefined) {
          // Lock for specified duration to prevent double-clicks
          setTimeout(() => {
            setInternalLoading(false);
          }, lockDuration);
        }
      }
    }, [onClick, isLoading, disabled, lockDuration, externalLoading]);

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={isLoading || disabled}
        className={cn(
          "transition-all",
          isLoading && "opacity-80 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";

export default LoadingButton;
