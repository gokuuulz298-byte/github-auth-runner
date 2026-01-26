import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale } from "lucide-react";

interface WeightSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onConfirm: (weight: number) => void;
}

const QUICK_WEIGHTS = [0.25, 0.5, 0.75, 1, 1.5, 2];

const WeightSelectionDialog = ({
  open,
  onOpenChange,
  productName,
  onConfirm,
}: WeightSelectionDialogProps) => {
  const [customWeight, setCustomWeight] = useState<string>("1");

  const handleQuickWeight = (weight: number) => {
    onConfirm(weight);
    onOpenChange(false);
    setCustomWeight("1");
  };

  const handleCustomConfirm = () => {
    const weight = parseFloat(customWeight);
    if (weight > 0) {
      onConfirm(weight);
      onOpenChange(false);
      setCustomWeight("1");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Select Weight for {productName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Quick Weight Buttons */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Quick Select (kg)</Label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_WEIGHTS.map((weight) => (
                <Button
                  key={weight}
                  variant="outline"
                  className="h-12 text-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleQuickWeight(weight)}
                >
                  {weight} kg
                </Button>
              ))}
            </div>
          </div>
          
          {/* Custom Weight Input */}
          <div className="pt-2 border-t">
            <Label htmlFor="custom-weight" className="text-sm text-muted-foreground">
              Custom Weight (kg)
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="custom-weight"
                type="number"
                step="0.01"
                min="0.01"
                value={customWeight}
                onChange={(e) => setCustomWeight(e.target.value)}
                placeholder="Enter weight"
                className="text-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomConfirm();
                  }
                }}
              />
              <Button onClick={handleCustomConfirm} className="px-6">
                Add
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeightSelectionDialog;
