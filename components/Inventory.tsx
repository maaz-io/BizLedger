
import React, { useState, useMemo, useRef } from 'react';
import {
  Search, Plus, Edit2, Trash2, X, AlertTriangle, Package2, ShoppingCart,
  Filter, Download, Copy, History, ChevronDown, ChevronUp,
  TrendingUp, ArrowUpCircle, Minus
} from 'lucide-react';
import { Product, ShopType, UnitType, StockAdjustment } from '../types';
import { CATEGORIES } from '../constants';
import { AppSettings } from '../types';
import ConfirmDialog from './ui/ConfirmDialog';

interface InventoryProps {
  shopType: ShopType;
  products: Product[];
  onAdd: (p: Product) => void;
  onUpdate: (p: Product) => void;
  onDelete: (id: string) => void;
  onSell: (id: string) => void;
  onStockAdjust: (adj: StockAdjustment) => void;
  stockHistory: StockAdjustment[];
  settings: AppSettings;
  onToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type SortKey = 'name' | 'stock' | 'sellingPrice' | 'category';
type FilterStock = 'ALL' | 'LOW' | 'OUT' | 'OK';

const Inventory: React.FC<InventoryProps> = ({
  shopType, products, onAdd, onUpdate, onDelete, onSell,
  onStockAdjust, stockHistory, settings, onToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStock, setFilterStock] = useState<FilterStock>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const { currencySymbol } = settings;
  const isBlue = shopType === ShopType.STATIONERY;

  const categories = ['ALL', ...CATEGORIES[shopType]];

  const filtered = useMemo(() => {
    let list = [...products];
    if (searchTerm) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterCategory !== 'ALL') list = list.filter(p => p.category === filterCategory);
    if (filterStock === 'LOW') list = list.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0);
    if (filterStock === 'OUT') list = list.filter(p => p.stock <= 0);
    if (filterStock === 'OK') list = list.filter(p => p.stock > p.lowStockThreshold);

    list.sort((a, b) => {
      let va: any = a[sortKey], vb: any = b[sortKey];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [products, searchTerm, filterCategory, filterStock, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(prev => !prev);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleExportCSV = () => {
    const headers = ['SKU', 'Name', 'Category', 'Unit', 'Purchase Price', 'Selling Price', 'Stock', 'Low Stock Threshold'];
    const rows = products.map(p => [
      p.sku, `"${p.name}"`, p.category, p.unitType,
      p.purchasePrice, p.sellingPrice, p.stock, p.lowStockThreshold
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${shopType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Inventory exported to CSV!', 'success');
  };

  const handleDuplicate = (p: Product) => {
    const dupe: Product = {
      ...p,
      id: Math.random().toString(36).substr(2, 9),
      name: `${p.name} (Copy)`,
      sku: `${p.sku}-C`,
      stock: 0,
      createdAt: Date.now(),
    };
    onAdd(dupe);
    onToast(`"${p.name}" duplicated!`, 'info');
  };

  const lowStockCount = products.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0).length;
  const outStockCount = products.filter(p => p.stock <= 0).length;
  const productHistory = historyProduct
    ? stockHistory.filter(h => h.productId === historyProduct.id).sort((a, b) => b.timestamp - a.timestamp).slice(0, 30)
    : [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Inventory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {products.length} products
            {lowStockCount > 0 && <span className="text-amber-600 font-semibold"> · {lowStockCount} low stock</span>}
            {outStockCount > 0 && <span className="text-rose-600 font-semibold"> · {outStockCount} out of stock</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={() => { setEditingProduct(null); setShowModal(true); }}
            className={`flex items-center gap-1.5 px-5 py-2 ${isBlue ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-xl font-bold text-sm transition-colors shadow-lg`}
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, SKU, category..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
            value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStock} onChange={e => setFilterStock(e.target.value as FilterStock)}
          >
            <option value="ALL">All Stock</option>
            <option value="OK">In Stock</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {([['name', 'Product'], ['category', 'Category'], ['sellingPrice', 'Price'], ['stock', 'Stock']] as [SortKey, string][]).map(([key, label]) => (
                  <th key={key} onClick={() => handleSort(key)} className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    <div className="flex items-center gap-1">
                      {label}
                      {sortKey === key ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-30" />}
                    </div>
                  </th>
                ))}
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Package2 size={40} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-slate-400 dark:text-slate-500">No products found</p>
                    {searchTerm && <button onClick={() => setSearchTerm('')} className="text-sm text-blue-500 font-semibold mt-2">Clear search</button>}
                  </td>
                </tr>
              )}
              {filtered.map(product => {
                const isLow = product.stock <= product.lowStockThreshold && product.stock > 0;
                const isOut = product.stock <= 0;
                const margin = product.sellingPrice > 0 ? ((product.sellingPrice - product.purchasePrice) / product.sellingPrice * 100) : 0;
                return (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOut ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500' : isLow ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                          <Package2 size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{product.name}</p>
                          <p className="text-[11px] text-slate-400">SKU: {product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">{product.category}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-bold text-slate-800 dark:text-white">{currencySymbol}{product.sellingPrice}</div>
                      <div className="text-[11px] text-slate-400">Cost: {currencySymbol}{product.purchasePrice}</div>
                      <div className={`text-[10px] font-bold ${margin >= 20 ? 'text-emerald-500' : margin >= 10 ? 'text-amber-500' : 'text-rose-500'}`}>{margin.toFixed(0)}% margin</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className={`text-sm font-black ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-800 dark:text-white'}`}>
                        {product.stock.toFixed(product.unitType === UnitType.KG ? 3 : 0)} {product.unitType}
                      </div>
                      {isOut && <span className="text-[10px] font-black text-rose-500 uppercase">Out of Stock</span>}
                      {isLow && <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5"><AlertTriangle size={9} /> Low Stock</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <ActionBtn title="Sell" disabled={product.stock <= 0} onClick={() => onSell(product.id)} color={product.stock > 0 ? (isBlue ? 'blue' : 'emerald') : 'disabled'}><ShoppingCart size={14} /></ActionBtn>
                        <ActionBtn title="Adjust Stock" onClick={() => setStockAdjustProduct(product)} color="violet"><ArrowUpCircle size={14} /></ActionBtn>
                        <ActionBtn title="History" onClick={() => setHistoryProduct(product)} color="slate"><History size={14} /></ActionBtn>
                        <ActionBtn title="Duplicate" onClick={() => handleDuplicate(product)} color="slate"><Copy size={14} /></ActionBtn>
                        <ActionBtn title="Edit" onClick={() => { setEditingProduct(product); setShowModal(true); }} color="slate"><Edit2 size={14} /></ActionBtn>
                        <ActionBtn title="Delete" onClick={() => setDeleteTarget(product)} color="rose"><Trash2 size={14} /></ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 text-xs text-slate-400">
            Showing {filtered.length} of {products.length} products
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <ProductModal shopType={shopType} product={editingProduct} settings={settings} onClose={() => setShowModal(false)}
          onSave={(p) => {
            if (editingProduct) { onUpdate(p); onToast(`"${p.name}" updated!`, 'success'); }
            else { onAdd(p); onToast(`"${p.name}" added!`, 'success'); }
            setShowModal(false);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget} title={`Delete "${deleteTarget?.name}"?`}
        message="This removes the product from inventory permanently. Past sales data is kept."
        confirmLabel="Delete Product" variant="danger"
        onConfirm={() => { if (deleteTarget) { onDelete(deleteTarget.id); onToast(`"${deleteTarget.name}" deleted.`, 'warning'); setDeleteTarget(null); } }}
        onCancel={() => setDeleteTarget(null)}
      />

      {stockAdjustProduct && (
        <StockAdjustModal product={stockAdjustProduct} shopType={shopType} currencySymbol={currencySymbol}
          onClose={() => setStockAdjustProduct(null)}
          onAdjust={(adj) => { onStockAdjust(adj); onToast(`Stock updated for "${stockAdjustProduct.name}"`, 'success'); setStockAdjustProduct(null); }}
        />
      )}

      {historyProduct && (
        <div className="fixed inset-0 z-[80] flex justify-end animate-fade-in" onClick={() => setHistoryProduct(null)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm h-full shadow-2xl overflow-y-auto animate-slide-right" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">{historyProduct.name}</h3>
                  <p className="text-xs text-slate-400">Stock movement history</p>
                </div>
                <button onClick={() => setHistoryProduct(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="mt-3">
                <span className={`inline-block px-3 py-1.5 rounded-xl text-sm font-black ${historyProduct.stock <= 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700' : historyProduct.stock <= historyProduct.lowStockThreshold ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700'}`}>
                  Current: {historyProduct.stock.toFixed(historyProduct.unitType === UnitType.KG ? 3 : 0)} {historyProduct.unitType}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {productHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <History size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No history yet</p>
                </div>
              ) : productHistory.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl">
                  <div className={`p-2 rounded-xl shrink-0 ${entry.type === 'SALE' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'}`}>
                    {entry.type === 'SALE' ? <Minus size={12} /> : <Plus size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{entry.type}</span>
                      <span className={`text-sm font-black ${entry.quantityChange < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {entry.quantityChange > 0 ? '+' : ''}{entry.quantityChange.toFixed(3)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{entry.quantityBefore.toFixed(2)} → {entry.quantityAfter.toFixed(2)}</p>
                    {entry.notes && <p className="text-[11px] text-slate-400 truncate">{entry.notes}</p>}
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionBtn: React.FC<{ title: string; onClick?: () => void; disabled?: boolean; color: string; children: React.ReactNode }> = ({ title, onClick, disabled, color, children }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-100',
    violet: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 hover:bg-violet-100',
    rose: 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30',
    slate: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600',
    disabled: 'bg-slate-100 dark:bg-slate-700 text-slate-300 cursor-not-allowed',
  };
  return (
    <button title={title} onClick={disabled ? undefined : onClick} disabled={disabled} className={`p-2 rounded-xl transition-all ${colors[color]}`}>
      {children}
    </button>
  );
};

const StockAdjustModal: React.FC<{ product: Product; shopType: ShopType; currencySymbol: string; onClose: () => void; onAdjust: (adj: StockAdjustment) => void }> = ({ product, shopType, currencySymbol, onClose, onAdjust }) => {
  const [qty, setQty] = useState('');
  const [type, setType] = useState<'ADD' | 'ADJUST'>('ADD');
  const [notes, setNotes] = useState('');
  const isBlue = shopType === ShopType.STATIONERY;
  const qtyNum = parseFloat(qty) || 0;
  const newStock = type === 'ADD' ? product.stock + qtyNum : qtyNum;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-7 shadow-2xl animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">Adjust Stock</h3>
            <p className="text-xs text-slate-400 truncate max-w-[200px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 mb-5 text-center">
          <p className="text-xs text-slate-500 mb-1">Current Stock</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{product.stock.toFixed(product.unitType === UnitType.KG ? 3 : 0)} <span className="text-base text-slate-400">{product.unitType}</span></p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['ADD', 'ADJUST'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${type === t ? (isBlue ? 'bg-blue-600 text-white border-blue-600' : 'bg-emerald-600 text-white border-emerald-600') : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>
                {t === 'ADD' ? '+ Add Stock' : '= Set To'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{type === 'ADD' ? 'Quantity to Add' : 'Set Stock To'}</label>
            <input type="number" step={product.unitType === UnitType.KG ? '0.001' : '1'} min={0} autoFocus
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold text-center dark:text-white"
              value={qty} onChange={e => setQty(e.target.value)} placeholder="0"
            />
          </div>
          {qtyNum > 0 && (
            <div className="text-center text-sm text-slate-500">
              {product.stock.toFixed(2)} → <span className={`font-black text-base ${newStock >= product.stock ? 'text-emerald-600' : 'text-rose-600'}`}>{newStock.toFixed(product.unitType === UnitType.KG ? 3 : 0)} {product.unitType}</span>
            </div>
          )}
          <input className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-sm dark:text-white" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold">Cancel</button>
            <button disabled={!qtyNum || qtyNum < 0}
              onClick={() => {
                const change = type === 'ADD' ? qtyNum : (qtyNum - product.stock);
                onAdjust({ id: Math.random().toString(36).substr(2, 9), productId: product.id, productName: product.name, shopType, type, quantityBefore: product.stock, quantityChange: change, quantityAfter: newStock, notes, timestamp: Date.now() });
              }}
              className={`flex-1 py-3 rounded-2xl font-bold text-white active:scale-95 disabled:opacity-40 ${isBlue ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >Update Stock</button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProductModalProps { shopType: ShopType; product: Product | null; settings: AppSettings; onClose: () => void; onSave: (p: Product) => void; }

const ProductModal: React.FC<ProductModalProps> = ({ shopType, product, settings, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Product>>(product || {
    shopType, unitType: shopType === ShopType.GENERAL_STORE ? UnitType.KG : UnitType.UNIT,
    category: CATEGORIES[shopType][0], stock: 0, purchasePrice: 0, sellingPrice: 0,
    lowStockThreshold: settings.defaultLowStockThreshold,
  });
  const isBlue = shopType === ShopType.STATIONERY;
  const margin = (formData.sellingPrice || 0) > 0 ? (((formData.sellingPrice || 0) - (formData.purchasePrice || 0)) / (formData.sellingPrice || 1)) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className={`${isBlue ? 'bg-blue-600' : 'bg-emerald-600'} px-7 py-5 flex items-center justify-between`}>
          <div>
            <h2 className="text-xl font-black text-white">{product ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-white/70 text-xs mt-0.5">{shopType === ShopType.STATIONERY ? 'Stationery Shop' : 'General Store'}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1"><X size={22} /></button>
        </div>
        <div className="p-7 overflow-y-auto max-h-[calc(100vh-200px)]">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave({ ...formData, id: product?.id || Math.random().toString(36).substr(2, 9), createdAt: product?.createdAt || Date.now() } as Product); }}>
            <div>
              <label className="field-label-sm">Product Name *</label>
              <input required className="field-input-sm" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Blue Gel Pen" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label-sm">Category</label>
                <select className="field-input-sm" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  {CATEGORIES[shopType].map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label-sm">SKU Code</label>
                <input className="field-input-sm" value={formData.sku || ''} onChange={e => setFormData({ ...formData, sku: e.target.value })} placeholder="PEN001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label-sm">Purchase Price ({settings.currencySymbol})</label>
                <input type="number" step="0.01" min="0" className="field-input-sm" value={formData.purchasePrice || 0} onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="field-label-sm">Selling Price ({settings.currencySymbol})</label>
                <input type="number" step="0.01" min="0" className="field-input-sm" value={formData.sellingPrice || 0} onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            {(formData.sellingPrice || 0) > 0 && (
              <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl ${margin >= 15 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700' : margin > 0 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700'}`}>
                <TrendingUp size={14} />
                <span className="font-bold">Margin: {margin.toFixed(1)}% · Profit: {settings.currencySymbol}{((formData.sellingPrice || 0) - (formData.purchasePrice || 0)).toFixed(2)}/unit</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="field-label-sm">Unit Type</label>
                <select className="field-input-sm disabled:opacity-50" value={formData.unitType} onChange={e => setFormData({ ...formData, unitType: e.target.value as UnitType })} disabled={!!product}>
                  <option value={UnitType.UNIT}>Unit</option>
                  {shopType === ShopType.GENERAL_STORE && <option value={UnitType.KG}>KG</option>}
                </select>
              </div>
              <div>
                <label className="field-label-sm">Stock Qty</label>
                <input type="number" step={formData.unitType === UnitType.KG ? '0.001' : '1'} min="0" className="field-input-sm" value={formData.stock || 0} onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="field-label-sm">Alert At</label>
                <input type="number" min="0" className="field-input-sm" value={formData.lowStockThreshold || 0} onChange={e => setFormData({ ...formData, lowStockThreshold: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <label className="field-label-sm">Supplier / Notes</label>
              <input className="field-input-sm" value={formData.supplier || ''} onChange={e => setFormData({ ...formData, supplier: e.target.value })} placeholder="Supplier name or internal notes" />
            </div>
            <button type="submit" className={`w-full py-3.5 rounded-2xl font-black text-white active:scale-95 ${isBlue ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'}`}>
              {product ? 'Save Changes' : 'Add Product'}
            </button>
          </form>
        </div>
      </div>
      <style>{`.field-label-sm{display:block;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}.field-input-sm{width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:10px;outline:none;font-size:13px;transition:border-color .2s,box-shadow .2s;background:white;color:#1e293b}.field-input-sm:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1)}`}</style>
    </div>
  );
};

export default Inventory;
