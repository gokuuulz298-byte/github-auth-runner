import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, ShoppingCart, Package, FileText, Users, BarChart3, 
  Settings, ChevronRight, CheckCircle2, Sparkles, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeOnboardingProps {
  onComplete: () => void;
  companyName?: string;
}

const ONBOARDING_KEY = 'onboarding_completed';

const steps = [
  {
    id: 1,
    title: "Welcome to Your Billing Solution! 🎉",
    description: "A complete POS system designed for Indian businesses with GST compliance, multi-counter support, and powerful analytics.",
    icon: Rocket,
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: 2,
    title: "Quick Setup Guide",
    description: "Let's get you started with the essential configurations.",
    icon: Settings,
    color: "from-purple-500 to-pink-600",
    items: [
      { icon: Settings, text: "Set up your Company Profile with GST details", path: "/profile" },
      { icon: Package, text: "Add your products with prices and stock", path: "/inventory" },
      { icon: Users, text: "Create counters for multi-terminal billing", path: "/counters" },
    ]
  },
  {
    id: 3,
    title: "Start Billing",
    description: "Choose your preferred billing interface and start selling!",
    icon: ShoppingCart,
    color: "from-green-500 to-emerald-600",
    items: [
      { icon: ShoppingCart, text: "Modern Billing - Visual product grid with categories" },
      { icon: ShoppingCart, text: "Manual Billing - Search-based quick billing" },
      { icon: FileText, text: "View all invoices and print receipts" },
      { icon: BarChart3, text: "Track sales and profit with analytics" },
    ]
  },
];

export const WelcomeOnboarding = ({ onComplete, companyName }: WelcomeOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_KEY);
    if (!hasCompleted) {
      // Small delay for smooth entrance
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg"
        >
          <Card className="border-0 shadow-2xl overflow-hidden">
            {/* Gradient Header */}
            <div className={`bg-gradient-to-r ${step.color} p-6 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  Step {currentStep + 1} of {steps.length}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSkip}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  Skip
                </Button>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <StepIcon className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{step.title}</h2>
                  {companyName && currentStep === 0 && (
                    <p className="text-white/80 text-sm mt-1">Welcome, {companyName}!</p>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <p className="text-muted-foreground mb-6">{step.description}</p>

              {step.items && (
                <div className="space-y-3 mb-6">
                  {step.items.map((item, index) => {
                    const ItemIcon = item.icon;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-primary/10">
                          <ItemIcon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm flex-1">{item.text}</span>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground/50" />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Progress Dots */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep 
                        ? 'w-8 bg-primary' 
                        : index < currentStep 
                          ? 'w-2 bg-primary/50' 
                          : 'w-2 bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Action Button */}
              <Button 
                onClick={handleNext} 
                className="w-full gap-2"
                size="lg"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Get Started
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Decorative elements */}
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 0.5, x: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="absolute left-4 top-1/4 hidden lg:block"
        >
          <div className="p-4 bg-primary/20 rounded-2xl backdrop-blur-sm">
            <Package className="h-8 w-8 text-primary" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 0.5, x: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="absolute right-4 bottom-1/4 hidden lg:block"
        >
          <div className="p-4 bg-green-500/20 rounded-2xl backdrop-blur-sm">
            <BarChart3 className="h-8 w-8 text-green-500" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const checkOnboardingStatus = (): boolean => {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
};

export const resetOnboarding = (): void => {
  localStorage.removeItem(ONBOARDING_KEY);
};

export default WelcomeOnboarding;
