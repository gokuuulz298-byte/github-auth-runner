import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Minus, Send, UtensilsCrossed, Package, LogOut, ClipboardList, X, Check, Users, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatIndianNumber, formatIndianCurrency } from "@/lib/numberFormat";
import { useAuthContext } from "@/hooks/useAuthContext";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface LiveOrder {
  id: string;
  table_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items_data: CartItem[];
  total_amount: number;
  status: string;
  waiter_id: string | null;
  waiter_name: string | null;
  order_type: string;
  notes: string | null;
  created_at: string;
}

interface RestaurantTable {
  id: string;
  table_number: string;
  capacity: number;
  status: string;
  current_order_id: string | null;
}

interface KitchenOrderItem {
  id: string;
  name: string;
  quantity: number;
  status: string;
}

const WaiterInterface = () => {
  const navigate = useNavigate();
  const { userId, user, loading: authLoading, isWaiter, signOut } = useAuthContext();
  
  const [waiterInfo, setWaiterInfo] = useState<{ id: string; display_name: string } | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [isParcel, setIsParcel] = useState<boolean>(false);
  const [tableNumber, setTableNumber] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showLiveOrders, setShowLiveOrders] = useState(false);
  const [showTablesView, setShowTablesView] = useState(false);
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<LiveOrder | null>(null);
  const [viewMode, setViewMode] = useState<'order' | 'tables' | 'live-orders'>('order');

  useEffect(() => {
    if (!authLoading && userId) {
      fetchWaiterInfo();
      fetchCategories();
      fetchTables();
      fetchLiveOrders();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, userId, user]);

  useEffect(() => {
    if (selectedCategory && userId) {
      fetchProducts(selectedCategory);
    } else {
      setProducts([]);
    }
  }, [selectedCategory, userId]);

  // Realtime subscription for live orders
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('waiter-live-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_orders' }, () => {
        fetchLiveOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_orders' }, () => {
        fetchLiveOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
        fetchTables();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchWaiterInfo = async () => {
    if (!user?.id) return;
    
    // Get waiter record linked to this auth user
    const { data, error } = await supabase
      .from('waiters')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    
    if (!error && data) {
      setWaiterInfo(data);
    } else {
      // Fallback - use email as name
      setWaiterInfo({
        id: user.id,
        display_name: user.email?.split('@')[0] || 'Waiter'
      });
    }
  };

  const fetchCategories = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error(error);
      toast.error("Failed to load categories");
    } else {
      setCategories(data || []);
      if (data && data.length > 0) {
        setSelectedCategory(data[0].name);
      }
    }
  };

  const fetchProducts = async (category: string) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .eq('is_deleted', false)
      .order('name');

    if (error) {
      console.error(error);
    } else {
      setProducts(data || []);
    }
  };

  const fetchTables = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .order('table_number');

    if (error) {
      console.error(error);
    } else {
      setTables(data || []);
    }
  };

  const fetchLiveOrders = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('live_orders')
      .select('*')
      .neq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setLiveOrders((data || []) as unknown as LiveOrder[]);
    }
  };

  const handleAddToCart = (product: any) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
      }]);
    }
    toast.success(`${product.name} added`);
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(cartItems.filter(item => item.id !== id));
    } else {
      setCartItems(cartItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const sendToKitchen = async () => {
    if (!userId || !user) return;

    if (cartItems.length === 0) {
      toast.error("Add items to send to kitchen");
      return;
    }

    if (!isParcel && !tableNumber) {
      toast.error("Please enter table number for dine-in orders");
      return;
    }

    try {
      const waiterName = waiterInfo?.display_name || user.email?.split('@')[0] || 'Waiter';
      
      // For live_orders, don't set waiter_id FK - it references waiters table
      // Instead just store the waiter name
      const orderData = {
        created_by: userId,
        waiter_id: waiterInfo?.id !== user.id ? waiterInfo?.id : null, // Only set if it's a valid waiter record
        waiter_name: waiterName,
        order_type: isParcel ? 'takeaway' : 'dine-in',
        table_number: isParcel ? null : tableNumber,
        items_data: cartItems as any,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        status: 'active',
        total_amount: calculateTotal(),
        notes: notes || null,
      };

      if (activeOrderId) {
        // Add to existing order
        const { data: existingOrder } = await supabase
          .from('live_orders')
          .select('items_data, total_amount')
          .eq('id', activeOrderId)
          .single();

        if (existingOrder) {
          const existingItems = (existingOrder.items_data as unknown as CartItem[]) || [];
          const mergedItems = [...existingItems];
          
          cartItems.forEach(newItem => {
            const existing = mergedItems.find(item => item.id === newItem.id);
            if (existing) {
              existing.quantity += newItem.quantity;
            } else {
              mergedItems.push(newItem);
            }
          });

          const newTotal = mergedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          await supabase
            .from('live_orders')
            .update({
              items_data: mergedItems as any,
              total_amount: newTotal,
              notes: notes || null
            })
            .eq('id', activeOrderId);

          toast.success("Items added to order!");
        }
      } else {
        // Create new order without waiter_id FK constraint issue
        const insertData: any = {
          created_by: userId,
          waiter_name: waiterName,
          order_type: isParcel ? 'takeaway' : 'dine-in',
          table_number: isParcel ? null : tableNumber,
          items_data: cartItems as any,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          status: 'active',
          total_amount: calculateTotal(),
          notes: notes || null,
        };
        
        // Only add waiter_id if we have a valid waiter record from the waiters table
        if (waiterInfo && waiterInfo.id !== user.id) {
          insertData.waiter_id = waiterInfo.id;
        }

        const { data, error } = await supabase
          .from('live_orders')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;
        setActiveOrderId(data.id);

        // Update table status
        if (!isParcel && tableNumber) {
          await supabase
            .from('restaurant_tables')
            .update({ status: 'occupied', current_order_id: data.id })
            .eq('table_number', tableNumber);
        }

        toast.success("Order sent to kitchen!");
      }

      // Send to kitchen_orders with waiter name
      await supabase.from('kitchen_orders').insert([{
        created_by: userId,
        bill_number: `W-${Date.now().toString().slice(-6)}`,
        order_type: isParcel ? 'takeaway' : 'dine-in',
        items_data: cartItems as any,
        customer_name: customerName || (tableNumber ? `Table ${tableNumber}` : 'Takeaway'),
        status: 'pending',
        total_amount: calculateTotal(),
        notes: `Waiter: ${waiterName}${notes ? ` | ${notes}` : ''}`,
        item_statuses: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          status: 'pending'
        })),
      }]);

      setCartItems([]);
      setNotes("");
      fetchLiveOrders();
      fetchTables();
    } catch (error) {
      console.error(error);
      toast.error("Failed to send order");
    }
  };

  const clearOrder = () => {
    setCartItems([]);
    setActiveOrderId(null);
    setTableNumber("");
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setIsParcel(false);
  };

  const completeOrder = async (order: LiveOrder) => {
    try {
      await supabase
        .from('live_orders')
        .update({ status: 'completed' })
        .eq('id', order.id);

      // Update table status
      if (order.table_number) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'available', current_order_id: null })
          .eq('table_number', order.table_number);
      }

      // Store for billing with all details
      sessionStorage.setItem('liveOrderToBill', JSON.stringify({
        ...order,
        waiter_name: order.waiter_name
      }));
      toast.success("Order marked complete. Ready for billing.");
      
      fetchLiveOrders();
      fetchTables();
    } catch (error) {
      console.error(error);
      toast.error("Failed to complete order");
    }
  };

  const selectTable = (table: RestaurantTable) => {
    if (table.status === 'occupied' && table.current_order_id) {
      // Load existing order
      const existingOrder = liveOrders.find(o => o.id === table.current_order_id);
      if (existingOrder) {
        setSelectedOrder(existingOrder);
      }
    } else if (table.status === 'available') {
      setTableNumber(table.table_number);
      setIsParcel(false);
      setViewMode('order');
    }
  };

  const getTableStatus = (table: RestaurantTable) => {
    const order = liveOrders.find(o => o.table_number === table.table_number && o.status !== 'completed');
    if (order) {
      const isMyOrder = waiterInfo && order.waiter_name === waiterInfo.display_name;
      if (isMyOrder) {
        return { status: 'your-order', color: 'bg-green-500', label: 'Your Order' };
      }
      return { status: 'occupied', color: 'bg-red-500', label: 'Occupied' };
    }
    return { status: 'available', color: 'bg-gray-300', label: 'Available' };
  };

  const loadOrderForEditing = (order: LiveOrder) => {
    setCartItems(order.items_data || []);
    setActiveOrderId(order.id);
    setTableNumber(order.table_number || '');
    setCustomerName(order.customer_name || '');
    setCustomerPhone(order.customer_phone || '');
    setNotes(order.notes || '');
    setIsParcel(order.order_type === 'takeaway');
    setSelectedOrder(null);
    setViewMode('order');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Tables View
  if (viewMode === 'tables') {
    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg flex-shrink-0">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setViewMode('order')} className="text-white hover:bg-white/20">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold">Restaurant Tables</h1>
              </div>
            </div>
          </div>
        </header>
        
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {tables.map((table) => {
              const status = getTableStatus(table);
              return (
                <Card 
                  key={table.id} 
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${
                    status.status === 'occupied' ? 'opacity-60' : ''
                  }`}
                  onClick={() => selectTable(table)}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-full h-2 rounded mb-3 ${status.color}`} />
                    <h3 className="font-bold text-2xl mb-1">{table.table_number}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{table.capacity} seats</p>
                    <Badge variant="outline" className="text-xs">
                      {status.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Live Orders View
  if (viewMode === 'live-orders') {
    const myOrders = liveOrders.filter(o => waiterInfo && o.waiter_name === waiterInfo.display_name);
    
    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg flex-shrink-0">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setViewMode('order')} className="text-white hover:bg-white/20">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold">My Live Orders ({myOrders.length})</h1>
              </div>
            </div>
          </div>
        </header>
        
        <ScrollArea className="flex-1 p-4">
          {myOrders.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active orders</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">
                          {order.table_number ? `Table ${order.table_number}` : 'Takeaway'}
                        </h3>
                        <p className="text-sm text-muted-foreground">{order.customer_name || 'Guest'}</p>
                        {order.customer_phone && (
                          <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                        )}
                      </div>
                      <Badge>{order.status}</Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4 border rounded-lg p-3 bg-muted/30">
                      {(order.items_data || []).map((item: CartItem, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.quantity}× {item.name}</span>
                          <span>₹{formatIndianNumber(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t mb-4">
                      <span className="font-bold">Total</span>
                      <span className="font-bold text-green-600">{formatIndianCurrency(order.total_amount)}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => loadOrderForEditing(order)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Items
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => completeOrder(order)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Main Order View
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-white hover:bg-white/20">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold">Waiter Interface</h1>
                <p className="text-indigo-100 text-sm">{waiterInfo?.display_name || user?.email?.split('@')[0]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('tables')}
                className="text-white hover:bg-white/20"
              >
                <Users className="h-4 w-4 mr-2" />
                Tables
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('live-orders')}
                className="text-white hover:bg-white/20"
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Orders
                {liveOrders.filter(o => waiterInfo && o.waiter_name === waiterInfo.display_name).length > 0 && (
                  <Badge className="ml-1 bg-white text-indigo-600">
                    {liveOrders.filter(o => waiterInfo && o.waiter_name === waiterInfo.display_name).length}
                  </Badge>
                )}
              </Button>
              {activeOrderId && (
                <Badge variant="secondary" className="bg-green-500 text-white">
                  Active
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={signOut}
                className="text-white hover:bg-white/20"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Categories */}
        <div className="w-24 md:w-32 bg-muted/50 border-r flex-shrink-0 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.name ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.name)}
                  className="w-full justify-start text-xs h-auto py-2 px-2"
                >
                  <span className="truncate">{cat.name}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Middle - Products Grid */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-2 border-b bg-muted/30 flex-shrink-0">
            <h2 className="font-semibold text-sm">{selectedCategory || 'Select Category'}</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3">
              {products.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-sm">No products in this category</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {products.map((product) => (
                    <Card
                      key={product.id}
                      className="hover:shadow-lg transition-shadow overflow-hidden cursor-pointer group"
                      onClick={() => handleAddToCart(product)}
                    >
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl font-bold bg-gradient-to-br from-primary/10 to-primary/5">
                            {product.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-2">
                        <h3 className="font-medium text-xs line-clamp-2 min-h-[2rem]">{product.name}</h3>
                        <p className="text-primary font-bold text-sm">
                          ₹{formatIndianNumber(Number(product.price))}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Order Details */}
        <div className="w-72 md:w-80 border-l bg-card flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-3 border-b bg-muted/30 flex-shrink-0">
            <h2 className="font-semibold">Current Order</h2>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {/* Order Type Toggle */}
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <UtensilsCrossed className={`h-4 w-4 ${!isParcel ? 'text-orange-600' : 'text-muted-foreground'}`} />
                <Switch checked={isParcel} onCheckedChange={setIsParcel} />
                <Package className={`h-4 w-4 ${isParcel ? 'text-orange-600' : 'text-muted-foreground'}`} />
                <span className="text-xs font-medium">{isParcel ? 'Takeaway' : 'Dine-in'}</span>
              </div>

              {/* Table Number (for dine-in) */}
              {!isParcel && (
                <div className="space-y-1">
                  <Label className="text-xs">Table Number *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Enter table"
                      className="h-8 text-sm flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setViewMode('tables')}
                      className="h-8"
                    >
                      <Users className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Customer Name */}
              <div className="space-y-1">
                <Label className="text-xs">Customer Name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional"
                  className="h-8 text-sm"
                />
              </div>

              {/* Customer Phone */}
              <div className="space-y-1">
                <Label className="text-xs">Customer Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Optional"
                  className="h-8 text-sm"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs">Special Instructions</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests..."
                  className="h-8 text-sm"
                />
              </div>

              {/* Cart Items */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Order Items ({cartItems.length})</Label>
                {cartItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Tap products to add
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-muted/50 rounded p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ₹{formatIndianNumber(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateQuantity(item.id, item.quantity - 1);
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-5 text-center text-xs">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateQuantity(item.id, item.quantity + 1);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Footer with Total and Actions */}
          <div className="p-3 border-t space-y-2 flex-shrink-0 bg-muted/30">
            {cartItems.length > 0 && (
              <div className="flex justify-between items-center font-bold text-base">
                <span>Total</span>
                <span className="text-green-600">{formatIndianCurrency(calculateTotal())}</span>
              </div>
            )}
            <Button
              onClick={sendToKitchen}
              disabled={cartItems.length === 0}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {activeOrderId ? 'Add to Order' : 'Send to Kitchen'}
            </Button>
            {activeOrderId && (
              <Button variant="outline" onClick={clearOrder} className="w-full" size="sm">
                Start New Order
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Order - {selectedOrder?.table_number ? `Table ${selectedOrder.table_number}` : 'Takeaway'}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="space-y-2">
                {(selectedOrder.items_data || []).map((item: CartItem, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.quantity}× {item.name}</span>
                    <span>₹{formatIndianNumber(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-green-600">{formatIndianCurrency(selectedOrder.total_amount)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Waiter: {selectedOrder.waiter_name}
              </p>
              {selectedOrder.waiter_name === waiterInfo?.display_name && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => loadOrderForEditing(selectedOrder)}
                  >
                    Edit Order
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      completeOrder(selectedOrder);
                      setSelectedOrder(null);
                    }}
                  >
                    Complete
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaiterInterface;
