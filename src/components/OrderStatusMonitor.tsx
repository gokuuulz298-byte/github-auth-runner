import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ChefHat, CheckCircle2, Truck, X, Monitor } from "lucide-react";
import { formatIndianCurrency } from "@/lib/numberFormat";

interface KitchenOrder {
  id: string;
  bill_number: string;
  order_type: string;
  items_data: any[];
  customer_name: string | null;
  status: string;
  total_amount: number;
  created_at: string;
}

interface OrderStatusMonitorProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrderStatusMonitor = ({ isOpen, onClose }: OrderStatusMonitorProps) => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
      
      const channel = supabase
        .channel('billing-order-monitor')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'kitchen_orders'
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen]);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('kitchen_orders')
        .select('*')
        .eq('created_by', user.id)
        .neq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as KitchenOrder[]);
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500 text-white';
      case 'preparing': return 'bg-blue-500 text-white';
      case 'ready': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'preparing': return <ChefHat className="h-3 w-3" />;
      case 'ready': return <CheckCircle2 className="h-3 w-3" />;
      case 'delivered': return <Truck className="h-3 w-3" />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="absolute right-4 top-20 w-80 z-50 shadow-2xl border-2 animate-in slide-in-from-right">
      <CardHeader className="py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            <CardTitle className="text-sm font-semibold">Live Order Status</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-6 w-6 text-primary-foreground hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          {orders.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">No active orders</p>
            </div>
          ) : (
            <div className="divide-y">
              {orders.map((order) => (
                <div key={order.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-semibold text-sm">#{order.bill_number}</span>
                    <Badge className={`${getStatusColor(order.status)} text-xs gap-1`}>
                      {getStatusIcon(order.status)}
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>{order.items_data.length} items</span>
                      <span className="font-medium text-foreground">
                        {formatIndianCurrency(order.total_amount)}
                      </span>
                    </div>
                    {order.customer_name && (
                      <p>{order.customer_name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default OrderStatusMonitor;