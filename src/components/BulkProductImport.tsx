import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BulkProductImportProps {
  onImportComplete: () => void;
}

interface ParsedProduct {
  barcode: string;
  name: string;
  tamil_name?: string;
  price: number;
  buying_price?: number;
  stock_quantity: number;
  low_stock_threshold?: number;
  hsn_code?: string;
  product_tax?: number;
  cgst?: number;
  sgst?: number;
  category?: string;
  price_type?: string;
  unit?: string;
}

const BulkProductImport = ({ onImportComplete }: BulkProductImportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = [
      "barcode",
      "name",
      "tamil_name",
      "price",
      "buying_price",
      "stock_quantity",
      "low_stock_threshold",
      "hsn_code",
      "product_tax",
      "cgst",
      "sgst",
      "category",
      "price_type",
      "unit"
    ];
    
    const sampleData = [
      "123456789,Sample Product,மாதிரி பொருள்,100,80,50,10,1234,18,9,9,General,fixed,piece",
      "987654321,Weight Product,எடை பொருள்,250,200,25.5,5,5678,5,2.5,2.5,Food,weight,kg"
    ];
    
    const csvContent = [headers.join(","), ...sampleData].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded!");
  };

  const parseCSV = (content: string): ParsedProduct[] => {
    const lines = content.split("\n").filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row");
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const products: ParsedProduct[] = [];
    const parseErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(",").map(v => v.trim());
        const product: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || "";
          switch (header) {
            case "barcode":
            case "name":
            case "tamil_name":
            case "hsn_code":
            case "category":
            case "price_type":
            case "unit":
              product[header] = value;
              break;
            case "price":
            case "buying_price":
            case "stock_quantity":
            case "low_stock_threshold":
            case "product_tax":
            case "cgst":
            case "sgst":
              product[header] = value ? parseFloat(value) : 0;
              break;
          }
        });

        // Validate required fields
        if (!product.barcode) {
          parseErrors.push(`Row ${i + 1}: Barcode is required`);
          continue;
        }
        if (!product.name) {
          parseErrors.push(`Row ${i + 1}: Name is required`);
          continue;
        }
        if (!product.price || product.price <= 0) {
          parseErrors.push(`Row ${i + 1}: Price must be greater than 0`);
          continue;
        }

        products.push({
          barcode: product.barcode,
          name: product.name,
          tamil_name: product.tamil_name || undefined,
          price: product.price,
          buying_price: product.buying_price || 0,
          stock_quantity: product.stock_quantity || 0,
          low_stock_threshold: product.low_stock_threshold || 10,
          hsn_code: product.hsn_code || undefined,
          product_tax: product.product_tax || 0,
          cgst: product.cgst || 0,
          sgst: product.sgst || 0,
          category: product.category || undefined,
          price_type: product.price_type || "fixed",
          unit: product.unit || "piece"
        });
      } catch (err) {
        parseErrors.push(`Row ${i + 1}: Invalid data format`);
      }
    }

    setErrors(parseErrors);
    return products;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (fileExt !== "csv") {
      toast.error("Please upload a CSV file");
      return;
    }

    try {
      const content = await file.text();
      const products = parseCSV(content);
      setParsedProducts(products);
      
      if (products.length > 0) {
        toast.success(`Parsed ${products.length} products from file`);
      } else {
        toast.error("No valid products found in file");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to parse file");
    }
  };

  const handleImport = async () => {
    if (parsedProducts.length === 0) {
      toast.error("No products to import");
      return;
    }

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check for duplicate barcodes
      const barcodes = parsedProducts.map(p => p.barcode);
      const { data: existingProducts } = await supabase
        .from("products")
        .select("barcode")
        .eq("created_by", user.id)
        .in("barcode", barcodes);

      const existingBarcodes = new Set(existingProducts?.map(p => p.barcode) || []);
      const newProducts = parsedProducts.filter(p => !existingBarcodes.has(p.barcode));
      const skippedCount = parsedProducts.length - newProducts.length;

      if (newProducts.length === 0) {
        toast.error("All products already exist (duplicate barcodes)");
        setIsImporting(false);
        return;
      }

      // Insert products in batches
      const batchSize = 50;
      let insertedCount = 0;

      for (let i = 0; i < newProducts.length; i += batchSize) {
        const batch = newProducts.slice(i, i + batchSize).map(p => ({
          ...p,
          tax_rate: p.product_tax,
          created_by: user.id,
          is_deleted: false
        }));

        const { error } = await supabase.from("products").insert(batch);
        if (error) throw error;
        insertedCount += batch.length;
      }

      toast.success(`Imported ${insertedCount} products successfully!${skippedCount > 0 ? ` (${skippedCount} skipped - duplicates)` : ""}`);
      
      setParsedProducts([]);
      setErrors([]);
      setIsOpen(false);
      onImportComplete();
    } catch (error: any) {
      toast.error(error.message || "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Product Import</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Download Template */}
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Step 1: Download Template
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              Download the CSV template to see the correct format for importing products.
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* Upload CSV */}
          <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Step 2: Upload CSV File
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              Fill in the template and upload your CSV file.
            </p>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose CSV File
            </Button>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                Validation Errors
              </h4>
              <ul className="text-xs text-red-600 list-disc list-inside">
                {errors.slice(0, 5).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {errors.length > 5 && <li>...and {errors.length - 5} more errors</li>}
              </ul>
            </div>
          )}

          {/* Preview */}
          {parsedProducts.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                {parsedProducts.length} Products Ready to Import
              </h4>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-1">Barcode</th>
                      <th className="text-left p-1">Name</th>
                      <th className="text-right p-1">Price</th>
                      <th className="text-right p-1">Stock</th>
                      <th className="text-left p-1">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedProducts.slice(0, 10).map((p, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-1 font-mono">{p.barcode}</td>
                        <td className="p-1">{p.name}</td>
                        <td className="p-1 text-right">₹{p.price}</td>
                        <td className="p-1 text-right">{p.stock_quantity}</td>
                        <td className="p-1">{p.category || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedProducts.length > 10 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ...and {parsedProducts.length - 10} more products
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Import Button */}
          <Button 
            className="w-full" 
            onClick={handleImport} 
            disabled={parsedProducts.length === 0 || isImporting}
          >
            {isImporting ? "Importing..." : `Import ${parsedProducts.length} Products`}
          </Button>

          {/* Column Reference */}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">Column Reference</summary>
            <ul className="mt-2 space-y-1 pl-4">
              <li><strong>barcode</strong> (required): Unique product barcode</li>
              <li><strong>name</strong> (required): Product name in English</li>
              <li><strong>tamil_name</strong>: Product name in Tamil</li>
              <li><strong>price</strong> (required): Selling price (MRP)</li>
              <li><strong>buying_price</strong>: Cost/purchase price</li>
              <li><strong>stock_quantity</strong>: Current stock level</li>
              <li><strong>low_stock_threshold</strong>: Alert threshold (default: 10)</li>
              <li><strong>hsn_code</strong>: HSN code for GST</li>
              <li><strong>product_tax</strong>: Total tax percentage</li>
              <li><strong>cgst</strong>: CGST percentage</li>
              <li><strong>sgst</strong>: SGST percentage</li>
              <li><strong>category</strong>: Product category</li>
              <li><strong>price_type</strong>: "fixed" or "weight"</li>
              <li><strong>unit</strong>: "piece", "kg", "g", etc.</li>
            </ul>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkProductImport;
