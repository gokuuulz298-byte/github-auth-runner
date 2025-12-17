import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatIndianCurrency } from "@/lib/numberFormat";
import { UtensilsCrossed, Package, CheckCircle2, Clock, X, Receipt } from "lucide-react";
import { toast } from "sonner";

interface LiveOrder {
  id: string;
  waiter_id: string | null;
  waiter_name: string | null;
  order_type: string;
  table_number: string | null;
  items_data: any[];
  customer_name: string | null;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
}

interface LiveOrdersPanelProps {
  onGenerateBill: (order: LiveOrder) => void;
}

const LiveOrdersPanel = ({ onGenerateBill }: LiveOrdersPanelProps) => {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel('live-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_orders'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('live_orders')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as LiveOrder[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const completeOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('live_orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Order marked as completed");
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update order");
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('live_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Order cancelled");
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel order");
    }
  };

  const activeOrders = orders.filter(o => o.status === 'active');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const OrderCard = ({ order, showActions = true }: { order: LiveOrder; showActions?: boolean }) => (
    <Card className="mb-3">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {order.order_type === 'takeaway' ? (
              <Package className="h-4 w-4 text-orange-600" />
            ) : (
              <UtensilsCrossed className="h-4 w-4 text-blue-600" />
            )}
            <span className="font-semibold text-sm">
              {order.order_type === 'takeaway' ? 'Takeaway' : `Table ${order.table_number}`}
            </span>
          </div>
          <Badge variant={order.status === 'active' ? 'default' : order.status === 'completed' ? 'secondary' : 'destructive'}>
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-3">
        {order.waiter_name && (
          <p className="text-xs text-muted-foreground mb-2">
            Waiter: {order.waiter_name}
          </p>
        )}
        {order.customer_name && (
          <p className="text-xs text-muted-foreground mb-2">
            Customer: {order.customer_name}
          </p>
        )}
        
        <div className="space-y-1 mb-2">
          {order.items_data.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>{item.quantity}× {item.name}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>

        {order.notes && (
          <p className="text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/30 p-2 rounded mb-2">
            Note: {order.notes}
          </p>
        )}

        <div className="flex justify-between items-center font-semibold border-t pt-2">
          <span>Total</span>
          <span className="text-green-600">{formatIndianCurrency(order.total_amount)}</span>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {new Date(order.created_at).toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>

        {showActions && order.status === 'active' && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => cancelOrder(order.id)}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onGenerateBill(order)}
            >
              <Receipt className="h-3 w-3 mr-1" />
              Generate Bill
            </Button>
          </div>
        )}

        {order.status === 'completed' && (
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-3"
            onClick={() => onGenerateBill(order)}
          >
            <Receipt className="h-3 w-3 mr-1" />
            View Bill
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Live Orders
          {activeOrders.length > 0 && (
            <Badge variant="destructive">{activeOrders.length}</Badge>
          )}
        </h3>
      </div>

      <Tabs defaultValue="active" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-2">
          <TabsTrigger value="active" className="text-xs">
            Active ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Done ({completedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs">
            Cancelled ({cancelledOrders.length})
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-2">
          <TabsContent value="active" className="mt-0">
            {activeOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active orders</p>
              </div>
            ) : (
              activeOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            {completedOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No completed orders</p>
              </div>
            ) : (
              completedOrders.map(order => (
                <OrderCard key={order.id} order={order} showActions={false} />
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-0">
            {cancelledOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <X className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No cancelled orders</p>
              </div>
            ) : (
              cancelledOrders.map(order => (
                <OrderCard key={order.id} order={order} showActions={false} />
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default LiveOrdersPanel;