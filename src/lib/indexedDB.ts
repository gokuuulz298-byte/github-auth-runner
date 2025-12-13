import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_quantity: number;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

interface Invoice {
  id: string;
  bill_number: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  items_data: any;
  created_at: string;
  synced: boolean;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
}

interface BizScanDB extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { 'by-barcode': string };
  };
  invoices: {
    key: string;
    value: Invoice;
  };
}

let dbInstance: IDBPDatabase<BizScanDB> | null = null;

export const initDB = async () => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<BizScanDB>('biz-scan-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-barcode', 'barcode', { unique: true });
      }
      if (!db.objectStoreNames.contains('invoices')) {
        db.createObjectStore('invoices', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
};

// Products operations
export const saveProductsToIndexedDB = async (products: Product[]) => {
  const db = await initDB();
  const tx = db.transaction('products', 'readwrite');
  await Promise.all(products.map(product => tx.store.put(product)));
  await tx.done;
};

export const getProductByBarcode = async (barcode: string): Promise<Product | undefined> => {
  const db = await initDB();
  return db.getFromIndex('products', 'by-barcode', barcode);
};

export const getAllProducts = async (): Promise<Product[]> => {
  const db = await initDB();
  return db.getAll('products');
};

export const deleteProductFromIndexedDB = async (id: string) => {
  const db = await initDB();
  await db.delete('products', id);
};

// Invoices operations
export const saveInvoiceToIndexedDB = async (invoice: Invoice) => {
  const db = await initDB();
  await db.put('invoices', invoice);
};

export const getUnsyncedInvoices = async (): Promise<Invoice[]> => {
  const db = await initDB();
  const allInvoices = await db.getAll('invoices');
  return allInvoices.filter(inv => !inv.synced);
};

export const markInvoiceAsSynced = async (id: string) => {
  const db = await initDB();
  const invoice = await db.get('invoices', id);
  if (invoice) {
    invoice.synced = true;
    await db.put('invoices', invoice);
  }
};
