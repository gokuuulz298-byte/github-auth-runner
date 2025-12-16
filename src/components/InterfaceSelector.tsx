import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor, ChefHat, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface InterfaceSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (interfaceType: 'billing' | 'kitchen') => void;
  billingPassword?: string;
  kitchenPassword?: string;
  securityEnabled: boolean;
}

const InterfaceSelector = ({
  open,
  onClose,
  onSelect,
  billingPassword,
  kitchenPassword,
  securityEnabled,
}: InterfaceSelectorProps) => {
  const [selectedInterface, setSelectedInterface] = useState<'billing' | 'kitchen' | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'select' | 'password'>('select');

  const handleInterfaceClick = (type: 'billing' | 'kitchen') => {
    if (securityEnabled) {
      setSelectedInterface(type);
      setStep('password');
      setPassword("");
    } else {
      onSelect(type);
    }
  };

  const handlePasswordSubmit = () => {
    const requiredPassword = selectedInterface === 'billing' ? billingPassword : kitchenPassword;
    
    if (password === requiredPassword) {
      onSelect(selectedInterface!);
      setStep('select');
      setPassword("");
      setSelectedInterface(null);
    } else {
      toast.error("Incorrect password");
    }
  };

  const handleBack = () => {
    setStep('select');
    setPassword("");
    setSelectedInterface(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {step === 'select' ? 'Select Interface' : `Enter ${selectedInterface === 'billing' ? 'Billing' : 'Kitchen'} Password`}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            <Card 
              className="cursor-pointer hover:ring-2 hover:ring-primary transition-all hover:shadow-lg group"
              onClick={() => handleInterfaceClick('billing')}
            >
              <CardContent className="p-6 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Monitor className="h-8 w-8 text-primary" />
                </div>
                <span className="font-semibold text-lg">Billing</span>
                <span className="text-xs text-muted-foreground text-center">Point of Sale Interface</span>
                {securityEnabled && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all hover:shadow-lg group"
              onClick={() => handleInterfaceClick('kitchen')}
            >
              <CardContent className="p-6 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <ChefHat className="h-8 w-8 text-orange-600" />
                </div>
                <span className="font-semibold text-lg">Kitchen</span>
                <span className="text-xs text-muted-foreground text-center">Order Display System</span>
                {securityEnabled && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                selectedInterface === 'billing' ? 'bg-primary/10' : 'bg-orange-100'
              }`}>
                {selectedInterface === 'billing' ? (
                  <Monitor className="h-8 w-8 text-primary" />
                ) : (
                  <ChefHat className="h-8 w-8 text-orange-600" />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={handlePasswordSubmit} className="flex-1">
                Unlock
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InterfaceSelector;