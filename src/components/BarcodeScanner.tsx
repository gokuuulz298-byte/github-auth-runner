import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScanBarcode, X } from "lucide-react";
import { toast } from "sonner";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  disabled?: boolean;
}

const BarcodeScanner = ({ onScan, disabled }: BarcodeScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);

  // Listen for barcode scanner input (rapid keystrokes)
  // Barcode scanners send characters VERY fast (< 50ms between keys)
  // This distinguishes scanner input from normal typing
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastKeyTime.current;
      
      // Barcode scanners are VERY fast - typically < 50ms between keys
      // If it's been more than 50ms since last keystroke, start fresh buffer
      if (timeSinceLastKey > 50) {
        barcodeBuffer.current = "";
      }
      lastKeyTime.current = currentTime;

      // Handle Enter key - submit barcode if we have one
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          onScan(barcodeBuffer.current);
          barcodeBuffer.current = "";
        }
        return;
      }

      // Only accept alphanumeric and common barcode characters
      // When scanner is active (rapid input), capture the keys
      if (/^[a-zA-Z0-9\-_]$/.test(e.key)) {
        barcodeBuffer.current += e.key;
        
        // If we're getting rapid input (scanner mode), prevent default
        // to avoid typing in focused input fields
        if (timeSinceLastKey < 50 && barcodeBuffer.current.length > 1) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // Use capture phase to intercept before other handlers
    window.addEventListener('keydown', handleKeyPress, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyPress, { capture: true });
  }, [onScan]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim().length >= 3) {
      onScan(manualBarcode.trim());
      setManualBarcode("");
      setIsOpen(false);
      toast.success(`Barcode entered: ${manualBarcode.trim()}`);
    } else {
      toast.error("Please enter a valid barcode (min 3 characters)");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          disabled={disabled}
          title="Scan Barcode (or just scan with USB scanner)"
        >
          <ScanBarcode className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Barcode Scanner
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Scan with USB barcode scanner
            </p>
            <p className="text-xs text-muted-foreground">
              Point the scanner at a barcode - it will be detected automatically
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or enter manually
              </span>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Enter barcode..."
              className="barcode-input flex-1"
              autoComplete="off"
            />
            <Button type="submit">Add</Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            USB barcode scanners work automatically - just scan anywhere on this page
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
