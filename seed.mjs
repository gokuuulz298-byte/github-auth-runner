import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(url, key);

// Sign in as the test user
const { error: authErr } = await supabase.auth.signInWithPassword({
  email: 'test@gmail.com',
  password: 'gokul123'
});
if (authErr) { console.error("Auth error:", authErr); process.exit(1); }
console.log("Authenticated as test@gmail.com");

const USER_ID = "df11547b-e3bd-44d2-8a01-48c7ba6b70e1";
const categories = ["Groceries","Electronics","Dairy","Snacks","Beverages","Fruits","Vegetables","Personal Care","Stationery","Cleaning"];
const supplierNames = ["Metro Wholesale","Star Distributors","Fresh Farm Supplies","Digital Hub","Clean Pro Agency","Veggie Express","Snack World","Daily Needs Co","Paper Plus","Hygiene First"];
const firstNames = ["Arun","Priya","Karthik","Meena","Suresh","Lakshmi","Raj","Deepa","Vimal","Saroja","Ganesh","Kavitha","Mohan","Revathi","Siva"];
const lastNames = ["Kumar","Sharma","Rajan","Nair","Devi","Pillai","Murugan","Subramanian","Iyer","Rao"];

// 1. Categories
const catData = categories.map(name => ({ name, created_by: USER_ID }));
const { error: catErr } = await supabase.from("categories").insert(catData);
console.log("Categories:", catErr ? catErr.message : "10 done");

// 2. Products (100)
const products = [];
for (let i = 1; i <= 100; i++) {
  const cat = categories[i % categories.length];
  const price = Math.round((20 + Math.random() * 480) * 100) / 100;
  products.push({
    barcode: `PRD${String(i).padStart(6,'0')}`,
    name: `${cat} Item ${i}`,
    price,
    buying_price: Math.round(price * (0.5 + Math.random() * 0.3) * 100) / 100,
    stock_quantity: Math.floor(Math.random() * 200),
    tax_rate: [0,5,12,18][i%4],
    category: cat,
    created_by: USER_ID,
    is_deleted: false,
    is_raw_material: false,
    low_stock_threshold: 10,
    unit: "piece",
    price_type: "quantity"
  });
}
const { error: pErr } = await supabase.from("products").insert(products);
console.log("Products:", pErr ? pErr.message : "100 done");

// 3. Customers (80)
const custs = [];
for (let i = 1; i <= 80; i++) {
  custs.push({
    name: `${firstNames[i%15]} ${lastNames[i%10]} ${i}`,
    phone: `98${String(70000000+i).padStart(8,'0')}`,
    email: `${firstNames[i%15].toLowerCase()}${i}@test.com`,
    created_by: USER_ID
  });
}
const { error: cErr } = await supabase.from("customers").insert(custs);
console.log("Customers:", cErr ? cErr.message : "80 done");

// 4. Suppliers (20)
const sups = [];
for (let i = 1; i <= 20; i++) {
  sups.push({
    name: `${supplierNames[i%10]} ${i}`,
    phone: `99${String(80000000+i).padStart(8,'0')}`,
    email: `supplier${i}@test.com`,
    address: `${i} Industrial Area, Chennai`,
    gst_number: `33AABCT${1000+i}Q1Z${i%10}`,
    created_by: USER_ID,
    is_active: true
  });
}
const { error: sErr } = await supabase.from("suppliers").insert(sups);
console.log("Suppliers:", sErr ? sErr.message : "20 done");

// 5. Get products for invoices
const { data: prodList } = await supabase.from("products").select("id,name,price,tax_rate").eq("created_by", USER_ID).eq("is_deleted",false).limit(100);

