import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ChefHat, Clock, CheckCircle2, Truck, RefreshCw, UtensilsCrossed, Volume2, VolumeX, User } from "lucide-react";
import { toast } from "sonner";
import { formatIndianCurrency } from "@/lib/numberFormat";
import { useAuthContext } from "@/hooks/useAuthContext";

interface ItemStatus {
  id: string;
  name: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready';
}

interface KitchenOrder {
  id: string;
  bill_number: string;
  order_type: string;
  items_data: any[];
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  item_statuses: ItemStatus[] | null;
}

const Kitchen = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading, user } = useAuthContext();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element for notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVN0m8nP1sFVJyNNkMPPtrxxPCYuTXyftaxpQzxMg6q+oXlON0Jkl7a9q4dgSVBxmaW5spBxZW2EpKOilodwYnCIqLS5rpSCe4SWpKWgkX9xZnSJnKStqJqRh4SOkpOQhnxuaHWLnqessJyVkpGTk5OMhH55d4OSnJ+gnJmYl5eWlZSSj4uJiYyPkpSTkpGQj4+OjYyLioqKi4yNjo+PkJCQkJCQkJCQkJCQkJCQkJCQkA==');
    audioRef.current.volume = 0.8;
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  useEffect(() => {
    if (!authLoading && userId) {
      fetchOrders();
    } else if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    // Real-time subscription
    const channel = supabase
      .channel('kitchen-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kitchen_orders'
        },
        (payload) => {
          // New order arrived - play sound
          playNotificationSound();
          toast.success("🔔 New order received!", { duration: 5000 });
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kitchen_orders'
        },
        () => {
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
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
  }, [authLoading, userId, user, soundEnabled]);

  const fetchOrders = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('kitchen_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as unknown as KitchenOrder[]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('kitchen_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      toast.success(`Order marked as ${newStatus}`);
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const updateItemStatus = async (orderId: string, itemId: string, newStatus: 'pending' | 'preparing' | 'ready') => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const itemStatuses = order.item_statuses || order.items_data.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      status: 'pending' as const
    }));

    const updatedStatuses = itemStatuses.map((item: ItemStatus) => 
      item.id === itemId ? { ...item, status: newStatus } : item
    );

    // Check if all items are ready
    const allReady = updatedStatuses.every((item: ItemStatus) => item.status === 'ready');
    const anyPreparing = updatedStatuses.some((item: ItemStatus) => item.status === 'preparing' || item.status === 'ready');

    try {
      const { error } = await supabase
        .from('kitchen_orders')
        .update({ 
          item_statuses: updatedStatuses as any,
          status: allReady ? 'ready' : anyPreparing ? 'preparing' : 'pending'
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Update local state
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, item_statuses: updatedStatuses });
      }
      
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update item status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500 hover:bg-orange-600';
      case 'preparing': return 'bg-blue-500 hover:bg-blue-600';
      case 'ready': return 'bg-green-500 hover:bg-green-600';
      case 'delivered': return 'bg-gray-500 hover:bg-gray-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'preparing': return <ChefHat className="h-4 w-4" />;
      case 'ready': return <CheckCircle2 className="h-4 w-4" />;
      case 'delivered': return <Truck className="h-4 w-4" />;
      default: return null;
    }
  };

  const getWaiterName = (notes: string | null) => {
    if (!notes) return null;
    const match = notes.match(/^Waiter:\s*([^|]+)/);
    return match ? match[1].trim() : null;
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter);

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/dashboard")}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-bold">Kitchen Display</h1>
                  <p className="text-orange-100 text-sm">Real-time order management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setSoundEnabled(!soundEnabled)} 
                variant="secondary"
                size="icon"
                className={soundEnabled ? "" : "opacity-50"}
                title={soundEnabled ? "Sound On" : "Sound Off"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button 
                onClick={fetchOrders} 
                variant="secondary"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-4 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className="gap-2"
            >
              All Orders
              <Badge variant="secondary">{orders.length}</Badge>
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilter('pending')}
              className="gap-2 bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300"
            >
              <Clock className="h-4 w-4" />
              Pending
              <Badge className="bg-orange-500">{pendingCount}</Badge>
            </Button>
            <Button
              variant={filter === 'preparing' ? 'default' : 'outline'}
              onClick={() => setFilter('preparing')}
              className="gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300"
            >
              <ChefHat className="h-4 w-4" />
              Preparing
              <Badge className="bg-blue-500">{preparingCount}</Badge>
            </Button>
            <Button
              variant={filter === 'ready' ? 'default' : 'outline'}
              onClick={() => setFilter('ready')}
              className="gap-2 bg-green-100 text-green-700 hover:bg-green-200 border-green-300"
            >
              <CheckCircle2 className="h-4 w-4" />
              Ready
              <Badge className="bg-green-500">{readyCount}</Badge>
            </Button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <UtensilsCrossed className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-xl">No orders found</p>
            <p className="text-sm">New orders will appear here automatically</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const waiterName = getWaiterName(order.notes);
              return (
                <Card 
                  key={order.id} 
                  className={`overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer ${
                    order.status === 'pending' ? 'ring-2 ring-orange-400 animate-pulse' : ''
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <CardHeader className={`py-3 ${getStatusColor(order.status)} text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <span className="font-bold uppercase">{order.status}</span>
                      </div>
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        #{order.bill_number}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* Order Type Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        {order.order_type === 'takeaway' ? '🥡 TAKEAWAY' : '🍽️ DINE-IN'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>

                    {/* Waiter Info */}
                    {waiterName && (
                      <div className="flex items-center gap-2 mb-3 text-sm bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded">
                        <User className="h-4 w-4 text-indigo-600" />
                        <span className="text-indigo-700 dark:text-indigo-300">Waiter: {waiterName}</span>
                      </div>
                    )}

                    {/* Customer Info */}
                    {(order.customer_name || order.customer_phone) && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mb-3 text-sm">
                        {order.customer_name && <p className="font-medium">{order.customer_name}</p>}
                        {order.customer_phone && <p className="text-muted-foreground">{order.customer_phone}</p>}
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                      {order.items_data.map((item: any, idx: number) => {
                        const itemStatus = order.item_statuses?.find((s: ItemStatus) => s.id === item.id);
                        return (
                          <div key={idx} className="flex justify-between items-center text-sm border-b pb-1">
                            <span className="flex-1 flex items-center gap-2">
                              <span className="font-semibold text-orange-600">{item.quantity}x</span>
                              {item.name}
                              {itemStatus?.status === 'ready' && (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
                      <span>Total</span>
                      <span className="text-green-600">{formatIndianCurrency(order.total_amount)}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {order.status === 'pending' && (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(order.id, 'preparing');
                          }}
                          className="col-span-2 bg-blue-500 hover:bg-blue-600"
                        >
                          <ChefHat className="h-4 w-4 mr-2" />
                          Start Preparing
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(order.id, 'ready');
                          }}
                          className="col-span-2 bg-green-500 hover:bg-green-600"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Ready
                        </Button>
                      )}
                      {order.status === 'ready' && (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(order.id, 'delivered');
                          }}
                          className="col-span-2 bg-gray-600 hover:bg-gray-700"
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Mark Delivered
                        </Button>
                      )}
                      {order.status === 'delivered' && (
                        <div className="col-span-2 text-center text-sm text-muted-foreground py-2">
                          ✓ Order Complete
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Order Detail Dialog - Item by Item Status */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Order #{selectedOrder?.bill_number}</span>
              <Badge className={getStatusColor(selectedOrder?.status || '')}>
                {selectedOrder?.status?.toUpperCase()}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Waiter Info */}
              {getWaiterName(selectedOrder.notes) && (
                <div className="flex items-center gap-2 text-sm bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-lg">
                  <User className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium text-indigo-700 dark:text-indigo-300">
                    Waiter: {getWaiterName(selectedOrder.notes)}
                  </span>
                </div>
              )}

              {/* Customer Info */}
              {selectedOrder.customer_name && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                  {selectedOrder.customer_phone && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customer_phone}</p>
                  )}
                </div>
              )}

              {/* Items with individual status */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Items - Click to update status</h4>
                {selectedOrder.items_data.map((item: any, idx: number) => {
                  const itemStatuses = selectedOrder.item_statuses || selectedOrder.items_data.map((i: any) => ({
                    id: i.id,
                    name: i.name,
                    quantity: i.quantity,
                    status: 'pending' as const
                  }));
                  const currentStatus = itemStatuses.find((s: ItemStatus) => s.id === item.id)?.status || 'pending';
                  
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.quantity}× {item.name}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={currentStatus === 'pending' ? 'default' : 'outline'}
                          className={currentStatus === 'pending' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                          onClick={() => updateItemStatus(selectedOrder.id, item.id, 'pending')}
                        >
                          <Clock className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={currentStatus === 'preparing' ? 'default' : 'outline'}
                          className={currentStatus === 'preparing' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                          onClick={() => updateItemStatus(selectedOrder.id, item.id, 'preparing')}
                        >
                          <ChefHat className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={currentStatus === 'ready' ? 'default' : 'outline'}
                          className={currentStatus === 'ready' ? 'bg-green-500 hover:bg-green-600' : ''}
                          onClick={() => updateItemStatus(selectedOrder.id, item.id, 'ready')}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span className="text-green-600">{formatIndianCurrency(selectedOrder.total_amount)}</span>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                {selectedOrder.status === 'pending' && (
                  <Button 
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                    onClick={() => {
                      updateStatus(selectedOrder.id, 'preparing');
                      setSelectedOrder(null);
                    }}
                  >
                    Start All
                  </Button>
                )}
                {selectedOrder.status === 'preparing' && (
                  <Button 
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={() => {
                      updateStatus(selectedOrder.id, 'ready');
                      setSelectedOrder(null);
                    }}
                  >
                    Mark All Ready
                  </Button>
                )}
                {selectedOrder.status === 'ready' && (
                  <Button 
                    className="flex-1 bg-gray-600 hover:bg-gray-700"
                    onClick={() => {
                      updateStatus(selectedOrder.id, 'delivered');
                      setSelectedOrder(null);
                    }}
                  >
                    Mark Delivered
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Kitchen;
