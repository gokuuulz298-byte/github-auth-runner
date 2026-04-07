import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { error: authErr } = await supabase.auth.signInWithPassword({ email:'test@gmail.com', password:'gokul123' });
if (authErr) { console.error("Auth:",authErr.message); process.exit(1); }
console.log("Auth OK");
const U = "df11547b-e3bd-44d2-8a01-48c7ba6b70e1";
const cats = ["Groceries","Electronics","Dairy","Snacks","Beverages","Fruits","Vegetables","Personal Care","Stationery","Cleaning"];
const sNames = ["Metro Wholesale","Star Distributors","Fresh Farm","Digital Hub","Clean Pro","Veggie Express","Snack World","Daily Needs","Paper Plus","Hygiene First"];
const fn = ["Arun","Priya","Karthik","Meena","Suresh","Lakshmi","Raj","Deepa","Vimal","Saroja","Ganesh","Kavitha","Mohan","Revathi","Siva"];
const ln = ["Kumar","Sharma","Rajan","Nair","Devi","Pillai","Murugan","Subramanian","Iyer","Rao"];

// Categories
let r = await supabase.from("categories").insert(cats.map(n=>({name:n,created_by:U})));
console.log("Categories:", r.error?.message||"10");

// Products 100
const prods = [];
for(let i=1;i<=100;i++){const c=cats[i%10];const p=+(20+Math.random()*480).toFixed(2);prods.push({barcode:`PRD${String(i).padStart(6,'0')}`,name:`${c} Item ${i}`,price:p,buying_price:+(p*(0.5+Math.random()*0.3)).toFixed(2),stock_quantity:Math.floor(Math.random()*200),tax_rate:[0,5,12,18][i%4],category:c,created_by:U,is_deleted:false,is_raw_material:false,low_stock_threshold:10,unit:"piece",price_type:"quantity"});}
r = await supabase.from("products").insert(prods);
console.log("Products:", r.error?.message||"100");

// Customers 80
const custs = [];
for(let i=1;i<=80;i++) custs.push({name:`${fn[i%15]} ${ln[i%10]} ${i}`,phone:`98${String(70000000+i).padStart(8,'0')}`,email:`${fn[i%15].toLowerCase()}${i}@test.com`,created_by:U});
r = await supabase.from("customers").insert(custs);
console.log("Customers:", r.error?.message||"80");

// Suppliers 20
const sups = [];
for(let i=1;i<=20;i++) sups.push({name:`${sNames[i%10]} ${i}`,phone:`99${String(80000000+i).padStart(8,'0')}`,email:`sup${i}@test.com`,address:`${i} Industrial Area`,gst_number:`33AABCT${1000+i}Q1Z${i%10}`,created_by:U,is_active:true});
r = await supabase.from("suppliers").insert(sups);
console.log("Suppliers:", r.error?.message||"20");

// Get products
const {data:pl} = await supabase.from("products").select("id,name,price,tax_rate").eq("created_by",U).eq("is_deleted",false).limit(100);

// Invoices 200 in 4 batches
for(let b=0;b<4;b++){const batch=[];for(let i=b*50+1;i<=(b+1)*50;i++){const items=[];let tot=0,tax=0;for(let j=0;j<1+Math.floor(Math.random()*4);j++){const p=pl[Math.floor(Math.random()*pl.length)];const q=1+Math.floor(Math.random()*5);const a=p.price*q;const t=a*(p.tax_rate/100);tot+=a+t;tax+=t;items.push({id:p.id,name:p.name,price:p.price,quantity:q,tax_rate:p.tax_rate,is_inclusive:false});}batch.push({bill_number:`INV-${String(i).padStart(4,'0')}`,total_amount:+tot.toFixed(2),tax_amount:+tax.toFixed(2),items_data:items,created_by:U,created_at:new Date(Date.now()-Math.floor(Math.random()*90)*86400000).toISOString()});}r=await supabase.from("invoices").insert(batch);if(r.error)console.log(`Inv batch ${b}:`,r.error.message);}
console.log("Invoices: 200");

// Expenses 60
const exCats=["Rent","Utilities","Salary","Transport","Maintenance","Marketing","Supplies"];
const exps=[];for(let i=1;i<=60;i++)exps.push({amount:+(500+Math.random()*9500).toFixed(2),category:exCats[i%7],description:`${exCats[i%7]} #${i}`,expense_date:new Date(Date.now()-Math.floor(Math.random()*60)*86400000).toISOString(),payment_mode:["cash","upi","card"][i%3],created_by:U});
r=await supabase.from("expenses").insert(exps);
console.log("Expenses:", r.error?.message||"60");

// Purchases 40
const purs=[];for(let i=1;i<=40;i++){const items=[];let tot=0;for(let j=0;j<1+Math.floor(Math.random()*3);j++){const p=pl[Math.floor(Math.random()*pl.length)];const q=5+Math.floor(Math.random()*50);const c=+(p.price*0.6).toFixed(2);tot+=c*q;items.push({product_id:p.id,name:p.name,quantity:q,unit_price:c});}purs.push({purchase_number:`PO-${String(i).padStart(4,'0')}`,supplier_name:sNames[i%10],supplier_phone:`99${String(80000000+(i%20)+1).padStart(8,'0')}`,total_amount:+tot.toFixed(2),paid_amount:i%3===0?+tot.toFixed(2):0,payment_status:i%3===0?"paid":"pending",status:["pending","received","cancelled"][i%3],items_data:items,created_by:U,created_at:new Date(Date.now()-Math.floor(Math.random()*60)*86400000).toISOString()});}
r=await supabase.from("purchases").insert(purs);
console.log("Purchases:", r.error?.message||"40");

// Inventory movements 50
const movs=[];for(let i=1;i<=50;i++){const p=pl[Math.floor(Math.random()*pl.length)];const q=1+Math.floor(Math.random()*20);const t=["in","out"][i%2];movs.push({product_id:p.id,product_name:p.name,quantity:q,movement_type:t,reference_type:t==="in"?"purchase":"sale",unit_price:p.price,total_value:+(p.price*q).toFixed(2),created_by:U,created_at:new Date(Date.now()-Math.floor(Math.random()*30)*86400000).toISOString()});}
r=await supabase.from("inventory_movements").insert(movs);
console.log("Movements:", r.error?.message||"50");

// Loyalty 30
const lps=[];for(let i=1;i<=30;i++)lps.push({customer_phone:`98${String(70000000+i).padStart(8,'0')}`,customer_name:`${fn[i%15]} ${ln[i%10]} ${i}`,points:Math.floor(Math.random()*500),total_spent:+(Math.random()*50000).toFixed(2),created_by:U});
r=await supabase.from("loyalty_points").insert(lps);
console.log("Loyalty:", r.error?.message||"30");

console.log("✅ Done! ~560 records");
await supabase.auth.signOut();
