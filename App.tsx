
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Store, BookOpen, BarChart3, Package, ShoppingCart, ClipboardList,
  Settings as SettingsIcon, Plus, ChevronRight, TrendingUp, Moon, Sun,
  Menu, X, Bell, ChevronLeft, LayoutDashboard, Activity, Users
} from 'lucide-react';
import { ShopType, Product, Sale, AppSettings, ToastNotification, HeldBill, StockAdjustment, SaleStatus, Customer, LedgerTransaction } from './types';
import { INITIAL_PRODUCTS, DEFAULT_SETTINGS } from './constants';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Reports from './components/Reports';
import CombinedDashboard from './components/CombinedDashboard';
import SettingsPanel from './components/Settings';
import Customers from './components/Customers';
import { ToastContainer, useToast } from './components/ui/Toast';
import ReceiptModal from './components/ReceiptModal';

type ActiveTab = 'DASHBOARD' | 'INVENTORY' | 'SALES' | 'CUSTOMERS' | 'REPORTS' | 'SETTINGS';

const App: React.FC = () => {
  const [currentShop, setCurrentShop] = useState<ShopType | 'COMBINED' | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledgerTransactions, setLedgerTransactions] = useState<LedgerTransaction[]>([]);
  const [stockHistory, setStockHistory] = useState<StockAdjustment[]>([]);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [preSelectedProductId, setPreSelectedProductId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lastSaleForReceipt, setLastSaleForReceipt] = useState<Sale | null>(null);
  const [pinLocked, setPinLocked] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const toast = useToast(setToasts);

  // Load all data from localStorage
  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem('shop_products');
      const savedSales = localStorage.getItem('shop_sales');
      const savedCustomers = localStorage.getItem('shop_customers');
      const savedLedger = localStorage.getItem('shop_ledger');
      const savedSettings = localStorage.getItem('shop_settings');
      const savedHistory = localStorage.getItem('shop_stock_history');
      const savedHeldBills = localStorage.getItem('shop_held_bills');

      if (savedProducts) setProducts(JSON.parse(savedProducts));
      else setProducts(INITIAL_PRODUCTS);

      if (savedSales) setSales(JSON.parse(savedSales));
      if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
      if (savedLedger) setLedgerTransactions(JSON.parse(savedLedger));
      if (savedHistory) setStockHistory(JSON.parse(savedHistory));
      if (savedHeldBills) setHeldBills(JSON.parse(savedHeldBills));

      if (savedSettings) {
        const s = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...s });
        // Apply theme
        if (s.theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        // PIN lock
        if (s.pinLock) setPinLocked(true);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
    setDataLoaded(true);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!dataLoaded) return;
    if (products.length > 0) localStorage.setItem('shop_products', JSON.stringify(products));
  }, [products, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('shop_sales', JSON.stringify(sales));
  }, [sales, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('shop_stock_history', JSON.stringify(stockHistory));
  }, [stockHistory, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('shop_customers', JSON.stringify(customers));
  }, [customers, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('shop_ledger', JSON.stringify(ledgerTransactions));
  }, [ledgerTransactions, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('shop_held_bills', JSON.stringify(heldBills));
  }, [heldBills, dataLoaded]);

  // Theme
  useEffect(() => {
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.theme]);

  const saveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('shop_settings', JSON.stringify(newSettings));
  }, []);

  const handleAddSale = (newSale: Sale): boolean => {
    for (const item of newSale.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity) return false;
    }

    // Increment invoice counter
    saveSettings({ ...settings, invoiceCounter: settings.invoiceCounter + 1 });

    setSales(prev => [newSale, ...prev]);

    // Deduct stock + log history
    setProducts(prev => prev.map(product => {
      const saleItem = newSale.items.find(i => i.productId === product.id);
      if (!saleItem) return product;
      return { ...product, stock: product.stock - saleItem.quantity };
    }));

    const historyEntries: StockAdjustment[] = newSale.items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      return {
        id: Math.random().toString(36).substr(2, 9),
        productId: item.productId,
        productName: item.productName,
        shopType: newSale.shopType,
        type: 'SALE',
        quantityBefore: product.stock,
        quantityChange: -item.quantity,
        quantityAfter: product.stock - item.quantity,
        notes: `Sale #${newSale.invoiceNumber || newSale.id}`,
        timestamp: newSale.timestamp,
      };
    });
    setStockHistory(prev => [...historyEntries, ...prev]);
    setLastSaleForReceipt(newSale);
    return true;
  };

  const handleAddCustomer = (newCustomer: Customer) => {
    setCustomers(prev => [newCustomer, ...prev]);
  };

  const handleRecordPayment = (customerId: string, amount: number, notes?: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Add payment transaction
    const trans: LedgerTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      customerId,
      amount: -amount, // Negative because it reduces debt
      type: 'PAYMENT',
      notes,
      timestamp: Date.now()
    };
    setLedgerTransactions(prev => [trans, ...prev]);

    // Reduce debt
    setCustomers(prev => prev.map(c => 
      c.id === customerId ? { ...c, totalDebt: Math.max(0, c.totalDebt - amount) } : c
    ));
    
    toast.success(`Payment of ${settings.currencySymbol}${amount.toLocaleString()} recorded successfully!`);
  };

  const handleAddProduct = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
    const histEntry: StockAdjustment = {
      id: Math.random().toString(36).substr(2, 9),
      productId: newProduct.id,
      productName: newProduct.name,
      shopType: newProduct.shopType,
      type: 'INITIAL',
      quantityBefore: 0,
      quantityChange: newProduct.stock,
      quantityAfter: newProduct.stock,
      notes: 'Initial stock',
      timestamp: Date.now(),
    };
    if (newProduct.stock > 0) setStockHistory(prev => [histEntry, ...prev]);
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleStockAdjust = (adj: StockAdjustment) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== adj.productId) return p;
      return { ...p, stock: Math.max(0, adj.quantityAfter) };
    }));
    setStockHistory(prev => [adj, ...prev]);
  };

  const handleHoldBill = (bill: HeldBill) => {
    setHeldBills(prev => [bill, ...prev]);
  };

  const handleRecallBill = (id: string) => {
    setHeldBills(prev => prev.filter(b => b.id !== id));
  };

  const handleExportData = () => {
    const data = { products, sales, stockHistory, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bizledger_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exported successfully!');
  };

  const handleImportData = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.products) setProducts(data.products);
      if (data.sales) setSales(data.sales);
      if (data.stockHistory) setStockHistory(data.stockHistory);
      if (data.settings) saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      toast.success('Data imported successfully!');
    } catch {
      toast.error('Failed to import data. Invalid file.');
    }
  };

  const handleClearData = () => {
    setProducts(INITIAL_PRODUCTS);
    setSales([]);
    setCustomers([]);
    setLedgerTransactions([]);
    setStockHistory([]);
    setHeldBills([]);
    localStorage.removeItem('shop_products');
    localStorage.removeItem('shop_sales');
    localStorage.removeItem('shop_customers');
    localStorage.removeItem('shop_ledger');
    localStorage.removeItem('shop_stock_history');
    localStorage.removeItem('shop_held_bills');
    toast.warning('All data cleared.');
  };

  const goToSales = (productId?: string) => {
    if (productId) setPreSelectedProductId(productId);
    setActiveTab('SALES');
  };

  const isBlue = currentShop === ShopType.STATIONERY;
  const accent = isBlue ? 'blue' : currentShop === ShopType.GENERAL_STORE ? 'emerald' : 'indigo';

  // PIN Lock Screen
  if (pinLocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-800 rounded-3xl p-10 w-full max-w-sm shadow-2xl text-center border border-slate-700">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Store size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white mb-1">{settings.businessName}</h2>
          <p className="text-slate-400 text-sm mb-8">Enter your PIN to continue</p>
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pinEntry.length ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'DEL'].map((k, idx) => (
              <button key={idx} disabled={k === ''}
                onClick={() => {
                  if (k === 'DEL') { setPinEntry(p => p.slice(0, -1)); setPinError(false); return; }
                  if (typeof k !== 'number') return;
                  const next = pinEntry + k;
                  setPinEntry(next);
                  if (next.length === 4) {
                    if (next === settings.pinLock) { setPinLocked(false); setPinEntry(''); }
                    else { setPinError(true); setTimeout(() => { setPinEntry(''); setPinError(false); }, 700); }
                  }
                }}
                className={`h-14 rounded-2xl text-xl font-bold transition-all active:scale-95 ${k === '' ? 'invisible' : `${pinError ? 'bg-rose-800 text-rose-200' : 'bg-slate-700 text-white hover:bg-slate-600'}`}`}
              >{k === 'DEL' ? '⌫' : k}</button>
            ))}
          </div>
          {pinError && <p className="text-rose-400 text-sm font-semibold animate-bounce-in">Incorrect PIN</p>}
        </div>
      </div>
    );
  }

  // Landing Page
  if (currentShop === null) {
    return (
      <div className={`min-h-screen ${settings.theme === 'dark' ? 'dark bg-slate-950' : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50'} flex flex-col items-center justify-center p-6`}>
        <ToastContainer toasts={toasts} onDismiss={toast.dismiss} />
        <div className="max-w-4xl w-full">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl mb-5 shadow-2xl shadow-indigo-200 dark:shadow-none">
              <Store size={40} className="text-white" />
            </div>
            <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-2">
              {settings.businessName}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Professional Retail Management Platform</p>
          </div>

          {/* Shop Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {/* Stationery */}
            <button
              onClick={() => { setCurrentShop(ShopType.STATIONERY); setActiveTab('DASHBOARD'); }}
              className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-100 dark:hover:shadow-none transition-all duration-500 border border-slate-200 dark:border-slate-700 overflow-hidden hover:-translate-y-1 text-left"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                <BookOpen size={120} className="text-blue-600" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-blue-600/0 group-hover:from-blue-600/5 group-hover:to-indigo-600/5 transition-all duration-500 rounded-3xl" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-5 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <BookOpen size={28} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Stationery Shop</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Pens, registers, markers, and quantity-based items.</p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-bold text-sm mt-5 group-hover:gap-2 transition-all">
                  Enter Shop <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* General Store */}
            <button
              onClick={() => { setCurrentShop(ShopType.GENERAL_STORE); setActiveTab('DASHBOARD'); }}
              className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:shadow-emerald-100 dark:hover:shadow-none transition-all duration-500 border border-slate-200 dark:border-slate-700 overflow-hidden hover:-translate-y-1 text-left"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                <Store size={120} className="text-emerald-600" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/0 to-emerald-600/0 group-hover:from-emerald-600/5 group-hover:to-teal-600/5 transition-all duration-500 rounded-3xl" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-5 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                  <Store size={28} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">General Store</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Groceries, weight-based items, and KG calculations.</p>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-sm mt-5">
                  Enter Shop <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* Combined */}
            <button
              onClick={() => { setCurrentShop('COMBINED'); setActiveTab('DASHBOARD'); }}
              className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 dark:hover:shadow-none transition-all duration-500 border border-slate-200 dark:border-slate-700 overflow-hidden hover:-translate-y-1 text-left"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                <BarChart3 size={120} className="text-indigo-600" />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-5 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <BarChart3 size={28} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Combined View</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Analytics & performance across all shops.</p>
                <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-bold text-sm mt-5">
                  View Analytics <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
              <p className="text-2xl font-black text-slate-900 dark:text-white">{products.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Products</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
              <p className="text-2xl font-black text-slate-900 dark:text-white">{sales.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Sales</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
              <p className="text-2xl font-black text-slate-900 dark:text-white">{settings.currencySymbol}{sales.reduce((a, s) => a + s.totalAmount, 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Revenue</p>
            </div>
          </div>

          {/* Theme toggle */}
          <div className="flex justify-center mt-8">
            <button
              onClick={() => saveSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App
  const shopProducts = currentShop !== 'COMBINED' ? products.filter(p => p.shopType === currentShop) : products;
  const shopSales = currentShop !== 'COMBINED' ? sales.filter(s => s.shopType === currentShop) : sales;

  const navItems = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Dashboard' },
    ...(currentShop !== 'COMBINED' ? [
      { id: 'INVENTORY', icon: Package, label: 'Inventory' },
      { id: 'SALES', icon: ShoppingCart, label: 'Point of Sale' },
      { id: 'CUSTOMERS', icon: Users, label: 'Customers & Ledger' },
    ] : []),
    { id: 'REPORTS', icon: ClipboardList, label: 'Reports' },
    { id: 'SETTINGS', icon: SettingsIcon, label: 'Settings' },
  ];

  const renderContent = () => {
    if (currentShop === 'COMBINED') {
      if (activeTab === 'SETTINGS') return (
        <SettingsPanel settings={settings} onSave={saveSettings} onExportData={handleExportData} onImportData={handleImportData} onClearData={handleClearData} onToast={(msg, type) => { if (type === 'success') toast.success(msg); else if (type === 'error') toast.error(msg); else if (type === 'warning') toast.warning(msg); else toast.info(msg); }} />
      );
      if (activeTab === 'REPORTS') return <Reports sales={sales} shopType="COMBINED" settings={settings} />;
      return <CombinedDashboard products={products} sales={sales} settings={settings} />;
    }

    switch (activeTab) {
      case 'DASHBOARD':
        return <Dashboard shopType={currentShop} products={shopProducts} sales={shopSales} onNewSale={() => setActiveTab('SALES')} settings={settings} onGoToInventory={() => setActiveTab('INVENTORY')} />;
      case 'INVENTORY':
        return (
          <Inventory
            shopType={currentShop} products={shopProducts}
            onAdd={handleAddProduct} onUpdate={handleUpdateProduct} onDelete={handleDeleteProduct}
            onSell={goToSales} onStockAdjust={handleStockAdjust}
            stockHistory={stockHistory.filter(h => h.shopType === currentShop)}
            settings={settings}
            onToast={(msg, type) => { if (type === 'success') toast.success(msg); else if (type === 'error') toast.error(msg); else if (type === 'warning') toast.warning(msg); else toast.info(msg); }}
          />
        );
      case 'SALES':
        return (
          <Sales
            shopType={currentShop} products={shopProducts} onSale={handleAddSale}
            initialProductId={preSelectedProductId} onClearInitial={() => setPreSelectedProductId(null)}
            settings={settings} heldBills={heldBills} onHoldBill={handleHoldBill} onRecallBill={handleRecallBill}
            customers={customers} onAddCustomer={handleAddCustomer} onAddLedgerTransaction={(tx) => setLedgerTransactions(prev => [tx, ...prev])}
            onUpdateCustomerDebt={(id, amount) => setCustomers(prev => prev.map(c => c.id === id ? { ...c, totalDebt: c.totalDebt + amount } : c))}
            onToast={(msg, type) => { if (type === 'success') toast.success(msg); else if (type === 'error') toast.error(msg); else if (type === 'warning') toast.warning(msg); else toast.info(msg); }}
          />
        );
      case 'CUSTOMERS':
        return (
          <Customers
            customers={customers}
            ledgerTransactions={ledgerTransactions}
            settings={settings}
            onAddCustomer={handleAddCustomer}
            onRecordPayment={handleRecordPayment}
          />
        );
      case 'REPORTS':
        return <Reports sales={shopSales} shopType={currentShop} settings={settings} />;
      case 'SETTINGS':
        return (
          <SettingsPanel settings={settings} onSave={saveSettings} onExportData={handleExportData} onImportData={handleImportData} onClearData={handleClearData}
            onToast={(msg, type) => { if (type === 'success') toast.success(msg); else if (type === 'error') toast.error(msg); else if (type === 'warning') toast.warning(msg); else toast.info(msg); }}
          />
        );
      default: return null;
    }
  };

  const accentColors: Record<string, { bg: string; active: string; btn: string; headerBg: string }> = {
    blue: { bg: 'bg-blue-600', active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', btn: 'bg-blue-600 hover:bg-blue-700', headerBg: 'bg-white/80 dark:bg-slate-900/80' },
    emerald: { bg: 'bg-emerald-600', active: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-700', headerBg: 'bg-white/80 dark:bg-slate-900/80' },
    indigo: { bg: 'bg-indigo-600', active: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-700', headerBg: 'bg-white/80 dark:bg-slate-900/80' },
  };
  const ac = accentColors[accent];

  const tabLabels: Record<string, string> = {
    DASHBOARD: 'Dashboard', INVENTORY: 'Inventory', SALES: 'Point of Sale', CUSTOMERS: 'Customers & Ledger', REPORTS: 'Reports', SETTINGS: 'Settings',
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-theme">
      <ToastContainer toasts={toasts} onDismiss={toast.dismiss} />

      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-[70px]' : 'w-[240px]'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 z-20 shrink-0`}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 min-h-[64px]">
          <div
            className={`${ac.bg} w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 cursor-pointer hover:opacity-90 transition-opacity`}
            onClick={() => setCurrentShop(null)}
          >
            {currentShop === ShopType.STATIONERY ? <BookOpen size={18} /> : currentShop === ShopType.GENERAL_STORE ? <Store size={18} /> : <BarChart3 size={18} />}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setCurrentShop(null)}>
              <p className="font-black text-slate-900 dark:text-white text-sm truncate">{settings.businessName}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {currentShop === ShopType.STATIONERY ? 'Stationery Shop' : currentShop === ShopType.GENERAL_STORE ? 'General Store' : 'All Shops'}
              </p>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(c => !c)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0 transition-colors">
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${isActive ? ac.active + ' font-semibold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <item.icon size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom: theme + back */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <button
            onClick={() => saveSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            title={sidebarCollapsed ? 'Toggle theme' : undefined}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm`}
          >
            {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {!sidebarCollapsed && <span>{settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button
            onClick={() => setCurrentShop(null)}
            title={sidebarCollapsed ? 'Switch Shop' : undefined}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-sm`}
          >
            <Store size={18} />
            {!sidebarCollapsed && <span>Switch Shop</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">
              {currentShop === 'COMBINED' ? 'Combined View' : currentShop?.replace('_', ' ')}
            </p>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">{tabLabels[activeTab]}</h1>
          </div>
          <div className="flex items-center gap-3">
            {currentShop !== 'COMBINED' && currentShop !== null && activeTab !== 'SALES' && (
              <button
                onClick={() => setActiveTab('SALES')}
                className={`hidden md:flex items-center gap-2 ${ac.btn} text-white px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95`}
              >
                <Plus size={16} />New Sale
              </button>
            )}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2">
              <div className={`w-6 h-6 rounded-full ${ac.bg} flex items-center justify-center text-white text-[10px] font-black`}>A</div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden md:block">Admin</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </main>

      {/* Receipt modal after sale */}
      {lastSaleForReceipt && (
        <ReceiptModal sale={lastSaleForReceipt} settings={settings} onClose={() => setLastSaleForReceipt(null)} />
      )}
    </div>
  );
};

export default App;
