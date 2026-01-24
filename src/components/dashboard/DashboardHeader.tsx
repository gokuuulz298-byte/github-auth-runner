import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  AlertTriangle,
  Bell,
  ClipboardList,
  ChefHat,
  LogOut,
  UserCog,
} from "lucide-react";
import GuidelinesDialog from "@/components/GuidelinesDialog";
import LiveOrdersPanel from "@/components/LiveOrdersPanel";

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
}

interface DashboardHeaderProps {
  isStaff: boolean;
  isAdmin: boolean;
  lowStockProducts: LowStockProduct[];
  showLowStockPanel: boolean;
  setShowLowStockPanel: (value: boolean) => void;
  billingSettings: any;
  staffModules: string[];
  onLogout: () => void;
  onGenerateBill: (order: any) => void;
}

const DashboardHeader = memo(({
  isStaff,
  isAdmin,
  lowStockProducts,
  showLowStockPanel,
  setShowLowStockPanel,
  billingSettings,
  staffModules,
  onLogout,
  onGenerateBill,
}: DashboardHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Eduvanca Billing</h1>
          {isStaff && (
            <Badge variant="secondary" className="ml-2 gap-1">
              <UserCog className="h-3 w-3" />
              Staff
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Low Stock Alert Button */}
          {isAdmin && lowStockProducts.length > 0 && (
            <Sheet open={showLowStockPanel} onOpenChange={setShowLowStockPanel}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative btn-press" title="Low Stock Alerts">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {lowStockProducts.length > 99 ? '99+' : lowStockProducts.length}
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[350px] sm:w-[400px]">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
                </div>
                <ScrollArea className="h-[calc(100vh-160px)]">
                  <div className="space-y-2 pr-4">
                    {lowStockProducts.map((product, idx) => (
                      <Card 
                        key={product.id} 
                        className="border-l-4 border-l-destructive stagger-item"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Threshold: {product.low_stock_threshold || 10}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold text-lg ${product.stock_quantity <= 0 ? 'text-destructive' : 'text-warning'}`}>
                                {product.stock_quantity}
                              </p>
                              <p className="text-[10px] text-muted-foreground">in stock</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-4">
                  <Button 
                    className="w-full btn-press" 
                    onClick={() => {
                      setShowLowStockPanel(false);
                      navigate('/low-stocks');
                    }}
                  >
                    View All Low Stock Items
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Live Orders Button */}
          {billingSettings?.isRestaurant && isAdmin && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="btn-press" title="Live Orders">
                  <ClipboardList className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] p-0">
                <LiveOrdersPanel onGenerateBill={onGenerateBill} />
              </SheetContent>
            </Sheet>
          )}
          
          {/* Kitchen Display Button */}
          {billingSettings?.enableKitchenInterface && (isAdmin || staffModules.includes('kitchen')) && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate('/kitchen')}
              className="btn-press"
              title="Kitchen Display"
            >
              <ChefHat className="h-5 w-5" />
            </Button>
          )}
          
          {isAdmin && <GuidelinesDialog />}
          <Button variant="outline" onClick={onLogout} className="btn-press">
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
});

DashboardHeader.displayName = "DashboardHeader";

export default DashboardHeader;
