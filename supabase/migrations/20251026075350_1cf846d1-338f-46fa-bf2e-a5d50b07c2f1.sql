-- Create HSN codes table with Indian government GST rates
CREATE TABLE IF NOT EXISTS public.hsn_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hsn_code TEXT NOT NULL UNIQUE,
  description TEXT,
  gst_rate NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert common HSN codes with GST rates
INSERT INTO public.hsn_codes (hsn_code, description, gst_rate) VALUES
('0101', 'Live horses, asses, mules and hinnies', 0),
('0201', 'Meat of bovine animals, fresh or chilled', 0),
('0401', 'Milk and cream', 0),
('0701', 'Potatoes, fresh or chilled', 0),
('0801', 'Coconuts, Brazil nuts and cashew nuts', 5),
('1001', 'Wheat and meslin', 0),
('1006', 'Rice', 0),
('1701', 'Cane or beet sugar', 5),
('1801', 'Cocoa beans', 5),
('1901', 'Food preparations of flour, cereals', 18),
('2009', 'Fruit juices', 12),
('2201', 'Waters, mineral waters', 18),
('2202', 'Waters containing added sugar', 28),
('2203', 'Beer made from malt', 28),
('2401', 'Tobacco, unmanufactured', 28),
('2710', 'Petroleum oils', 18),
('3004', 'Medicaments', 12),
('3301', 'Essential oils', 18),
('3303', 'Perfumes and toilet waters', 28),
('3304', 'Beauty or make-up preparations', 28),
('3401', 'Soap, organic surface-active products', 18),
('3926', 'Other articles of plastics', 18),
('4011', 'New pneumatic tyres, of rubber', 28),
('4202', 'Trunks, suit-cases, handbags', 18),
('4818', 'Toilet paper, handkerchiefs, towels', 12),
('4901', 'Printed books, newspapers', 5),
('6109', 'T-shirts, singlets and other vests', 12),
('6110', 'Jerseys, pullovers, cardigans', 12),
('6203', 'Mens suits, jackets, trousers', 12),
('6204', 'Womens suits, jackets, dresses', 12),
('6302', 'Bed linen, table linen, toilet linen', 5),
('6402', 'Footwear with outer soles and uppers of rubber or plastics', 18),
('6403', 'Footwear with outer soles of rubber, leather', 18),
('6404', 'Footwear with outer soles of rubber or plastics', 18),
('6912', 'Ceramic tableware, kitchenware', 12),
('7113', 'Articles of jewellery', 3),
('7117', 'Imitation jewellery', 3),
('7321', 'Stoves, ranges, grates, cookers', 18),
('8414', 'Air or vacuum pumps, air or other gas compressors', 18),
('8415', 'Air conditioning machines', 28),
('8418', 'Refrigerators, freezers', 18),
('8443', 'Printing machinery', 18),
('8471', 'Automatic data processing machines', 18),
('8473', 'Parts and accessories for machines', 18),
('8504', 'Electrical transformers', 18),
('8508', 'Electro-mechanical domestic appliances', 18),
('8516', 'Electric water heaters, immersion heaters', 18),
('8517', 'Telephone sets, cellular phones', 18),
('8528', 'Television receivers', 18),
('8536', 'Electrical apparatus for switching', 18),
('8544', 'Insulated wire, cable', 18),
('8703', 'Motor cars and other motor vehicles', 28),
('8704', 'Motor vehicles for transport of goods', 28),
('8711', 'Motorcycles', 28),
('9018', 'Medical, surgical instruments', 12),
('9403', 'Other furniture and parts thereof', 18),
('9404', 'Mattress supports, articles of bedding', 18),
('9405', 'Lamps and lighting fittings', 18),
('9503', 'Tricycles, scooters, pedal cars and toys', 18),
('9504', 'Video game consoles and machines', 28);

-- Enable RLS
ALTER TABLE public.hsn_codes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read HSN codes
CREATE POLICY "Anyone can view HSN codes"
ON public.hsn_codes
FOR SELECT
TO authenticated
USING (true);

-- Create bill templates table
CREATE TABLE IF NOT EXISTS public.bill_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bill_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for bill_templates
CREATE POLICY "Users can view own templates"
ON public.bill_templates
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can insert templates"
ON public.bill_templates
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own templates"
ON public.bill_templates
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can delete own templates"
ON public.bill_templates
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Add trigger for updating updated_at
CREATE TRIGGER update_bill_templates_updated_at
BEFORE UPDATE ON public.bill_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add unit field to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'piece';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_hsn_codes_code ON public.hsn_codes(hsn_code);
CREATE INDEX IF NOT EXISTS idx_bill_templates_user ON public.bill_templates(created_by);