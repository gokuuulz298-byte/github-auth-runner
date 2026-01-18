import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingCart as CartIcon, Tag, Percent } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatIndianCurrency } from "@/lib/numberFormat";
import { Badge } from "@/components/ui/badge";

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

interface ShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  couponDiscount?: number;
  productSGST?: number;
  productCGST?: number;
  productIGST?: number;
  additionalGstAmount?: number;
  couponCode?: string;
  additionalGstRate?: string;
  useIGST?: boolean;
  billingMode?: string;  // "exclusive" or "inclusive"
  inclusiveBillType?: string;  // "split" or "mrp"
}

const ShoppingCart = ({ 
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
  additionalGstRate,
  useIGST = false,
  billingMode = "exclusive",
  inclusiveBillType = "split"
}: ShoppingCartProps) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscountSaved = items.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + ((item.originalPrice - item.price) * item.quantity);
    }
    return sum;
  }, 0);
  
  const productTaxAmount = useIGST
  ? productIGST
  : (productSGST + productCGST);

  const showTax =
  billingMode === "exclusive" ||
  (billingMode === "inclusive" && inclusiveBillType === "split");


  const subtotalWithProductTax = subtotal + productTaxAmount;
  const afterCouponDiscount = subtotalWithProductTax - couponDiscount;
  const additionalSGST = additionalGstAmount / 2;
  const additionalCGST = additionalGstAmount / 2;
  const totalSGST = productSGST + additionalSGST;
  const totalCGST = productCGST + additionalCGST;
  const totalTaxAmount = productTaxAmount + additionalGstAmount;
  const total = afterCouponDiscount + additionalGstAmount;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CartIcon className="h-5 w-5" />
          Shopping Cart
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-auto">{items.length} items</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Cart is empty</p>
            <p className="text-sm">Scan products to add them</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm truncate">{item.name}</h4>
                      {item.discountInfo && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                          <Tag className="h-3 w-3 mr-1" />
                          {item.discountInfo}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.originalPrice && item.originalPrice > item.price ? (
                        <>
                          <span className="text-xs text-muted-foreground line-through">
                            {formatIndianCurrency(item.originalPrice)}
                          </span>
                          <span className="text-sm font-medium text-green-600">
                            {formatIndianCurrency(item.price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {formatIndianCurrency(item.price)}
                        </span>
                      )}
                      {item.price_type === 'weight' && <span className="text-xs text-muted-foreground">/kg</span>}
                      {item.category && <span className="text-xs text-muted-foreground">• {item.category}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      step={item.price_type === 'weight' ? "0.1" : "1"}
                      value={item.quantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          onUpdateQuantity(item.id, 0);
                        } else {
                          const parsed = parseFloat(value);
                          onUpdateQuantity(item.id, Math.max(item.price_type === 'weight' ? 0.1 : 1, parsed || 0));
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || parseFloat(e.target.value) <= 0) {
                          onUpdateQuantity(item.id, item.price_type === 'weight' ? 0.1 : 1);
                        }
                      }}
                      className="w-14 text-center h-7 text-sm"
                      min={item.price_type === 'weight' ? "0.1" : "1"}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-right min-w-[70px]">
                    <p className="font-medium text-sm">{formatIndianCurrency(item.price * item.quantity)}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatIndianCurrency(subtotal)}</span>
              </div>
              
              {/* Product Discount Savings */}
              {totalDiscountSaved > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Product Discounts Applied
                  </span>
                  <span>-{formatIndianCurrency(totalDiscountSaved)}</span>
                </div>
              )}
              
              {/* Show tax details for exclusive mode OR inclusive with split */}
              {showTax && (
                <>
                  {useIGST && productIGST > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IGST (Products)</span>
                      <span>{formatIndianCurrency(productIGST)}</span>
                    </div>
                  )}
                  {!useIGST && (productSGST > 0 || productCGST > 0) && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SGST (Products)</span>
                        <span>{formatIndianCurrency(productSGST)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">CGST (Products)</span>
                        <span>{formatIndianCurrency(productCGST)}</span>
                      </div>
                      {/* Show item-wise tax breakdown for exclusive mode */}
                      {billingMode === "exclusive" && items.length > 0 && (
                        <div className="pl-4 space-y-1 text-xs mt-1">
                          {items.map(item => {
                            const itemTotal = item.price * item.quantity;
                            const cgst = (itemTotal * (item.cgst || 0)) / 100;
                            const sgst = (itemTotal * (item.sgst || 0)) / 100;
                            if (cgst > 0 || sgst > 0) {
                              return (
                                <div key={item.id} className="flex justify-between text-muted-foreground">
                                  <span className="truncate">{item.name}:</span>
                                  <span>CGST: ₹{cgst.toFixed(2)} | SGST: ₹{sgst.toFixed(2)}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded-md -mx-2">
                  <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
                    <Tag className="h-3 w-3" />
                    Coupon {couponCode ? `(${couponCode})` : ''}
                  </span>
                  <span className="text-green-700 dark:text-green-400 font-medium">-{formatIndianCurrency(couponDiscount)}</span>
                </div>
              )}
              
              {showTax && additionalGstAmount > 0 && !useIGST && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Additional SGST ({additionalGstRate ? `${parseFloat(additionalGstRate)/2}%` : ''})</span>
                    <span>{formatIndianCurrency(additionalSGST)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Additional CGST ({additionalGstRate ? `${parseFloat(additionalGstRate)/2}%` : ''})</span>
                    <span>{formatIndianCurrency(additionalCGST)}</span>
                  </div>
                </>
              )}
              {showTax && totalTaxAmount > 0 && (
                <>
                  <Separator className="my-2" />
                  {useIGST ? (
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-muted-foreground">Total IGST</span>
                      <span>{formatIndianCurrency(productIGST)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-muted-foreground">Total SGST</span>
                        <span>{formatIndianCurrency(totalSGST)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-muted-foreground">Total CGST</span>
                        <span>{formatIndianCurrency(totalCGST)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground">Total Tax</span>
                    <span>{formatIndianCurrency(totalTaxAmount)}</span>
                  </div>
                </>
              )}
              <Separator />
              {/* Round Off */}
              {(() => {
                const roundedTotal = Math.round(total);
                const roundOff = roundedTotal - total;
                if (Math.abs(roundOff) >= 0.01) {
                  return (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Round Off</span>
                      <span className={roundOff >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {roundOff >= 0 ? '+' : ''}{formatIndianCurrency(Math.abs(roundOff))}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{formatIndianCurrency(Math.round(total))}</span>
              </div>
            </div>

            <Button 
              className="w-full mt-4" 
              size="lg"
              onClick={onCheckout}
              disabled={items.length === 0}
            >
              Complete Sale
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ShoppingCart;
