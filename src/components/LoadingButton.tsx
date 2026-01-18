import { forwardRef, useState, useCallback } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonProps {
  loadingText?: string;
  lockDuration?: number; // Duration in ms to lock the button after click
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, onClick, loadingText, lockDuration = 1000, disabled, className, ...props }, ref) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading || disabled) return;
      
      setIsLoading(true);
      
      try {
        if (onClick) {
          await onClick(e);
        }
      } finally {
        // Lock for specified duration to prevent double-clicks
        setTimeout(() => {
          setIsLoading(false);
        }, lockDuration);
      }
    }, [onClick, isLoading, disabled, lockDuration]);

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
