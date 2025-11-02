import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Template {
  id: string;
  name: string;
  description: string;
  template_data: any;
  is_active: boolean;
}

const Templates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const defaultTemplates = [
    {
      name: "Classic Professional",
      description: "Clean and professional design with clear section separation",
      template_data: {
        headerBg: "#f8fafc",
        primaryColor: "#1e40af",
        fontSize: "12px",
        layout: "classic"
      }
    },
    {
      name: "Modern Minimal",
      description: "Minimalist design with subtle borders and ample white space",
      template_data: {
        headerBg: "#ffffff",
        primaryColor: "#059669",
        fontSize: "11px",
        layout: "modern"
      }
    },
    {
      name: "Bold Business",
      description: "Strong headers with bold fonts and clear hierarchy",
      template_data: {
        headerBg: "#1e293b",
        primaryColor: "#dc2626",
        fontSize: "13px",
        layout: "bold"
      }
    },
    {
      name: "Elegant Corporate",
      description: "Sophisticated design with elegant typography",
      template_data: {
        headerBg: "#f1f5f9",
        primaryColor: "#7c3aed",
        fontSize: "12px",
        layout: "elegant"
      }
    },
    {
      name: "Compact Economy",
      description: "Space-efficient design fitting more content per page",
      template_data: {
        headerBg: "#fef3c7",
        primaryColor: "#ea580c",
        fontSize: "10px",
        layout: "compact"
      }
    }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bill_templates')
        .select('*')
        .eq('created_by', user.id);

      if (error) throw error;

      if (!data || data.length === 0) {
        await initializeDefaultTemplates(user.id);
      } else {
        setTemplates(data);
        const active = data.find(t => t.is_active);
        if (active) setActiveTemplateId(active.id);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to fetch templates");
    }
  };

  const initializeDefaultTemplates = async (userId: string) => {
    try {
      const templatesToInsert = defaultTemplates.map((template, index) => ({
        ...template,
        created_by: userId,
        is_active: index === 0
      }));

      const { data, error } = await supabase
        .from('bill_templates')
        .insert(templatesToInsert)
        .select();

      if (error) throw error;

      setTemplates(data);
      if (data && data.length > 0) {
        setActiveTemplateId(data[0].id);
      }
      toast.success("Default templates initialized");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to initialize templates");
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Deactivate all templates
      await supabase
        .from('bill_templates')
        .update({ is_active: false })
        .eq('created_by', user.id);

      // Activate selected template
      const { error } = await supabase
        .from('bill_templates')
        .update({ is_active: true })
        .eq('id', templateId);

      if (error) throw error;

      setActiveTemplateId(templateId);
      toast.success("Template activated successfully");
      fetchTemplates();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to activate template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Invoice Templates</h1>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Alert className="mb-4 sm:mb-6">
          <AlertDescription>
            Select a template design for your A4 invoices. The active template will be used for all future invoice generation.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {templates.map((template) => (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                activeTemplateId === template.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleSelectTemplate(template.id)}
            >
              <CardHeader className="p-3 sm:p-6">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base sm:text-lg">{template.name}</CardTitle>
                  {activeTemplateId === template.id && (
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  {template.description}
                </p>
                
                {/* Full Page Template Preview */}
                <div 
                  className="border rounded-lg overflow-hidden bg-white"
                  style={{ minHeight: '280px' }}
                >
                  {/* Preview Header */}
                  <div 
                    className="p-3"
                    style={{ 
                      backgroundColor: template.template_data.headerBg,
                      borderBottom: `3px solid ${template.template_data.primaryColor}`
                    }}
                  >
                    <div 
                      className="font-bold text-lg mb-1"
                      style={{ 
                        color: template.template_data.primaryColor,
                        fontSize: template.template_data.layout === 'compact' ? '14px' : '16px'
                      }}
                    >
                      {template.template_data.layout === 'bold' && '■ '}
                      INVOICE
                    </div>
                    <div 
                      className="text-xs opacity-70"
                      style={{ fontSize: template.template_data.fontSize }}
                    >
                      INV-2024-001 | Date: {new Date().toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* Preview Content */}
                  <div className="p-3 space-y-2">
                    {/* Company & Customer Info */}
                    <div 
                      className={`grid ${template.template_data.layout === 'compact' ? 'grid-cols-1 gap-1' : 'grid-cols-2 gap-2'} text-xs`}
                      style={{ fontSize: template.template_data.fontSize }}
                    >
                      <div className="space-y-1">
                        <div 
                          className="font-semibold" 
                          style={{ 
                            color: template.template_data.layout === 'bold' ? '#ffffff' : template.template_data.primaryColor 
                          }}
                        >
                          Your Company
                        </div>
                        <div 
                          className="text-[10px]"
                          style={{ 
                            color: template.template_data.layout === 'bold' ? '#e5e7eb' : 'rgba(0,0,0,0.7)' 
                          }}
                        >
                          123 Business St, City
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div 
                          className="font-semibold"
                          style={{ 
                            color: template.template_data.layout === 'bold' ? '#ffffff' : 'inherit'
                          }}
                        >
                          Customer Name
                        </div>
                        <div 
                          className="text-[10px]"
                          style={{ 
                            color: template.template_data.layout === 'bold' ? '#e5e7eb' : 'rgba(0,0,0,0.7)' 
                          }}
                        >
                          Phone: 9876543210
                        </div>
                      </div>
                    </div>
                    
                    {/* Items Table Preview */}
                    <div className="border rounded overflow-hidden">
                      <div 
                        className="grid grid-cols-4 gap-2 p-2 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: template.template_data.primaryColor }}
                      >
                        <div>Item</div>
                        <div className="text-center">Qty</div>
                        <div className="text-center">Rate</div>
                        <div className="text-right">Amt</div>
                      </div>
                      <div 
                        className="grid grid-cols-4 gap-2 p-2 text-[10px]"
                        style={{ fontSize: template.template_data.fontSize }}
                      >
                        <div>Product A</div>
                        <div className="text-center">2</div>
                        <div className="text-center">₹500</div>
                        <div className="text-right">₹1,000</div>
                      </div>
                    </div>
                    
                    {/* Totals Preview */}
                    <div 
                      className={`${template.template_data.layout === 'elegant' ? 'border-t-2' : 'border-t'} pt-2 space-y-1 text-xs`}
                      style={{ 
                        fontSize: template.template_data.fontSize,
                        borderColor: template.template_data.layout === 'elegant' ? template.template_data.primaryColor : undefined
                      }}
                    >
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹1,000.00</span>
                      </div>
                      <div className="flex justify-between text-[10px] opacity-70">
                        <span>CGST (9%):</span>
                        <span>₹90.00</span>
                      </div>
                      <div className="flex justify-between text-[10px] opacity-70">
                        <span>SGST (9%):</span>
                        <span>₹90.00</span>
                      </div>
                      <div 
                        className="flex justify-between font-bold pt-1 border-t"
                        style={{ 
                          color: template.template_data.layout === 'bold' ? template.template_data.primaryColor : 'inherit'
                        }}
                      >
                        <span>Grand Total:</span>
                        <span>₹1,180.00</span>
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div 
                      className={`text-center text-[10px] pt-2 ${template.template_data.layout === 'elegant' ? 'italic' : ''}`}
                      style={{ 
                        fontSize: template.template_data.fontSize,
                        borderTop: template.template_data.layout === 'modern' ? 'none' : `1px solid ${template.template_data.primaryColor}20`
                      }}
                    >
                      Thank you for your business!
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full mt-3 sm:mt-4"
                  variant={activeTemplateId === template.id ? "default" : "outline"}
                  disabled={loading || activeTemplateId === template.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTemplate(template.id);
                  }}
                >
                  {activeTemplateId === template.id ? "Active" : "Select"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Templates;