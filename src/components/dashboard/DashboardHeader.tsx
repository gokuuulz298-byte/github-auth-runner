import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Bell,
  ClipboardList,
  ChefHat,
  LogOut,
  UserCog,
  LayoutDashboard,
} from "lucide-react";
import GuidelinesDialog from "@/components/GuidelinesDialog";
import LiveOrdersPanel from "@/components/LiveOrdersPanel";
import OnlineStatusIndicator from "@/components/OnlineStatusIndicator";
import CompanyBadge from "@/components/CompanyBadge";

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
    <header className="border-b border-border/50 bg-card/95 backdrop-blur-md sticky top-0 z-20">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary rounded-lg">
            <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground hidden sm:block">Eduvanca</h1>
          <CompanyBadge />
          {isStaff && (
            <Badge variant="secondary" className="gap-1 text-[10px] px-2 py-0.5">
              <UserCog className="h-3 w-3" />
              Staff
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <OnlineStatusIndicator />

          {/* Low Stock Alert */}
          {isAdmin && lowStockProducts.length > 0 && (
            <Sheet open={showLowStockPanel} onOpenChange={setShowLowStockPanel}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8" title="Low Stock Alerts">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
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
                    {lowStockProducts.map((product) => (
                      <Card key={product.id} className="border-l-4 border-l-destructive">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Threshold: {product.low_stock_threshold || 10}
                              </p>
                            </div>
                            <p className={`font-bold text-lg ${product.stock_quantity <= 0 ? 'text-destructive' : 'text-warning'}`}>
                              {product.stock_quantity}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-4">
                  <Button className="w-full" onClick={() => { setShowLowStockPanel(false); navigate('/low-stocks'); }}>
                    View All Low Stock Items
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Live Orders */}
          {billingSettings?.isRestaurant && isAdmin && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Live Orders">
                  <ClipboardList className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] p-0">
                <LiveOrdersPanel onGenerateBill={onGenerateBill} />
              </SheetContent>
            </Sheet>
          )}
          
          {/* Kitchen Display */}
          {billingSettings?.enableKitchenInterface && (isAdmin || staffModules.includes('kitchen')) && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/kitchen')} className="h-8 w-8" title="Kitchen Display">
              <ChefHat className="h-4 w-4" />
            </Button>
          )}
          
          {isAdmin && <GuidelinesDialog />}
          <Button variant="ghost" size="sm" onClick={onLogout} className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
});

DashboardHeader.displayName = "DashboardHeader";

export default DashboardHeader;
