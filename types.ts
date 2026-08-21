
export enum ShopType {
  STATIONERY = 'STATIONERY',
  GENERAL_STORE = 'GENERAL_STORE',
}

export enum UnitType {
  UNIT = 'UNIT',
  KG = 'KG',
}

export enum PaymentMode {
  CASH = 'CASH',
  DIGITAL = 'DIGITAL',
  CREDIT = 'CREDIT',
}

export enum SaleStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  CREDIT = 'CREDIT',
}

export interface Product {
  id: string;
  shopType: ShopType;
  name: string;
  category: string;
  sku: string;
  purchasePrice: number;
  sellingPrice: number;
  unitType: UnitType;
  stock: number;
  lowStockThreshold: number;
  imageBase64?: string;
  description?: string;
  supplier?: string;
  createdAt?: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number; // For KG this can be 0.25, etc.
  unitPrice: number;
  subtotal: number;
  discount?: number; // Per-item discount amount
  unitType?: UnitType;
}

export interface Sale {
  id: string;
  shopType: ShopType;
  timestamp: number;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMode: PaymentMode;
  totalProfit: number;
  discount?: number;        // Global discount applied to total
  tax?: number;             // Tax amount applied
  taxRate?: number;         // Tax percentage used
  notes?: string;
  receivedAmount?: number;  // Amount received from customer
  changeAmount?: number;    // Change given back
  status?: SaleStatus;      // PAID / PARTIAL / CREDIT
  invoiceNumber?: string;   // Human-readable invoice #
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  shopType: ShopType;
  type: 'ADD' | 'SALE' | 'ADJUST' | 'INITIAL';
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  notes?: string;
  timestamp: number;
}

export interface HeldBill {
  id: string;
  shopType: ShopType;
  items: SaleItem[];
  customerName: string;
  customerPhone: string;
  timestamp: number;
  label?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalDebt: number; // Positive means they owe the store money
  createdAt: number;
}

export interface LedgerTransaction {
  id: string;
  customerId: string;
  amount: number; // Positive if adding debt (sale), negative if paying off debt
  type: 'SALE_DEBT' | 'PAYMENT' | 'ADJUSTMENT';
  referenceId?: string; // e.g. Sale ID
  notes?: string;
  timestamp: number;
}

export interface AppSettings {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  currencySymbol: string;
  taxRate: number;
  taxEnabled: boolean;
  defaultLowStockThreshold: number;
  theme: 'light' | 'dark';
  pinLock: string | null;
  invoiceCounter: number;
  autoBackupInterval: number; // Number of sales between auto-backups
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface AppState {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  ledgerTransactions: LedgerTransaction[];
  currentShop: ShopType | 'COMBINED';
}

export const DATA_VERSION = 2;
