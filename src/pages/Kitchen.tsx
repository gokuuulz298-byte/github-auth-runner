import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ChefHat, Clock, CheckCircle2, Truck, RefreshCw, UtensilsCrossed, Volume2, VolumeX, User, MapPin, Timer, Flame } from "lucide-react";
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

const Kitchen = () => {
  const navigate = useNavigate();
  const { userId, loading: authLoading, user } = useAuthContext();
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      fetchOrders();
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
        fetchOrders();
      })
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
        .neq('status', 'delivered')
        .order('created_at', { ascending: true }); // Oldest first for FIFO

      if (error) throw error;
      setKitchenOrders((data || []) as unknown as KitchenOrder[]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
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
      
      // Optimistic update
      setKitchenOrders(prev => prev.map(o => 
        o.id === orderId 
          ? { ...o, item_statuses: updatedStatuses, status: allReady ? 'ready' : anyPreparing ? 'preparing' : 'pending' }
          : o
      ));
    } catch (error) {
      console.error(error);
      toast.error("Failed to update item status");
    }
  };

  const markOrderDelivered = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('kitchen_orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Order marked as delivered");
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500 text-white';
      case 'preparing': return 'bg-blue-500 text-white';
      case 'ready': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const parseOrderInfo = (notes: string | null) => {
    const info = { waiter: null as string | null, table: null as string | null, isAdditional: false };
    if (!notes) return info;
    
    const waiterMatch = notes.match(/Waiter:\s*([^|]+)/);
    if (waiterMatch) info.waiter = waiterMatch[1].trim();
    
    const tableMatch = notes.match(/Table:\s*([^|]+)/);
    if (tableMatch) info.table = tableMatch[1].trim();
    
    if (notes.includes('(Additional)')) info.isAdditional = true;
    
    return info;
  };

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const getTimeUrgency = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins > 15) return 'urgent';
    if (mins > 8) return 'warning';
    return 'normal';
  };

  const filteredOrders = filter === 'all' 
    ? kitchenOrders 
    : kitchenOrders.filter(o => o.status === filter);

  const pendingCount = kitchenOrders.filter(o => o.status === 'pending').length;
  const preparingCount = kitchenOrders.filter(o => o.status === 'preparing').length;
  const readyCount = kitchenOrders.filter(o => o.status === 'ready').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
                  <h1 className="text-xl font-bold">Kitchen Display</h1>
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
              <Button onClick={fetchOrders} variant="secondary" size="sm" className="gap-2">
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
              <Badge variant="secondary" className="ml-1">{kitchenOrders.length}</Badge>
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
              const items = order.items_data || [];
              const itemStatuses = order.item_statuses || items.map((item: any) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                status: 'pending'
              }));
              const timeUrgency = getTimeUrgency(order.created_at);
              
              return (
                <Card 
                  key={order.id} 
                  className={`overflow-hidden transition-all duration-300 border-2 ${
                    order.status === 'pending' 
                      ? 'border-orange-500 shadow-orange-500/30 shadow-lg' 
                      : order.status === 'preparing'
                      ? 'border-blue-500 shadow-blue-500/20 shadow-md'
                      : order.status === 'ready'
                      ? 'border-green-500 shadow-green-500/20 shadow-md'
                      : 'border-slate-600'
                  } bg-slate-800`}
                >
                  {/* Order Header */}
                  <CardHeader className={`py-2 px-3 ${getStatusBadgeClass(order.status)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {order.status === 'pending' && <Clock className="h-4 w-4" />}
                        {order.status === 'preparing' && <ChefHat className="h-4 w-4" />}
                        {order.status === 'ready' && <CheckCircle2 className="h-4 w-4" />}
                        <span className="font-bold text-sm uppercase">{order.status}</span>
                        {orderInfo.isAdditional && (
                          <Badge className="bg-purple-600 text-xs">+ADD</Badge>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${
                        timeUrgency === 'urgent' ? 'text-red-200' : 
                        timeUrgency === 'warning' ? 'text-yellow-200' : 'text-white/80'
                      }`}>
                        {timeUrgency === 'urgent' && <Flame className="h-3 w-3" />}
                        <Timer className="h-3 w-3" />
                        <span>{getTimeSince(order.created_at)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-3 space-y-3">
                    {/* Table & Order Info */}
                    <div className="flex items-center justify-between gap-2">
                      {order.customer_name?.includes('Table') ? (
                        <div className="flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">
                          <MapPin className="h-4 w-4" />
                          <span className="font-bold text-sm">{order.customer_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-300">{order.customer_name || 'Walk-in'}</span>
                      )}
                      {order.order_type === 'takeaway' && (
                        <Badge className="bg-amber-500 text-white text-xs">🥡 TAKEAWAY</Badge>
                      )}
                    </div>
                    
                    {orderInfo.waiter && (
                      <div className="flex items-center gap-2 text-slate-300 text-xs">
                        <User className="h-3 w-3 text-indigo-400" />
                        <span>Waiter: <span className="font-medium">{orderInfo.waiter}</span></span>
                      </div>
                    )}

                    {/* Order Number */}
                    <div className="text-center py-1 border-y border-slate-600">
                      <span className="text-xs text-slate-400">Ticket #</span>
                      <p className="font-mono font-bold text-white">{order.bill_number}</p>
                    </div>

                    {/* Items List with Per-Item Status Controls */}
                    <ScrollArea className="max-h-48">
                      <div className="space-y-2">
                        {items.map((item: any, idx: number) => {
                          const itemStatus = itemStatuses.find((s: ItemStatus) => s.id === item.id);
                          const status = itemStatus?.status || 'pending';
                          
                          return (
                            <div 
                              key={idx} 
                              className={`flex items-center justify-between text-sm rounded px-2 py-2 ${
                                status === 'ready' ? 'bg-green-900/30 border border-green-700' :
                                status === 'preparing' ? 'bg-blue-900/30 border border-blue-700' :
                                'bg-slate-700/50 border border-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-bold text-orange-400 text-lg">{item.quantity}×</span>
                                <span className="text-white font-medium">{item.name}</span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant={status === 'pending' ? 'default' : 'outline'}
                                  className={`h-7 w-7 p-0 ${status === 'pending' ? 'bg-orange-500' : ''}`}
                                  onClick={() => updateItemStatus(order.id, item.id, 'pending')}
                                >
                                  <Clock className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={status === 'preparing' ? 'default' : 'outline'}
                                  className={`h-7 w-7 p-0 ${status === 'preparing' ? 'bg-blue-500' : ''}`}
                                  onClick={() => updateItemStatus(order.id, item.id, 'preparing')}
                                >
                                  <ChefHat className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={status === 'ready' ? 'default' : 'outline'}
                                  className={`h-7 w-7 p-0 ${status === 'ready' ? 'bg-green-500' : ''}`}
                                  onClick={() => updateItemStatus(order.id, item.id, 'ready')}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>

                    {/* Action Button */}
                    {order.status === 'ready' && (
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 gap-2"
                        onClick={() => markOrderDelivered(order.id)}
                      >
                        <Truck className="h-4 w-4" />
                        Mark Delivered
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Kitchen;
