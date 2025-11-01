import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllProducts } from "@/lib/indexedDB";

interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_quantity: number;
  category?: string;
  price_type?: string;
}

const LowStocks = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [threshold, setThreshold] = useState<number>(10);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    fetchProducts();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      if (isOnline) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Please sign in to view products");
          return;
        }

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('created_by', user.id)
          .order('stock_quantity', { ascending: true });

        if (error) throw error;
        setProducts(data || []);
      } else {
        const localProducts = await getAllProducts();
        setProducts(localProducts.sort((a, b) => a.stock_quantity - b.stock_quantity));
      }
    } catch (error: any) {
      toast.error(`Error fetching products: ${error.message || 'Unknown error'}`);
      console.error(error);
    }
  };

  const lowStockProducts = products.filter(p => p.stock_quantity <= threshold);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Low Stock Alert</h1>
          {!isOnline && (
            <span className="ml-auto bg-warning text-warning-foreground px-3 py-1 rounded-full text-sm">
              Offline Mode
            </span>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Filter by Stock Threshold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="threshold">Show products with stock below:</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Found <span className="font-bold text-destructive">{lowStockProducts.length}</span> low stock items
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Stock Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((product) => (
                    <TableRow key={product.id} className={product.stock_quantity === 0 ? "bg-destructive/10" : ""}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{product.barcode}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${product.stock_quantity === 0 ? 'text-destructive' : 'text-warning'}`}>
                          {product.stock_quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        ₹{product.price.toFixed(2)}
                        {product.price_type === 'weight' && '/kg'}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.stock_quantity === 0 ? (
                          <span className="text-xs font-medium text-destructive">OUT OF STOCK</span>
                        ) : (
                          <span className="text-xs font-medium text-warning">LOW STOCK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {lowStockProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No low stock items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LowStocks;
