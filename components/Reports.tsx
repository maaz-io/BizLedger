
import React, { useState, useMemo } from 'react';
import { Calendar, Search, Download, Filter, FileText, Eye, X, TrendingUp, CreditCard, Banknote, Hash, ChevronDown, ChevronRight } from 'lucide-react';
import { Sale, PaymentMode, ShopType, SaleStatus } from '../types';
import { AppSettings } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ReceiptModal from './ReceiptModal';

interface ReportsProps {
  sales: Sale[];
  shopType: ShopType | 'COMBINED';
  settings: AppSettings;
}

type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

const Reports: React.FC<ReportsProps> = ({ sales, shopType, settings }) => {
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const { currencySymbol } = settings;

  const filteredSales = useMemo(() => {
    const now = new Date();
    let cutoff = 0;
    let ceilDate: Date | null = null;

    if (dateFilter === 'TODAY') {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      cutoff = s.getTime();
    } else if (dateFilter === 'WEEK') {
      cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === 'MONTH') {
      cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === 'CUSTOM' && customFrom) {
      cutoff = new Date(customFrom).getTime();
      if (customTo) { const c = new Date(customTo); c.setHours(23, 59, 59, 999); ceilDate = c; }
    }

    let list = [...sales].sort((a, b) => b.timestamp - a.timestamp);
    if (cutoff > 0) list = list.filter(s => s.timestamp >= cutoff && (!ceilDate || s.timestamp <= ceilDate.getTime()));

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s =>
        s.customerName?.toLowerCase().includes(q) ||
        s.customerPhone?.includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.invoiceNumber?.includes(q) ||
        s.items.some(i => i.productName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [sales, dateFilter, customFrom, customTo, searchTerm]);

  // Summary stats
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalProfit = filteredSales.reduce((acc, s) => acc + s.totalProfit, 0);
  const totalDiscount = filteredSales.reduce((acc, s) => acc + (s.discount || 0), 0);
  const cashSales = filteredSales.filter(s => s.paymentMode === PaymentMode.CASH).reduce((acc, s) => acc + s.totalAmount, 0);
  const digitalSales = filteredSales.filter(s => s.paymentMode === PaymentMode.DIGITAL).reduce((acc, s) => acc + s.totalAmount, 0);
  const creditSales = filteredSales.filter(s => s.paymentMode === PaymentMode.CREDIT).reduce((acc, s) => acc + s.totalAmount, 0);

  const paymentPieData = [
    { name: 'Cash', value: cashSales, color: '#f59e0b' },
    { name: 'Digital', value: digitalSales, color: '#3b82f6' },
    { name: 'Credit', value: creditSales, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const handleExportCSV = () => {
    const headers = ['Invoice', 'Date', 'Customer', 'Phone', 'Items', 'Discount', 'Total', 'Profit', 'Payment', 'Status'];
    const rows = filteredSales.map(s => [
      s.invoiceNumber || s.id,
      new Date(s.timestamp).toLocaleString(),
      `"${s.customerName || 'Walk-in'}"`,
      s.customerPhone || '',
      s.items.length,
      s.discount || 0,
      s.totalAmount.toFixed(2),
      s.totalProfit.toFixed(2),
      s.paymentMode,
      s.status || 'PAID',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const PAYMENT_COLORS: Record<string, string> = {
    [PaymentMode.CASH]: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    [PaymentMode.DIGITAL]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    [PaymentMode.CREDIT]: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  };
  const STATUS_COLORS: Record<string, string> = {
    [SaleStatus.PAID]: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    [SaleStatus.PARTIAL]: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700',
    [SaleStatus.CREDIT]: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Sales Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{filteredSales.length} transactions in selected period</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {(['ALL', 'TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as DateFilter[]).map(f => (
            <button key={f} onClick={() => setDateFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${dateFilter === f ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
              {f === 'ALL' ? 'All Time' : f === 'TODAY' ? 'Today' : f === 'WEEK' ? 'This Week' : f === 'MONTH' ? 'This Month' : 'Custom'}
            </button>
          ))}
        </div>
        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-2">
            <input type="date" className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-slate-400 text-sm">to</span>
            <input type="date" className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            placeholder="Search customer, invoice..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `${currencySymbol}${totalRevenue.toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Total Profit', value: `${currencySymbol}${totalProfit.toLocaleString()}`, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Total Discount', value: `${currencySymbol}${totalDiscount.toLocaleString()}`, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Avg. Transaction', value: `${currencySymbol}${filteredSales.length > 0 ? (totalRevenue / filteredSales.length).toFixed(0) : '0'}`, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} p-4 rounded-2xl`}>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{c.label}</p>
            <p className={`text-2xl font-black mt-0.5 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {['Invoice', 'Date', 'Customer', 'Items', 'Payment', 'Total'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredSales.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-slate-400 dark:text-slate-500">No transactions found for the selected period</td></tr>
                )}
                {filteredSales.map(sale => (
                  <React.Fragment key={sale.id}>
                    <tr
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {expandedSale === sale.id ? <ChevronDown size={12} className="text-indigo-500" /> : <ChevronRight size={12} className="text-slate-400" />}
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">#{sale.invoiceNumber || sale.id.slice(0, 6).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{new Date(sale.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-bold text-slate-800 dark:text-white">{sale.customerName || 'Walk-in'}</div>
                        {sale.customerPhone && <div className="text-[10px] text-slate-400">{sale.customerPhone}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${PAYMENT_COLORS[sale.paymentMode]}`}>{sale.paymentMode}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-black text-slate-800 dark:text-white text-sm">{currencySymbol}{sale.totalAmount.toLocaleString()}</div>
                        <div className="text-[10px] text-emerald-500 font-bold">+{currencySymbol}{sale.totalProfit.toFixed(0)} profit</div>
                      </td>
                    </tr>
                    {/* Expanded row */}
                    {expandedSale === sale.id && (
                      <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
                        <td colSpan={6} className="px-5 py-3">
                          <div className="space-y-1.5 mb-3">
                            {sale.items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 dark:text-slate-300">{item.productName}</span>
                                <span className="text-slate-500 dark:text-slate-400">{item.quantity} × {currencySymbol}{item.unitPrice} = <span className="font-bold text-slate-700 dark:text-slate-200">{currencySymbol}{item.subtotal.toFixed(2)}</span></span>
                              </div>
                            ))}
                          </div>
                          {(sale.discount || sale.tax) ? (
                            <div className="border-t border-indigo-100 dark:border-indigo-800/30 pt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                              {sale.discount ? <div className="flex justify-between"><span>Discount</span><span className="text-emerald-600">-{currencySymbol}{sale.discount}</span></div> : null}
                              {sale.tax ? <div className="flex justify-between"><span>Tax ({sale.taxRate}%)</span><span>+{currencySymbol}{sale.tax}</span></div> : null}
                            </div>
                          ) : null}
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={(e) => { e.stopPropagation(); setSelectedSale(sale); }} className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                              <Eye size={12} /> View Receipt
                            </button>
                            {sale.notes && <span className="text-xs text-slate-400 italic">Note: {sale.notes}</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              {/* Totals Footer */}
              {filteredSales.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <td colSpan={4} className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Totals ({filteredSales.length} transactions)
                    </td>
                    <td className="px-5 py-3"></td>
                    <td className="px-5 py-3">
                      <div className="font-black text-slate-900 dark:text-white">{currencySymbol}{totalRevenue.toLocaleString()}</div>
                      <div className="text-[10px] text-emerald-500 font-bold">+{currencySymbol}{totalProfit.toFixed(0)}</div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Right Panel: Payment Breakdown */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm">Payment Breakdown</h3>
            {paymentPieData.length > 0 ? (
              <>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                        {paymentPieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 12 }} formatter={(val: any) => [`${currencySymbol}${Number(val).toFixed(0)}`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {paymentPieData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-white">{currencySymbol}{d.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">No data in period</div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Quick Summary</h3>
            {[
              { label: 'Cash Sales', value: cashSales, icon: <Banknote size={14} className="text-amber-500" /> },
              { label: 'Digital Sales', value: digitalSales, icon: <CreditCard size={14} className="text-blue-500" /> },
              { label: 'Credit Sales', value: creditSales, icon: <Hash size={14} className="text-purple-500" /> },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  {row.icon} {row.label}
                </div>
                <span className="font-bold text-sm text-slate-800 dark:text-white">{currencySymbol}{row.value.toFixed(0)}</span>
              </div>
            ))}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-2 flex justify-between">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1"><TrendingUp size={13} />Margin</span>
              <span className="font-black text-emerald-600">{totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
        </div>
      </div>

      {selectedSale && (
        <ReceiptModal sale={selectedSale} settings={settings} onClose={() => setSelectedSale(null)} />
      )}
    </div>
  );
};

export default Reports;
