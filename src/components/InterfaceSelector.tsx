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
import { Monitor, ChefHat, Lock, Eye, EyeOff, UserCircle } from "lucide-react";
import { toast } from "sonner";

interface Waiter {
  id: string;
  username: string;
  password: string;
  display_name: string;
}

interface InterfaceSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (interfaceType: 'billing' | 'kitchen' | 'waiter', waiterData?: { id: string; name: string }) => void;
  billingPassword?: string;
  kitchenPassword?: string;
  securityEnabled: boolean;
  waiters?: Waiter[];
  enableWaiters?: boolean;
}

const InterfaceSelector = ({
  open,
  onClose,
  onSelect,
  billingPassword,
  kitchenPassword,
  securityEnabled,
  waiters = [],
  enableWaiters = false,
}: InterfaceSelectorProps) => {
  const [selectedInterface, setSelectedInterface] = useState<'billing' | 'kitchen' | 'waiter' | null>(null);
  const [password, setPassword] = useState("");
  const [waiterUsername, setWaiterUsername] = useState("");
  const [waiterPassword, setWaiterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'select' | 'password' | 'waiter-login'>('select');

  const handleInterfaceClick = (type: 'billing' | 'kitchen' | 'waiter') => {
    if (type === 'waiter') {
      setSelectedInterface(type);
      setStep('waiter-login');
      setWaiterUsername("");
      setWaiterPassword("");
      return;
    }

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

  const handleWaiterLogin = () => {
    const waiter = waiters.find(w => 
      w.username === waiterUsername && w.password === waiterPassword
    );

    if (waiter) {
      onSelect('waiter', { id: waiter.id, name: waiter.display_name });
      setStep('select');
      setWaiterUsername("");
      setWaiterPassword("");
      setSelectedInterface(null);
    } else {
      toast.error("Invalid waiter credentials");
    }
  };

  const handleBack = () => {
    setStep('select');
    setPassword("");
    setWaiterUsername("");
    setWaiterPassword("");
    setSelectedInterface(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {step === 'select' && 'Select Interface'}
            {step === 'password' && `Enter ${selectedInterface === 'billing' ? 'Billing' : 'Kitchen'} Password`}
            {step === 'waiter-login' && 'Waiter Login'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className={`grid ${enableWaiters ? 'grid-cols-3' : 'grid-cols-2'} gap-4 py-4`}>
            <Card 
              className="cursor-pointer hover:ring-2 hover:ring-primary transition-all hover:shadow-lg group"
              onClick={() => handleInterfaceClick('billing')}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Monitor className="h-7 w-7 text-primary" />
                </div>
                <span className="font-semibold">Billing</span>
                <span className="text-xs text-muted-foreground text-center">POS Interface</span>
                {securityEnabled && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all hover:shadow-lg group"
              onClick={() => handleInterfaceClick('kitchen')}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <ChefHat className="h-7 w-7 text-orange-600" />
                </div>
                <span className="font-semibold">Kitchen</span>
                <span className="text-xs text-muted-foreground text-center">Order Display</span>
                {securityEnabled && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </CardContent>
            </Card>

            {enableWaiters && (
              <Card 
                className="cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all hover:shadow-lg group"
                onClick={() => handleInterfaceClick('waiter')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                    <UserCircle className="h-7 w-7 text-indigo-600" />
                  </div>
                  <span className="font-semibold">Waiter</span>
                  <span className="text-xs text-muted-foreground text-center">Order Entry</span>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            )}
          </div>
        ) : step === 'password' ? (
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
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <UserCircle className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="waiter-username">Username</Label>
              <Input
                id="waiter-username"
                type="text"
                value={waiterUsername}
                onChange={(e) => setWaiterUsername(e.target.value)}
                placeholder="Enter username"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waiter-password">Password</Label>
              <div className="relative">
                <Input
                  id="waiter-password"
                  type={showPassword ? "text" : "password"}
                  value={waiterPassword}
                  onChange={(e) => setWaiterPassword(e.target.value)}
                  placeholder="Enter password"
                  onKeyDown={(e) => e.key === 'Enter' && handleWaiterLogin()}
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
              <Button onClick={handleWaiterLogin} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                Login
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InterfaceSelector;