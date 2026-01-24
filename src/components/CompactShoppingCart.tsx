import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingCart as CartIcon, Tag, Percent } from "lucide-react";
import { formatIndianCurrency } from "@/lib/numberFormat";
import { Badge } from "@/components/ui/badge";
import LoadingButton from "@/components/LoadingButton";

export interface CartItem {
  id: string;
  barcode: string;
  name: string;
  tamil_name?: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  tax_rate: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  price_type?: string;
  category?: string;
  discountInfo?: string | null;
  discountAmount?: number;
  is_inclusive?: boolean;
}

interface CompactShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void | Promise<void>;
  couponDiscount?: number;
  productSGST?: number;
  productCGST?: number;
  productIGST?: number;
  additionalGstAmount?: number;
  couponCode?: string;
  additionalGstRate?: string;
  useIGST?: boolean;
  billingMode?: string;
  inclusiveBillType?: string;
  isProcessing?: boolean;
  stockLimits?: { [id: string]: number };
  loyaltyDiscount?: number;
  pointsRedeemed?: number;
}

const CompactShoppingCart = ({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout, 
  couponDiscount = 0,
  productSGST = 0,
  productCGST = 0,
  productIGST = 0,
  additionalGstAmount = 0,
  couponCode,
  useIGST = false,
  billingMode = "exclusive",
  inclusiveBillType = "split",
  isProcessing = false,
  stockLimits = {},
  loyaltyDiscount = 0,
  pointsRedeemed = 0
}: CompactShoppingCartProps) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscountSaved = items.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + ((item.originalPrice - item.price) * item.quantity);
    }
    return sum;
  }, 0);
  
  const productTaxAmount = useIGST ? productIGST : (productSGST + productCGST);
  const showTax = billingMode === "exclusive" || (billingMode === "inclusive" && inclusiveBillType === "split");
  const subtotalWithProductTax = subtotal + productTaxAmount;
  const afterCouponDiscount = subtotalWithProductTax - couponDiscount;
  const afterLoyaltyDiscount = afterCouponDiscount - loyaltyDiscount;
  const total = afterLoyaltyDiscount + additionalGstAmount;

  // Round off calculation
  const roundedTotal = Math.round(Math.max(0, total));
  const roundOff = roundedTotal - total;

  return (
    <div className="flex flex-col h-full bg-card border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <CartIcon className="h-4 w-4" />
          <span className="font-semibold text-sm">Cart</span>
        </div>
        {items.length > 0 && (
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        )}
      </div>

      {/* Items List - Compact with high density */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <CartIcon className="h-8 w-8 mb-1 opacity-50" />
            <p className="text-xs">Empty</p>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item, index) => {
              const maxStock = stockLimits[item.id] ?? Infinity;
              const atMaxStock = item.quantity >= maxStock;
              
              return (
                <div key={item.id} className="px-2 py-1.5 hover:bg-muted/30 transition-colors">
                  {/* Row 1: Name + Total */}
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                        <span className="font-medium text-xs truncate flex-1">{item.name}</span>
                      </div>
                      {item.discountInfo && (
                        <span className="text-[9px] text-green-600 ml-4">{item.discountInfo}</span>
                      )}
                    </div>
                    <span className="font-semibold text-xs whitespace-nowrap">
                      {formatIndianCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                  
                  {/* Row 2: Price + Qty Controls + Remove */}
                  <div className="flex items-center justify-between mt-1 ml-4">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {item.originalPrice && item.originalPrice > item.price ? (
                        <>
                          <span className="line-through">₹{item.originalPrice.toFixed(0)}</span>
                          <span className="text-green-600">₹{item.price.toFixed(2)}</span>
                        </>
                      ) : (
                        <span>₹{item.price.toFixed(2)}</span>
                      )}
                      {item.price_type === 'weight' && <span>/kg</span>}
                    </div>
                    
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => onUpdateQuantity(item.id, Math.max(item.price_type === 'weight' ? 0.1 : 1, item.quantity - (item.price_type === 'weight' ? 0.1 : 1)))}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </Button>
                      <Input
                        type="number"
                        step={item.price_type === 'weight' ? "0.1" : "1"}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const capped = Math.min(maxStock, Math.max(item.price_type === 'weight' ? 0.1 : 1, val));
                          onUpdateQuantity(item.id, capped);
                        }}
                        className={`w-10 text-center h-5 text-[10px] px-1 ${atMaxStock ? 'border-orange-400' : ''}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-5 w-5 ${atMaxStock ? 'opacity-30' : ''}`}
                        onClick={() => !atMaxStock && onUpdateQuantity(item.id, item.quantity + (item.price_type === 'weight' ? 0.1 : 1))}
                        disabled={atMaxStock}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-destructive hover:text-destructive"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totals Section - Fixed at bottom */}
      {items.length > 0 && (
        <div className="border-t bg-muted/20 px-3 py-2 space-y-1">
          {/* Subtotal */}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatIndianCurrency(subtotal)}</span>
          </div>
          
          {/* Discount Saved */}
          {totalDiscountSaved > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span className="flex items-center gap-1">
                <Percent className="h-2.5 w-2.5" />
                Saved
              </span>
              <span>-{formatIndianCurrency(totalDiscountSaved)}</span>
            </div>
          )}
          
          {/* Tax */}
          {showTax && productTaxAmount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{useIGST ? 'IGST' : 'GST'}</span>
              <span>{formatIndianCurrency(productTaxAmount)}</span>
            </div>
          )}
          
          {/* Coupon */}
          {couponDiscount > 0 && (
            <div className="flex justify-between text-xs text-orange-600">
              <span className="flex items-center gap-1">
                <Tag className="h-2.5 w-2.5" />
                {couponCode || 'Coupon'}
              </span>
              <span>-{formatIndianCurrency(couponDiscount)}</span>
            </div>
          )}
          
          {/* Loyalty Points */}
          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-xs text-amber-600">
              <span className="flex items-center gap-1">
                🎁 Loyalty ({pointsRedeemed} pts)
              </span>
              <span>-{formatIndianCurrency(loyaltyDiscount)}</span>
            </div>
          )}
          
          {/* Additional GST */}
          {additionalGstAmount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Add. GST</span>
              <span>{formatIndianCurrency(additionalGstAmount)}</span>
            </div>
          )}
          
          {/* Round Off */}
          {Math.abs(roundOff) >= 0.01 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Round Off</span>
              <span>{roundOff >= 0 ? '+' : ''}{formatIndianCurrency(roundOff)}</span>
            </div>
          )}
          
          {/* Grand Total */}
          <div className="flex justify-between font-bold text-base pt-1 border-t">
            <span>Total</span>
            <span className="text-primary">{formatIndianCurrency(roundedTotal)}</span>
          </div>
          
          {/* Checkout Button */}
          <LoadingButton
            className="w-full mt-2 h-9"
            onClick={onCheckout}
            isLoading={isProcessing}
            disabled={items.length === 0}
          >
            Complete Sale (F12)
          </LoadingButton>
        </div>
      )}
    </div>
  );
};

export default CompactShoppingCart;