// 6. Invoices (200)
for (let b = 0; b < 4; b++) {
  const batch = [];
  for (let i = b*50+1; i <= (b+1)*50; i++) {
    const items = [];
    let total = 0, tax = 0;
    for (let j = 0; j < 1+Math.floor(Math.random()*4); j++) {
      const p = prodList[Math.floor(Math.random()*prodList.length)];
      const q = 1+Math.floor(Math.random()*5);
      const a = p.price*q;
      const t = a*(p.tax_rate/100);
      total += a+t; tax += t;
      items.push({id:p.id,name:p.name,price:p.price,quantity:q,tax_rate:p.tax_rate,is_inclusive:false});
    }
    const d = new Date(Date.now()-Math.floor(Math.random()*90)*86400000);
    batch.push({
      bill_number: `INV-${String(i).padStart(4,'0')}`,
      total_amount: Math.round(total*100)/100,
      tax_amount: Math.round(tax*100)/100,
      items_data: items,
      created_by: USER_ID,
      created_at: d.toISOString()
    });
  }
  const { error } = await supabase.from("invoices").insert(batch);
  if (error) console.log(`Invoices batch ${b}:`, error.message);
}
console.log("Invoices: 200 done");

// 7. Expenses (60)
const expCats = ["Rent","Utilities","Salary","Transport","Maintenance","Marketing","Supplies"];
const exps = [];
for (let i = 1; i <= 60; i++) {
  exps.push({
    amount: Math.round((500+Math.random()*9500)*100)/100,
    category: expCats[i%7],
    description: `${expCats[i%7]} expense #${i}`,
    expense_date: new Date(Date.now()-Math.floor(Math.random()*60)*86400000).toISOString(),
    payment_mode: ["cash","upi","card"][i%3],
    created_by: USER_ID
  });
}
const { error: eErr } = await supabase.from("expenses").insert(exps);
console.log("Expenses:", eErr ? eErr.message : "60 done");

// 8. Purchases (40)
const purs = [];
for (let i = 1; i <= 40; i++) {
  const items = [];
  let total = 0;
  for (let j = 0; j < 1+Math.floor(Math.random()*3); j++) {
    const p = prodList[Math.floor(Math.random()*prodList.length)];
    const q = 5+Math.floor(Math.random()*50);
    const c = p.price*0.6;
    total += c*q;
    items.push({product_id:p.id,name:p.name,quantity:q,unit_price:Math.round(c*100)/100});
  }
  purs.push({
    purchase_number: `PO-${String(i).padStart(4,'0')}`,
    supplier_name: supplierNames[i%10],
    supplier_phone: `99${String(80000000+(i%20)+1).padStart(8,'0')}`,
    total_amount: Math.round(total*100)/100,
    paid_amount: i%3===0 ? Math.round(total*100)/100 : 0,
    payment_status: i%3===0 ? "paid" : "pending",
    status: ["pending","received","cancelled"][i%3],
    items_data: items,
    created_by: USER_ID,
    created_at: new Date(Date.now()-Math.floor(Math.random()*60)*86400000).toISOString()
  });
}
const { error: puErr } = await supabase.from("purchases").insert(purs);
console.log("Purchases:", puErr ? puErr.message : "40 done");

// 9. Inventory movements (50)
const movs = [];
for (let i = 1; i <= 50; i++) {
  const p = prodList[Math.floor(Math.random()*prodList.length)];
  const q = 1+Math.floor(Math.random()*20);
  const type = ["in","out"][i%2];
  movs.push({
    product_id:p.id, product_name:p.name, quantity:q,
    movement_type:type, reference_type:type==="in"?"purchase":"sale",
    unit_price:p.price, total_value:p.price*q,
    created_by:USER_ID,
    created_at: new Date(Date.now()-Math.floor(Math.random()*30)*86400000).toISOString()
  });
}
const { error: mErr } = await supabase.from("inventory_movements").insert(movs);
console.log("Movements:", mErr ? mErr.message : "50 done");

// 10. Loyalty points (30)
const lps = [];
for (let i = 1; i <= 30; i++) {
  lps.push({
    customer_phone: `98${String(70000000+i).padStart(8,'0')}`,
    customer_name: `${firstNames[i%15]} ${lastNames[i%10]} ${i}`,
    points: Math.floor(Math.random()*500),
    total_spent: Math.round(Math.random()*50000*100)/100,
    created_by: USER_ID
  });
}
const { error: lErr } = await supabase.from("loyalty_points").insert(lps);
console.log("Loyalty:", lErr ? lErr.message : "30 done");

console.log("✅ Seeding complete! ~560 records total");
await supabase.auth.signOut();
