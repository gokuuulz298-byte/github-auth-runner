import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingCart as CartIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatIndianCurrency } from "@/lib/numberFormat";

export interface CartItem {
  id: string;
  barcode: string;
  name: string;
  price: number;
  quantity: number;
  tax_rate: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  price_type?: string;
  category?: string;
  discountInfo?: string | null;
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
  intraStateTrade?: boolean;
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
  intraStateTrade = false
}: ShoppingCartProps) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const productTaxAmount = intraStateTrade ? productIGST : (productSGST + productCGST);
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CartIcon className="h-5 w-5" />
          Shopping Cart
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
            <div className="space-y-4 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    {item.discountInfo && (
                      <p className="text-xs text-green-600 font-medium">({item.discountInfo})</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatIndianCurrency(item.price)}
                      {item.price_type === 'weight' && '/kg'}
                      {item.category && ` • ${item.category}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
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
                      className="w-20 text-center"
                      min={item.price_type === 'weight' ? "0.1" : "1"}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="font-medium">{formatIndianCurrency(item.price * item.quantity)}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
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
              {intraStateTrade ? (
                productIGST > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGST (Products)</span>
                    <span>{formatIndianCurrency(productIGST)}</span>
                  </div>
                )
              ) : (
                productSGST > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SGST (Products)</span>
                      <span>{formatIndianCurrency(productSGST)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CGST (Products)</span>
                      <span>{formatIndianCurrency(productCGST)}</span>
                    </div>
                  </>
                )
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Coupon {couponCode ? `(${couponCode})` : ''}</span>
                  <span>-{formatIndianCurrency(couponDiscount)}</span>
                </div>
              )}
              {additionalGstAmount > 0 && !intraStateTrade && (
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
              {totalTaxAmount > 0 && (
                <>
                  <Separator className="my-2" />
                  {intraStateTrade ? (
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
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatIndianCurrency(total)}</span>
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
