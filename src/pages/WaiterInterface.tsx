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
import { ArrowLeft, Plus, Minus, Send, UtensilsCrossed, Package, LogOut } from "lucide-react";
import { toast } from "sonner";
import { formatIndianNumber, formatIndianCurrency } from "@/lib/numberFormat";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const WaiterInterface = () => {
  const navigate = useNavigate();
  
  // Get waiter data from session storage
  const [waiterData, setWaiterData] = useState<{ id: string; name: string; ownerId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [isParcel, setIsParcel] = useState<boolean>(false);
  const [tableNumber, setTableNumber] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('waiterData');
    if (stored) {
      const data = JSON.parse(stored);
      setWaiterData(data);
    } else {
      navigate('/auth');
    }
  }, [navigate]);

  // Fetch data only when waiterData is available
  useEffect(() => {
    if (waiterData?.ownerId) {
      fetchCategories();
    }
  }, [waiterData?.ownerId]);

  useEffect(() => {
    if (selectedCategory && waiterData?.ownerId) {
      fetchProducts(selectedCategory);
    } else {
      setProducts([]);
    }
  }, [selectedCategory, waiterData?.ownerId]);

  const fetchCategories = async () => {
    if (!waiterData?.ownerId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('created_by', waiterData.ownerId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
      if (data && data.length > 0) {
        setSelectedCategory(data[0].name);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (category: string) => {
    if (!waiterData?.ownerId) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', waiterData.ownerId)
        .eq('category', category)
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
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
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
      };
      setCartItems([...cartItems, newItem]);
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
    if (!waiterData) return;
    
    if (cartItems.length === 0) {
      toast.error("Add items to send to kitchen");
      return;
    }

    if (!isParcel && !tableNumber) {
      toast.error("Please enter table number for dine-in orders");
      return;
    }

    try {
      const orderData = {
        created_by: waiterData.ownerId,
        waiter_id: waiterData.id,
        waiter_name: waiterData.name,
        order_type: isParcel ? 'takeaway' : 'dine-in',
        table_number: isParcel ? null : tableNumber,
        items_data: cartItems as unknown as any,
        customer_name: customerName || null,
        status: 'active',
        total_amount: calculateTotal(),
        notes: notes || null,
      };

      if (activeOrderId) {
        const { data: existingOrder } = await supabase
          .from('live_orders')
          .select('items_data, total_amount, notes')
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

          const { error } = await supabase
            .from('live_orders')
            .update({
              items_data: mergedItems as unknown as any,
              total_amount: newTotal,
              notes: notes || existingOrder.notes
            })
            .eq('id', activeOrderId);

          if (error) throw error;
          toast.success("Items added to existing order!");
        }
      } else {
        const { data, error } = await supabase
          .from('live_orders')
          .insert([orderData])
          .select()
          .single();

        if (error) throw error;
        setActiveOrderId(data.id);
        toast.success("Order sent to kitchen!");
      }

      // Also send to kitchen_orders for kitchen display
      const kitchenOrder = {
        created_by: waiterData.ownerId,
        bill_number: `W-${Date.now().toString().slice(-6)}`,
        order_type: isParcel ? 'takeaway' : 'dine-in',
        items_data: cartItems as unknown as any,
        customer_name: customerName || `Table ${tableNumber}`,
        customer_phone: null,
        status: 'pending',
        total_amount: calculateTotal(),
        notes: notes ? `${waiterData.name}: ${notes}` : `Waiter: ${waiterData.name}`,
      };

      await supabase.from('kitchen_orders').insert([kitchenOrder]);

      setCartItems([]);
      setNotes("");
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
    setNotes("");
    setIsParcel(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('waiterData');
    navigate('/auth');
  };

  if (!waiterData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg font-bold">Waiter Interface</h1>
                <p className="text-indigo-100 text-sm">{waiterData.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeOrderId && (
                <Badge variant="secondary" className="bg-green-500 text-white">
                  Active Order
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : categories.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No categories</p>
              ) : (
                categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.name ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.name)}
                    className="w-full justify-start text-xs h-auto py-2 px-2"
                  >
                    <span className="truncate">{cat.name}</span>
                  </Button>
                ))
              )}
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
                        <Button size="sm" className="w-full mt-2 h-7 text-xs">
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
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
                <Switch
                  checked={isParcel}
                  onCheckedChange={setIsParcel}
                />
                <Package className={`h-4 w-4 ${isParcel ? 'text-orange-600' : 'text-muted-foreground'}`} />
                <span className="text-xs font-medium">
                  {isParcel ? 'Takeaway' : 'Dine-in'}
                </span>
              </div>

              {/* Table Number (for dine-in) */}
              {!isParcel && (
                <div className="space-y-1">
                  <Label className="text-xs">Table Number *</Label>
                  <Input
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Enter table number"
                    className="h-8 text-sm"
                  />
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
              <Button
                variant="outline"
                onClick={clearOrder}
                className="w-full"
                size="sm"
              >
                Start New Order
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaiterInterface;
