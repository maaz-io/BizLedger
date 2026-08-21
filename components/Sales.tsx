
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, User, CreditCard, Banknote,
  CheckCircle2, AlertCircle, XCircle, Tag, Percent, Save, RotateCcw,
  Phone, Receipt, Calculator, Hash, ChevronRight
} from 'lucide-react';
import { Product, ShopType, UnitType, Sale, SaleItem, PaymentMode, SaleStatus, HeldBill, Customer, LedgerTransaction } from '../types';
import { AppSettings } from '../types';

interface SalesProps {
  shopType: ShopType;
  products: Product[];
  onSale: (s: Sale) => boolean;
  initialProductId?: string | null;
  onClearInitial?: () => void;
  settings: AppSettings;
  heldBills: HeldBill[];
  onHoldBill: (bill: HeldBill) => void;
  onRecallBill: (id: string) => void;
  customers: Customer[];
  onAddCustomer: (c: Customer) => void;
  onAddLedgerTransaction: (tx: LedgerTransaction) => void;
  onUpdateCustomerDebt: (customerId: string, amount: number) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const Sales: React.FC<SalesProps> = ({
  shopType, products, onSale, initialProductId, onClearInitial,
  settings, heldBills, onHoldBill, onRecallBill,
  customers, onAddCustomer, onAddLedgerTransaction, onUpdateCustomerDebt,
  onToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState<{ id?: string; name: string; phone: string }>({ name: '', phone: '' });
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [saleStatus, setSaleStatus] = useState<SaleStatus>(SaleStatus.PAID);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [stockWarning, setStockWarning] = useState<{ name: string; available: number; unit: string } | null>(null);
  const [weightInput, setWeightInput] = useState<{ productId: string; value: string } | null>(null);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { currencySymbol } = settings;
  const isBlue = shopType === ShopType.STATIONERY;

  // Keyboard shortcut: / focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Handle shortcut from Inventory
  useEffect(() => {
    if (initialProductId) {
      const product = products.find(p => p.id === initialProductId);
      if (product) addToCart(product);
      onClearInitial?.();
    }
  }, [initialProductId]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products.filter(p => p.stock > 0).slice(0, 16);
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, products]);

  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock <= 0) {
      setStockWarning({ name: product.name, available: 0, unit: product.unitType });
      return;
    }
    if (product.unitType === UnitType.KG) {
      setWeightInput({ productId: product.id, value: '' });
      return;
    }
    const addQty = Math.floor(quantity);
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      const currentQty = existing?.quantity || 0;
      if (currentQty + addQty > product.stock) {
        setStockWarning({ name: product.name, available: product.stock, unit: product.unitType });
        return prev;
      }
      if (existing) {
        return prev.map(i => i.productId === product.id
          ? { ...i, quantity: i.quantity + addQty, subtotal: Number(((i.quantity + addQty) * i.unitPrice).toFixed(2)) }
          : i
        );
      }
      return [...prev, { productId: product.id, productName: product.name, quantity: addQty, unitPrice: product.sellingPrice, subtotal: Number((product.sellingPrice * addQty).toFixed(2)), unitType: product.unitType }];
    });
    setSearchTerm('');
  };

  const handleWeightConfirm = (weight: number) => {
    const product = products.find(p => p.id === weightInput?.productId);
    if (product && weight > 0) {
      if (weight > product.stock) {
        setStockWarning({ name: product.name, available: product.stock, unit: product.unitType });
        setWeightInput(null);
        return;
      }
      setCart(prev => {
        const existing = prev.find(i => i.productId === product.id);
        if (existing) {
          const newQty = existing.quantity + weight;
          if (newQty > product.stock) {
            setStockWarning({ name: product.name, available: product.stock, unit: product.unitType });
            return prev;
          }
          return prev.map(i => i.productId === product.id ? { ...i, quantity: newQty, subtotal: Number((newQty * i.unitPrice).toFixed(2)) } : i);
        }
        return [...prev, { productId: product.id, productName: product.name, quantity: weight, unitPrice: product.sellingPrice, subtotal: Number((weight * product.sellingPrice).toFixed(2)), unitType: product.unitType }];
      });
    }
    setWeightInput(null);
    setSearchTerm('');
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId !== productId) return item;
        const product = products.find(p => p.id === productId);
        const newQty = item.unitType === UnitType.KG
          ? Math.max(0.001, Number((item.quantity + delta).toFixed(3)))
          : Math.max(1, item.quantity + delta);
        if (product && newQty > product.stock) {
          setStockWarning({ name: item.productName, available: product.stock, unit: item.unitType || UnitType.UNIT });
          return item;
        }
        return { ...item, quantity: newQty, subtotal: Number((newQty * item.unitPrice).toFixed(2)) };
      }).filter(i => i.quantity > 0);
    });
  };

  const applyItemDiscount = (productId: string, discount: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const discounted = Math.max(0, item.quantity * item.unitPrice - discount);
      return { ...item, discount, subtotal: Number(discounted.toFixed(2)) };
    }));
  };

  const subtotal = useMemo(() => cart.reduce((acc, i) => acc + i.subtotal, 0), [cart]);
  const taxAmount = settings.taxEnabled ? Number((subtotal * settings.taxRate / 100).toFixed(2)) : 0;
  const total = Math.max(0, subtotal - globalDiscount + taxAmount);
  const receivedNum = parseFloat(receivedAmount) || 0;
  const change = receivedNum > 0 ? Math.max(0, receivedNum - total) : 0;

  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const held: HeldBill = {
      id: Math.random().toString(36).substr(2, 9),
      shopType,
      items: [...cart],
      customerName: customer.name,
      customerPhone: customer.phone,
      timestamp: Date.now(),
      label: customer.name || `Bill #${Date.now().toString().slice(-4)}`,
    };
    onHoldBill(held);
    setCart([]);
    setCustomer({ name: '', phone: '' });
    onToast('Bill held! You can recall it anytime.', 'info');
  };

  const handleRecall = (bill: HeldBill) => {
    setCart(bill.items);
    setCustomer({ name: bill.customerName, phone: bill.customerPhone });
    onRecallBill(bill.id);
    setShowHeldBills(false);
    onToast('Bill recalled!', 'success');
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      if (!product || item.quantity > product.stock) {
        setStockWarning({ name: item.productName, available: product?.stock || 0, unit: item.unitType || UnitType.UNIT });
        return;
      }
    }
    const totalProfit = cart.reduce((acc, item) => {
      const product = products.find(p => p.id === item.productId);
      return acc + ((product?.sellingPrice || 0) - (product?.purchasePrice || 0)) * item.quantity;
    }, 0);

    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      invoiceNumber: String(settings.invoiceCounter).padStart(5, '0'),
      shopType,
      timestamp: Date.now(),
      customerName: customer.name,
      customerPhone: customer.phone,
      items: cart,
      totalAmount: total,
      paymentMode,
      totalProfit: Math.max(0, totalProfit - globalDiscount),
      discount: globalDiscount,
      tax: taxAmount,
      taxRate: settings.taxEnabled ? settings.taxRate : 0,
      notes: saleNotes,
      receivedAmount: paymentMode === PaymentMode.CREDIT ? 0 : (receivedNum || undefined),
      changeAmount: change || undefined,
      status: paymentMode === PaymentMode.CREDIT ? SaleStatus.CREDIT : (receivedNum < total ? SaleStatus.PARTIAL : SaleStatus.PAID),
    };

    const debtAmount = paymentMode === PaymentMode.CREDIT ? total : Math.max(0, total - receivedNum);

    if (debtAmount > 0) {
      if (!customer.name.trim()) {
        onToast('Please enter customer name for Udhaar (Credit) sales.', 'warning');
        return;
      }
      let cid = customer.id;
      if (!cid) {
        const existing = customers.find(c => c.name.toLowerCase() === customer.name.trim().toLowerCase());
        if (existing) {
          cid = existing.id;
        } else {
          cid = Math.random().toString(36).substr(2, 9);
          onAddCustomer({ id: cid, name: customer.name.trim(), phone: customer.phone.trim(), totalDebt: 0, createdAt: Date.now() });
        }
      }
      onUpdateCustomerDebt(cid, debtAmount);
      onAddLedgerTransaction({
        id: Math.random().toString(36).substr(2, 9),
        customerId: cid,
        amount: debtAmount,
        type: 'SALE_DEBT',
        referenceId: newSale.id,
        notes: `Udhaar for Sale #${newSale.invoiceNumber}`,
        timestamp: newSale.timestamp,
      });
    }

    const ok = onSale(newSale);
    if (ok) {
      setLastSale(newSale);
      setCart([]);
      setCustomer({ name: '', phone: '' });
      setGlobalDiscount(0);
      setReceivedAmount('');
      setSaleNotes('');
      setShowCheckoutSuccess(true);
      setTimeout(() => setShowCheckoutSuccess(false), 4000);
    } else {
      onToast('Sale failed due to a stock issue. Please review cart.', 'error');
    }
  };

  const shopHeldBills = heldBills.filter(b => b.shopType === shopType);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full animate-fade-in">
      {/* Left: Product Grid */}
      <div className="xl:col-span-8 space-y-5">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Choose Items</h3>
            <div className="flex items-center gap-2 flex-1 sm:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  ref={searchRef}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                  placeholder="Search or type SKU... (press /)"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <XCircle size={14} />
                  </button>
                )}
              </div>
              {shopHeldBills.length > 0 && (
                <button onClick={() => setShowHeldBills(true)} className="relative flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-bold hover:bg-amber-100 transition-colors">
                  <RotateCcw size={15} />
                  <span className="hidden sm:inline">Recalled</span>
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">{shopHeldBills.length}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className={`p-3.5 bg-white dark:bg-slate-700/50 border rounded-2xl text-left group flex flex-col justify-between relative overflow-hidden transition-all ${
                  p.stock > 0
                    ? `border-slate-200 dark:border-slate-600 hover:border-${isBlue ? 'blue' : 'emerald'}-500 hover:shadow-md`
                    : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed grayscale opacity-60'
                }`}
              >
                {p.stock <= 0 && <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded">OUT</div>}
                {p.stock > 0 && p.stock <= p.lowStockThreshold && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" title="Low stock" />}
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight line-clamp-2">{p.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.stock > 0 ? `${p.stock.toFixed(p.unitType === UnitType.KG ? 2 : 0)} ${p.unitType}` : 'None left'}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`font-black text-base ${isBlue ? 'text-blue-600' : 'text-emerald-600'}`}>{currencySymbol}{p.sellingPrice}</span>
                  {p.stock > 0 && <div className={`p-1 rounded-lg ${isBlue ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'} transition-colors`}><Plus size={14} /></div>}
                </div>
              </button>
            ))}
          </div>
          {searchTerm && filteredProducts.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Search size={36} className="mx-auto mb-2 opacity-20" />
              <p>No product found for "{searchTerm}"</p>
              <button onClick={() => setSearchTerm('')} className="mt-2 text-blue-500 font-bold text-sm">Show all</button>
            </div>
          )}
        </div>

        {/* Cart Detail (inline on large screens for reference) */}
        {cart.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm xl:hidden">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm">Cart ({cart.length} items)</h4>
            <div className="space-y-2">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.productName}</p>
                    <p className="text-[11px] text-slate-400">{currencySymbol}{item.unitPrice} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateCartQty(item.productId, item.unitType === UnitType.KG ? -0.1 : -1)} className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center"><Minus size={10} /></button>
                    <span className="text-xs font-black w-8 text-center dark:text-white">{item.quantity.toFixed(item.unitType === UnitType.KG ? 2 : 0)}</span>
                    <button onClick={() => updateCartQty(item.productId, item.unitType === UnitType.KG ? 0.1 : 1)} className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center"><Plus size={10} /></button>
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300 w-16 text-right">{currencySymbol}{item.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Bill Panel */}
      <div className="xl:col-span-4 flex flex-col space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          {/* Bill header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
              <ShoppingCart size={18} className={isBlue ? 'text-blue-600' : 'text-emerald-600'} />
              Bill ({cart.length})
            </h3>
            <div className="flex items-center gap-1.5">
              <button onClick={handleHoldBill} disabled={cart.length === 0} title="Hold Bill" className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl disabled:opacity-30 transition-colors">
                <Save size={16} />
              </button>
              <button onClick={() => setCart([])} disabled={cart.length === 0} title="Clear Bill" className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl disabled:opacity-30 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto max-h-[300px] px-4 py-3 space-y-2 min-h-[120px]">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-slate-300 dark:text-slate-600">
                <ShoppingCart size={32} className="mb-2" />
                <p className="text-sm">Bill is empty</p>
                <p className="text-xs mt-0.5">Click products to add</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl group">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.productName}</p>
                    <p className="text-[11px] text-slate-400">{currencySymbol}{item.unitPrice}/{item.unitType === UnitType.KG ? 'kg' : 'unit'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateCartQty(item.productId, item.unitType === UnitType.KG ? -0.25 : -1)} className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-rose-100 transition-colors"><Minus size={10} /></button>
                    <span className="text-xs font-black w-10 text-center dark:text-white">{item.quantity.toFixed(item.unitType === UnitType.KG ? 2 : 0)}</span>
                    <button onClick={() => updateCartQty(item.productId, item.unitType === UnitType.KG ? 0.25 : 1)} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isBlue ? 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200' : 'bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200'}`}><Plus size={10} /></button>
                  </div>
                  <span className="font-black text-xs text-slate-700 dark:text-slate-300 w-16 text-right">{currencySymbol}{item.subtotal.toFixed(2)}</span>
                  <button onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-0.5">
                    <XCircle size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Totals & Controls */}
          <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-semibold">{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>

            {/* Global Discount */}
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-500 w-20">Discount</span>
              <input
                type="number" min={0} step={1}
                className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 dark:text-white text-right"
                value={globalDiscount || ''}
                onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            {/* Tax */}
            {settings.taxEnabled && (
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><Percent size={11} />Tax ({settings.taxRate}%)</span>
                <span className="font-semibold">+{currencySymbol}{taxAmount.toFixed(2)}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-3">
              <span className="text-base font-bold text-slate-500 dark:text-slate-400">Total</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{currencySymbol}{total.toFixed(2)}</span>
            </div>

            {/* Change Calculator */}
            {paymentMode === PaymentMode.CASH && (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Calculator size={13} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Received Amount</span>
                </div>
                <input
                  type="number" min={0} step={1}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-right"
                  value={receivedAmount}
                  onChange={e => setReceivedAmount(e.target.value)}
                  placeholder={`Enter amount received`}
                />
                {receivedNum > 0 && (
                  <div className={`flex justify-between text-sm font-black px-1 ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <span>Change Due</span>
                    <span>{currencySymbol}{change.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Customer */}
            <div className="space-y-2 relative">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <User size={12} /> Customer
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    placeholder="Name"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
                    value={customer.name}
                    onChange={e => {
                      setCustomer({ id: undefined, name: e.target.value, phone: '' });
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  />
                  {showCustomerDropdown && customers.length > 0 && customer.name && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                      {customers.filter(c => c.name.toLowerCase().includes(customer.name.toLowerCase())).map(c => (
                        <div
                          key={c.id}
                          className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between"
                          onClick={() => {
                            setCustomer({ id: c.id, name: c.name, phone: c.phone });
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <span className="font-bold">{c.name}</span>
                          <span className="text-rose-500 text-[10px] font-bold">{c.totalDebt > 0 ? `Owes ${currencySymbol}${c.totalDebt}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input placeholder="Phone" className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:text-white" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
              </div>
            </div>

            {/* Notes */}
            <input placeholder="Sale notes (optional)" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:text-white" value={saleNotes} onChange={e => setSaleNotes(e.target.value)} />

            {/* Payment Mode */}
            <div className="grid grid-cols-3 gap-2">
              {([PaymentMode.CASH, PaymentMode.DIGITAL, PaymentMode.CREDIT] as const).map(mode => {
                const icons = { [PaymentMode.CASH]: <Banknote size={16} />, [PaymentMode.DIGITAL]: <CreditCard size={16} />, [PaymentMode.CREDIT]: <Hash size={16} /> };
                const labels = { [PaymentMode.CASH]: 'Cash', [PaymentMode.DIGITAL]: 'Online', [PaymentMode.CREDIT]: 'Credit' };
                return (
                  <button key={mode} onClick={() => { setPaymentMode(mode); if (mode === PaymentMode.CREDIT) setSaleStatus(SaleStatus.CREDIT); else setSaleStatus(SaleStatus.PAID); }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all text-xs font-bold ${paymentMode === mode ? (isBlue ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600') : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    {icons[mode]}
                    <span className="mt-1">{labels[mode]}</span>
                  </button>
                );
              })}
            </div>

            {/* Checkout */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isBlue ? 'bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none' : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 dark:shadow-none'}`}
            >
              <Receipt size={20} />
              Confirm Sale
            </button>
          </div>
        </div>
      </div>

      {/* Stock Warning Modal */}
      {stockWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl text-center animate-bounce-in">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={44} className="text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Insufficient Stock!</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-1">"{stockWarning.name}"</p>
            <p className="text-slate-600 dark:text-slate-300 font-semibold mb-6">Only <span className="text-rose-600 font-black">{stockWarning.available} {stockWarning.unit}</span> available</p>
            <button onClick={() => setStockWarning(null)} className="w-full py-3.5 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black hover:bg-slate-800 transition-colors">
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Weight Keypad */}
      {weightInput && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xs p-6 shadow-2xl animate-bounce-in">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Enter Weight</h3>
            <p className="text-xs text-slate-400 mb-4">{products.find(p => p.id === weightInput.productId)?.name}</p>
            <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-2xl text-center text-3xl font-black mb-4 text-slate-800 dark:text-white">
              {weightInput.value || '0.000'} <span className="text-base text-slate-400">KG</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'DEL'].map(k => (
                <button key={k} onClick={() => {
                  if (k === 'DEL') setWeightInput({ ...weightInput, value: weightInput.value.slice(0, -1) });
                  else if (k === '.' && weightInput.value.includes('.')) return;
                  else if (typeof k === 'number' && (weightInput.value.split('.')[1]?.length ?? 0) >= 3) return;
                  else setWeightInput({ ...weightInput, value: weightInput.value + k });
                }} className="h-12 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all dark:text-white">
                  {k}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setWeightInput(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-300">Cancel</button>
              <button
                onClick={() => handleWeightConfirm(parseFloat(weightInput.value))}
                disabled={!weightInput.value || isNaN(parseFloat(weightInput.value))}
                className={`flex-1 py-3 text-white rounded-2xl font-bold disabled:opacity-40 ${isBlue ? 'bg-blue-600' : 'bg-emerald-600'}`}
              >
                Add to Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills Panel */}
      {showHeldBills && (
        <div className="fixed inset-0 z-[80] flex justify-end animate-fade-in" onClick={() => setShowHeldBills(false)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm h-full shadow-2xl overflow-y-auto animate-slide-right" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white">Held Bills</h3>
                <p className="text-xs text-slate-400">{shopHeldBills.length} bill(s) on hold</p>
              </div>
              <button onClick={() => setShowHeldBills(false)} className="text-slate-400 hover:text-slate-600 p-1"><XCircle size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              {shopHeldBills.map(bill => (
                <div key={bill.id} className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{bill.label}</p>
                    <p className="text-xs text-slate-400">{new Date(bill.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{bill.items.length} item(s) · {currencySymbol}{bill.items.reduce((a, i) => a + i.subtotal, 0).toFixed(2)}</p>
                  <button onClick={() => handleRecall(bill)} className={`w-full py-2 rounded-xl text-xs font-bold text-white ${isBlue ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                    Recall Bill
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showCheckoutSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[150] animate-bounce-in border border-slate-700">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="font-black">Sale Recorded!</p>
            <p className="text-slate-400 text-xs">Inventory updated · {currencySymbol}{lastSale?.totalAmount.toFixed(2)}</p>
          </div>
          {lastSale && (
            <button
              onClick={() => { setShowCheckoutSuccess(false); /* receipt will be shown via parent */ }}
              className="ml-2 text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
            >
              <Receipt size={13} /> View
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Sales;
