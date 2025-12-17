import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Minus, Send, UtensilsCrossed, Package } from "lucide-react";
import { toast } from "sonner";
import { formatIndianNumber, formatIndianCurrency } from "@/lib/numberFormat";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface WaiterInterfaceProps {
  waiterId: string;
  waiterName: string;
  ownerId: string;
}

const WaiterInterface = ({ waiterId, waiterName, ownerId }: WaiterInterfaceProps) => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [isParcel, setIsParcel] = useState<boolean>(false);
  const [tableNumber, setTableNumber] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [productQuantities, setProductQuantities] = useState<{ [key: string]: number }>({});
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchProducts(selectedCategory);
    } else {
      setProducts([]);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('created_by', ownerId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
      if (data && data.length > 0) {
        setSelectedCategory(data[0].name);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async (category: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('created_by', ownerId)
        .eq('category', category)
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToCart = (product: any, quantity: number = 1) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: quantity,
      };
      setCartItems([...cartItems, newItem]);
    }
    toast.success(`${product.name} added`);
    setProductQuantities({ ...productQuantities, [product.id]: 1 });
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
        created_by: ownerId,
        waiter_id: waiterId,
        waiter_name: waiterName,
        order_type: isParcel ? 'takeaway' : 'dine-in',
        table_number: isParcel ? null : tableNumber,
        items_data: cartItems as unknown as any,
        customer_name: customerName || null,
        status: 'active',
        total_amount: calculateTotal(),
        notes: notes || null,
      };

      if (activeOrderId) {
        // Update existing order - add new items
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
        // Create new order
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
        created_by: ownerId,
        bill_number: `W-${Date.now().toString().slice(-6)}`,
        order_type: isParcel ? 'takeaway' : 'dine-in',
        items_data: cartItems as unknown as any,
        customer_name: customerName || `Table ${tableNumber}`,
        customer_phone: null,
        status: 'pending',
        total_amount: calculateTotal(),
        notes: notes ? `${waiterName}: ${notes}` : `Waiter: ${waiterName}`,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/auth")}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Waiter Interface</h1>
                <p className="text-indigo-100 text-sm">{waiterName}</p>
              </div>
            </div>
            {activeOrderId && (
              <Badge variant="secondary" className="bg-green-500 text-white">
                Active Order
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Categories & Products */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Categories */}
          <div className="bg-white/80 dark:bg-gray-800/80 border-b p-2 overflow-x-auto">
            <div className="flex gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.name)}
                  className="whitespace-nowrap"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                  onClick={() => handleAddToCart(product, productQuantities[product.id] || 1)}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        {product.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2">
                    <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
                    <p className="text-primary font-bold">
                      ₹{formatIndianNumber(Number(product.price))}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Order Details */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-card flex flex-col max-h-[50vh] lg:max-h-none">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Order Type Toggle */}
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-950/50 dark:to-amber-950/50 rounded-lg">
              <UtensilsCrossed className={`h-5 w-5 ${!isParcel ? 'text-orange-600' : 'text-muted-foreground'}`} />
              <Switch
                checked={isParcel}
                onCheckedChange={setIsParcel}
              />
              <Package className={`h-5 w-5 ${isParcel ? 'text-orange-600' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">
                {isParcel ? 'Takeaway' : 'Dine-in'}
              </span>
            </div>

            {/* Table Number (for dine-in) */}
            {!isParcel && (
              <div className="space-y-1">
                <Label className="text-sm">Table Number *</Label>
                <Input
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Enter table number"
                  className="h-10"
                />
              </div>
            )}

            {/* Customer Name */}
            <div className="space-y-1">
              <Label className="text-sm">Customer Name</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Optional"
                className="h-10"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-sm">Special Instructions</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests..."
                className="h-10"
              />
            </div>

            {/* Cart Items */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Order Items</Label>
              {cartItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tap products to add
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-muted/50 rounded p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ₹{formatIndianNumber(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            {cartItems.length > 0 && (
              <div className="flex justify-between items-center font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span className="text-green-600">{formatIndianCurrency(calculateTotal())}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t space-y-2">
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