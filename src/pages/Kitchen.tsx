import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ChefHat, Clock, CheckCircle2, Truck, RefreshCw, UtensilsCrossed, Volume2, VolumeX, User, MapPin, Timer, Utensils } from "lucide-react";
import { toast } from "sonner";
import { formatIndianCurrency } from "@/lib/numberFormat";
import { useAuthContext } from "@/hooks/useAuthContext";
import { format } from "date-fns";

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

interface LiveOrder {
  id: string;
  table_number: string | null;
  waiter_name: string | null;
  items_data: any[];
  status: string;
  order_type: string;
  notes: string | null;
  created_at: string;
}

const Kitchen = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading, user } = useAuthContext();
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
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

  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  useEffect(() => {
    if (!authLoading && userId) {
      fetchAllOrders();
    } else if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    // Real-time subscription - instant updates
    const channel = supabase
      .channel('kitchen-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          playNotificationSound();
          toast.success("🔔 New kitchen order!", { duration: 5000 });
        }
        fetchAllOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          playNotificationSound();
          toast.success("🔔 New live order!", { duration: 5000 });
        }
        fetchAllOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, userId, user, soundEnabled]);

  const fetchAllOrders = async () => {
    if (!userId) return;
    
    try {
      // Fetch kitchen orders (RLS handles filtering)
      const [kitchenRes, liveRes] = await Promise.all([
        supabase
          .from('kitchen_orders')
          .select('*')
          .neq('status', 'delivered')
          .order('created_at', { ascending: false }),
        supabase
          .from('live_orders')
          .select('*')
          .neq('status', 'completed')
          .order('created_at', { ascending: false })
      ]);

      if (kitchenRes.error) throw kitchenRes.error;
      if (liveRes.error) throw liveRes.error;
      
      setKitchenOrders((kitchenRes.data || []) as unknown as KitchenOrder[]);
      setLiveOrders((liveRes.data || []) as unknown as LiveOrder[]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const updateKitchenOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('kitchen_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      toast.success(`Order marked as ${newStatus}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const updateItemStatus = async (orderId: string, itemId: string, newStatus: 'pending' | 'preparing' | 'ready') => {
    const order = kitchenOrders.find(o => o.id === orderId);
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
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, item_statuses: updatedStatuses });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update item status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500';
      case 'preparing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'delivered': return 'bg-gray-500';
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

  const parseOrderInfo = (notes: string | null) => {
    const info = { waiter: null as string | null, table: null as string | null };
    if (!notes) return info;
    
    const waiterMatch = notes.match(/Waiter:\s*([^|]+)/);
    if (waiterMatch) info.waiter = waiterMatch[1].trim();
    
    const tableMatch = notes.match(/Table:\s*([^|]+)/);
    if (tableMatch) info.table = tableMatch[1].trim();
    
    return info;
  };

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  // Combine and filter orders
  const allOrders = [
    ...kitchenOrders.map(o => ({ ...o, source: 'kitchen' as const })),
    ...liveOrders.filter(lo => !kitchenOrders.some(ko => ko.bill_number === lo.id)).map(o => ({ 
      ...o, 
      source: 'live' as const,
      bill_number: o.id.substring(0, 8),
      total_amount: 0,
      item_statuses: null
    }))
  ];

  const filteredOrders = filter === 'all' 
    ? allOrders 
    : allOrders.filter(o => o.status === filter);

  const pendingCount = allOrders.filter(o => o.status === 'pending').length;
  const preparingCount = allOrders.filter(o => o.status === 'preparing').length;
  const readyCount = allOrders.filter(o => o.status === 'ready').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
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
                <UtensilsCrossed className="h-7 w-7" />
                <div>
                  <h1 className="text-xl font-bold">Kitchen Display System</h1>
                  <p className="text-orange-100 text-xs">Real-time order tracking</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setSoundEnabled(!soundEnabled)} 
                variant="secondary"
                size="icon"
                className={soundEnabled ? "" : "opacity-50"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button onClick={fetchAllOrders} variant="secondary" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Status Filter Bar */}
      <div className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-[60px] z-10">
        <div className="container mx-auto px-4 py-2">
          <div className="flex gap-2 overflow-x-auto">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
              className="gap-2 whitespace-nowrap"
            >
              All Orders
              <Badge variant="secondary" className="ml-1">{allOrders.length}</Badge>
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilter('pending')}
              size="sm"
              className={`gap-2 whitespace-nowrap ${filter !== 'pending' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 hover:bg-orange-500/30' : ''}`}
            >
              <Clock className="h-4 w-4" />
              Pending
              <Badge className="bg-orange-500 ml-1">{pendingCount}</Badge>
            </Button>
            <Button
              variant={filter === 'preparing' ? 'default' : 'outline'}
              onClick={() => setFilter('preparing')}
              size="sm"
              className={`gap-2 whitespace-nowrap ${filter !== 'preparing' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30' : ''}`}
            >
              <ChefHat className="h-4 w-4" />
              Preparing
              <Badge className="bg-blue-500 ml-1">{preparingCount}</Badge>
            </Button>
            <Button
              variant={filter === 'ready' ? 'default' : 'outline'}
              onClick={() => setFilter('ready')}
              size="sm"
              className={`gap-2 whitespace-nowrap ${filter !== 'ready' ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30' : ''}`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Ready
              <Badge className="bg-green-500 ml-1">{readyCount}</Badge>
            </Button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <main className="container mx-auto px-4 py-4">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <UtensilsCrossed className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-xl">No orders found</p>
            <p className="text-sm">New orders will appear here automatically</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const orderInfo = parseOrderInfo(order.notes);
              const tableNumber = (order as any).table_number || orderInfo.table;
              const waiterName = (order as any).waiter_name || orderInfo.waiter;
              const items = order.items_data || [];
              const itemStatuses = (order as KitchenOrder).item_statuses;
              
              return (
                <Card 
                  key={order.id} 
                  className={`overflow-hidden transition-all duration-300 cursor-pointer border-2 ${
                    order.status === 'pending' 
                      ? 'border-orange-500 shadow-orange-500/30 shadow-lg animate-pulse' 
                      : order.status === 'preparing'
                      ? 'border-blue-500 shadow-blue-500/20 shadow-md'
                      : order.status === 'ready'
                      ? 'border-green-500 shadow-green-500/20 shadow-md'
                      : 'border-slate-600'
                  } bg-slate-800 hover:bg-slate-700/80`}
                  onClick={() => order.source === 'kitchen' && setSelectedOrder(order as KitchenOrder)}
                >
                  {/* Order Header */}
                  <CardHeader className={`py-2 px-3 ${getStatusColor(order.status)} text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <span className="font-bold text-sm uppercase">{order.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Timer className="h-3 w-3" />
                        <span className="text-xs">{getTimeSince(order.created_at)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-3 space-y-3">
                    {/* Table & Waiter Info */}
                    <div className="flex items-center justify-between">
                      {tableNumber && (
                        <div className="flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">
                          <MapPin className="h-4 w-4" />
                          <span className="font-bold">Table {tableNumber}</span>
                        </div>
                      )}
                      {order.order_type === 'takeaway' && (
                        <Badge className="bg-amber-500 text-white">🥡 TAKEAWAY</Badge>
                      )}
                    </div>
                    
                    {waiterName && (
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <User className="h-4 w-4 text-indigo-400" />
                        <span>Waiter: <span className="font-medium">{waiterName}</span></span>
                      </div>
                    )}

                    {/* Order Number */}
                    <div className="text-center py-1 border-y border-slate-600">
                      <span className="text-xs text-slate-400">Order #</span>
                      <p className="font-mono font-bold text-white">{order.bill_number}</p>
                    </div>

                    {/* Items List with Per-Item Status */}
                    <div className="space-y-2">
                      {items.slice(0, 5).map((item: any, idx: number) => {
                        const itemStatus = itemStatuses?.find((s: ItemStatus) => s.id === item.id);
                        const status = itemStatus?.status || 'pending';
                        
                        return (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between text-sm bg-slate-700/50 rounded px-2 py-1.5"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-bold text-orange-400">{item.quantity}×</span>
                              <span className="text-white truncate">{item.name}</span>
                            </div>
                            {order.source === 'kitchen' && (
                              <Badge 
                                className={`text-xs cursor-pointer ${
                                  status === 'ready' ? 'bg-green-500' : 
                                  status === 'preparing' ? 'bg-blue-500' : 'bg-slate-500'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextStatus = status === 'pending' ? 'preparing' : status === 'preparing' ? 'ready' : 'pending';
                                  updateItemStatus(order.id, item.id, nextStatus as any);
                                }}
                              >
                                {status === 'ready' ? <CheckCircle2 className="h-3 w-3" /> : 
                                 status === 'preparing' ? <ChefHat className="h-3 w-3" /> : 
                                 <Clock className="h-3 w-3" />}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                      {items.length > 5 && (
                        <p className="text-xs text-slate-400 text-center">+{items.length - 5} more items</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {order.source === 'kitchen' && (
                      <div className="pt-2">
                        {order.status === 'pending' && (
                          <Button 
                            onClick={(e) => { e.stopPropagation(); updateKitchenOrderStatus(order.id, 'preparing'); }}
                            className="w-full bg-blue-500 hover:bg-blue-600"
                            size="sm"
                          >
                            <ChefHat className="h-4 w-4 mr-2" />
                            Start Preparing
                          </Button>
                        )}
                        {order.status === 'preparing' && (
                          <Button 
                            onClick={(e) => { e.stopPropagation(); updateKitchenOrderStatus(order.id, 'ready'); }}
                            className="w-full bg-green-500 hover:bg-green-600"
                            size="sm"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark Ready
                          </Button>
                        )}
                        {order.status === 'ready' && (
                          <Button 
                            onClick={(e) => { e.stopPropagation(); updateKitchenOrderStatus(order.id, 'delivered'); }}
                            className="w-full bg-slate-600 hover:bg-slate-500"
                            size="sm"
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Delivered
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-orange-500" />
              Order #{selectedOrder?.bill_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="flex items-center gap-4 text-sm">
                <Badge className={getStatusColor(selectedOrder.status)}>
                  {selectedOrder.status.toUpperCase()}
                </Badge>
                <span className="text-slate-400">
                  {format(new Date(selectedOrder.created_at), 'HH:mm, dd MMM')}
                </span>
              </div>

              {/* Items with Status Controls */}
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {selectedOrder.items_data.map((item: any, idx: number) => {
                    const itemStatus = selectedOrder.item_statuses?.find((s: ItemStatus) => s.id === item.id);
                    const status = itemStatus?.status || 'pending';
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                        <div>
                          <span className="font-bold text-orange-400 mr-2">{item.quantity}×</span>
                          <span>{item.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant={status === 'pending' ? 'default' : 'outline'}
                            className={`h-8 w-8 ${status === 'pending' ? 'bg-slate-500' : ''}`}
                            onClick={() => updateItemStatus(selectedOrder.id, item.id, 'pending')}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant={status === 'preparing' ? 'default' : 'outline'}
                            className={`h-8 w-8 ${status === 'preparing' ? 'bg-blue-500' : ''}`}
                            onClick={() => updateItemStatus(selectedOrder.id, item.id, 'preparing')}
                          >
                            <ChefHat className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant={status === 'ready' ? 'default' : 'outline'}
                            className={`h-8 w-8 ${status === 'ready' ? 'bg-green-500' : ''}`}
                            onClick={() => updateItemStatus(selectedOrder.id, item.id, 'ready')}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <p className="text-xs text-yellow-300 font-medium">Notes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Kitchen;