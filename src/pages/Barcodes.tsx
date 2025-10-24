import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  category: string;
}

const Barcodes = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [codeType, setCodeType] = useState<"barcode" | "qrcode">("barcode");
  const barcodeRef = useRef<HTMLCanvasElement>(null);
  const qrcodeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      generateCode();
    }
  }, [selectedProduct, codeType]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Error fetching products");
    }
  };

  const generateCode = () => {
    if (!selectedProduct) return;

    try {
      if (codeType === "barcode" && barcodeRef.current) {
        JsBarcode(barcodeRef.current, selectedProduct.barcode, {
          format: "CODE128",
          width: 1.5,
          height: 35,
          displayValue: false,
          fontSize: 10,
        });
      } else if (codeType === "qrcode" && qrcodeRef.current) {
        QRCode.toCanvas(qrcodeRef.current, selectedProduct.barcode, {
          width: 80,
          margin: 0,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error generating code");
    }
  };

  const handlePrint = () => {
    if (!selectedProduct) {
      toast.error("Please select a product first");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const canvas = codeType === "barcode" ? barcodeRef.current : qrcodeRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Sticker - ${selectedProduct.name}</title>
          <style>
            @page {
              size: 40mm 30mm;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 40mm;
              height: 30mm;
              overflow: hidden;
            }
            body {
              padding: 1mm;
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            .product-name {
              font-size: 7pt;
              font-weight: bold;
              text-align: center;
              margin: 0;
              max-width: 38mm;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              line-height: 1.1;
              flex-shrink: 0;
            }
            .code-image {
              max-width: 36mm;
              max-height: 18mm;
              object-fit: contain;
              flex-shrink: 0;
            }
            .product-code {
              font-size: 6pt;
              text-align: center;
              margin: 0;
              font-family: monospace;
              flex-shrink: 0;
            }
          </style>
        </head>
        <body>
          <div class="product-name">${selectedProduct.name}</div>
          <img src="${dataUrl}" class="code-image" />
          <div class="product-code">${selectedProduct.barcode}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    toast.success("Printing sticker...");
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Barcode & QR Code Generator</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="pl-10"
                />
              </div>

              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedProduct?.id === product.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <h4 className="font-medium">{product.name}</h4>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm opacity-90">Code: {product.barcode}</p>
                      <p className="text-sm font-semibold">₹{product.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Code Type</Label>
                <div className="flex gap-4">
                  <Button
                    variant={codeType === "barcode" ? "default" : "outline"}
                    onClick={() => setCodeType("barcode")}
                  >
                    Barcode
                  </Button>
                  <Button
                    variant={codeType === "qrcode" ? "default" : "outline"}
                    onClick={() => setCodeType("qrcode")}
                  >
                    QR Code
                  </Button>
                </div>
              </div>

              {selectedProduct ? (
                <div className="space-y-4">
                  <div className="p-6 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium mb-2">Selected Product:</p>
                    <p className="text-lg font-bold">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.barcode} • ₹{selectedProduct.price}
                    </p>
                  </div>

                  <div className="flex justify-center p-8 bg-white rounded-lg">
                    {codeType === "barcode" ? (
                      <canvas ref={barcodeRef}></canvas>
                    ) : (
                      <canvas ref={qrcodeRef}></canvas>
                    )}
                  </div>

                  <Button onClick={handlePrint} className="w-full">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Sticker (40mm x 30mm)
                  </Button>

                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Sticker will print in 40mm x 30mm format with product name, price, and code.
                      Make sure your printer is configured for label printing.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Select a product to generate code
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Barcodes;
