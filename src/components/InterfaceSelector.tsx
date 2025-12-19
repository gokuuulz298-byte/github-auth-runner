import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor, ChefHat, Lock, Eye, EyeOff, UserCircle, ArrowLeft } from "lucide-react";
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

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="w-full max-w-lg mx-4">
        <div className="bg-card rounded-2xl shadow-2xl border overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-center">
            <h1 className="text-2xl font-bold text-primary-foreground">
              {step === 'select' && 'Select Interface'}
              {step === 'password' && `${selectedInterface === 'billing' ? 'Billing' : 'Kitchen'} Access`}
              {step === 'waiter-login' && 'Waiter Login'}
            </h1>
            <p className="text-primary-foreground/80 text-sm mt-1">
              {step === 'select' && 'Choose your role to continue'}
              {step === 'password' && 'Enter password to unlock'}
              {step === 'waiter-login' && 'Enter your credentials'}
            </p>
          </div>

          <div className="p-6">
            {step === 'select' ? (
              <div className={`grid ${enableWaiters ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
                <Card 
                  className="cursor-pointer hover:ring-2 hover:ring-primary transition-all hover:shadow-lg group"
                  onClick={() => handleInterfaceClick('billing')}
                >
                  <CardContent className="p-6 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Monitor className="h-8 w-8 text-primary" />
                    </div>
                    <span className="font-semibold text-lg">Billing</span>
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
                  <CardContent className="p-6 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                      <ChefHat className="h-8 w-8 text-orange-600" />
                    </div>
                    <span className="font-semibold text-lg">Kitchen</span>
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
                    <CardContent className="p-6 flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 transition-colors">
                        <UserCircle className="h-8 w-8 text-indigo-600" />
                      </div>
                      <span className="font-semibold text-lg">Waiter</span>
                      <span className="text-xs text-muted-foreground text-center">Order Entry</span>
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : step === 'password' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    selectedInterface === 'billing' ? 'bg-primary/10' : 'bg-orange-100 dark:bg-orange-950/50'
                  }`}>
                    {selectedInterface === 'billing' ? (
                      <Monitor className="h-10 w-10 text-primary" />
                    ) : (
                      <ChefHat className="h-10 w-10 text-orange-600" />
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
                      className="h-12 text-lg pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handlePasswordSubmit} className="flex-1 h-12">
                    Unlock
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
                    <UserCircle className="h-10 w-10 text-indigo-600" />
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
                    className="h-12 text-lg"
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
                      className="h-12 text-lg pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleWaiterLogin} className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700">
                    Login
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterfaceSelector;
