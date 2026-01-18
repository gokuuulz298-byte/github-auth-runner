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
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in an input field (except our barcode input)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Only allow barcode input field
        if (!target.classList.contains('barcode-input')) {
          return;
        }
      }

      const currentTime = Date.now();
      
      // If it's been more than 100ms since last keystroke, start fresh
      // Barcode scanners typically send characters very rapidly
      if (currentTime - lastKeyTime.current > 100) {
        barcodeBuffer.current = "";
      }
      lastKeyTime.current = currentTime;

      // Handle Enter key - submit barcode
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          e.preventDefault();
          onScan(barcodeBuffer.current);
          toast.success(`Scanned: ${barcodeBuffer.current}`);
          barcodeBuffer.current = "";
        }
        return;
      }

      // Only accept alphanumeric and common barcode characters
      if (/^[a-zA-Z0-9\-_]$/.test(e.key)) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
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
