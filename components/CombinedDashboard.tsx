
import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { TrendingUp, ShoppingBag, Layers, Activity, ArrowUpRight, ArrowDownRight, BookOpen, Store } from 'lucide-react';
import { Product, Sale, ShopType } from '../types';
import { AppSettings } from '../types';

interface Props {
  products: Product[];
  sales: Sale[];
  settings: AppSettings;
}

type Period = '7D' | '30D' | 'ALL';

const CombinedDashboard: React.FC<Props> = ({ products, sales, settings }) => {
  const [period, setPeriod] = useState<Period>('30D');
  const { currencySymbol } = settings;

  const getPeriodSales = (allSales: Sale[]) => {
    if (period === 'ALL') return allSales;
    const cutoff = Date.now() - (period === '7D' ? 7 : 30) * 24 * 60 * 60 * 1000;
    return allSales.filter(s => s.timestamp >= cutoff);
  };

  const periodSales = getPeriodSales(sales);
  const statSales = sales.filter(s => s.shopType === ShopType.STATIONERY);
  const genSales = sales.filter(s => s.shopType === ShopType.GENERAL_STORE);
  const statPeriodSales = getPeriodSales(statSales);
  const genPeriodSales = getPeriodSales(genSales);

  const totalRevenue = periodSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalProfit = periodSales.reduce((acc, s) => acc + s.totalProfit, 0);
  const statRevenue = statPeriodSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const genRevenue = genPeriodSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const statProfit = statPeriodSales.reduce((acc, s) => acc + s.totalProfit, 0);
  const genProfit = genPeriodSales.reduce((acc, s) => acc + s.totalProfit, 0);

  // Month comparison (last 2 periods)
  const prevPeriodSales = (() => {
    if (period === 'ALL') return [];
    const dur = (period === '7D' ? 7 : 30) * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return sales.filter(s => s.timestamp >= now - 2 * dur && s.timestamp < now - dur);
  })();
  const prevRevenue = prevPeriodSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const revTrend = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  // Daily chart (last 7 or 30 days)
  const days = period === '7D' ? 7 : period === '30D' ? 14 : 12;
  const dailyData = useMemo(() => {
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const label = d.toLocaleDateString('en-PK', period === '7D' ? { weekday: 'short' } : { month: 'short', day: 'numeric' });
      const dayStat = statPeriodSales.filter(s => new Date(s.timestamp).toDateString() === d.toDateString());
      const dayGen = genPeriodSales.filter(s => new Date(s.timestamp).toDateString() === d.toDateString());
      return {
        name: label,
        stationery: dayStat.reduce((a, s) => a + s.totalAmount, 0),
        general: dayGen.reduce((a, s) => a + s.totalAmount, 0),
      };
    });
  }, [statPeriodSales, genPeriodSales, days, period]);

  // Pie data
  const pieData = [
    { name: 'Stationery', value: statRevenue, color: '#3b82f6' },
    { name: 'General Store', value: genRevenue, color: '#10b981' },
  ].filter(d => d.value > 0);

  // Recent Activity (merged, sorted)
  const recentActivity = [...sales].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);

  const KpiBlock = ({ label, value, sub, trend, color }: { label: string; value: string; sub?: string; trend?: number; color: string }) => (
    <div className={`bg-gradient-to-br ${color} p-6 rounded-3xl text-white relative overflow-hidden`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-black">{value}</p>
      {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
      {trend !== undefined && isFinite(trend) && (
        <div className={`absolute top-4 right-4 flex items-center gap-0.5 text-xs font-black px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-rose-400/20 text-rose-200'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 rounded-[2rem] p-8 text-white relative overflow-hidden animated-gradient">
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute right-20 -bottom-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
            <span className="text-white/70 text-sm">Combined Business Overview</span>
          </div>
          <h1 className="text-3xl font-black mb-1">{settings.businessName}</h1>
          <p className="text-white/60">All shops · {products.length} active products · {sales.length} total sales</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Period:</span>
        {(['7D', '30D', 'ALL'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${period === p ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
            {p === '7D' ? 'Last 7 Days' : p === '30D' ? 'Last 30 Days' : 'All Time'}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiBlock label="Total Revenue" value={`${currencySymbol}${totalRevenue.toLocaleString()}`} sub={`${periodSales.length} transactions`} trend={revTrend} color="from-indigo-500 to-violet-600" />
        <KpiBlock label="Total Profit" value={`${currencySymbol}${totalProfit.toLocaleString()}`} sub={totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% margin` : ''} color="from-emerald-500 to-teal-600" />
        <KpiBlock label="Active Products" value={String(products.length)} sub={`${products.filter(p => p.stock <= p.lowStockThreshold).length} need restock`} color="from-blue-500 to-indigo-600" />
        <KpiBlock label="Avg. Sale" value={`${currencySymbol}${periodSales.length > 0 ? (totalRevenue / periodSales.length).toFixed(0) : '0'}`} sub="Per transaction" color="from-amber-500 to-orange-600" />
      </div>

      {/* Shop Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600"><BookOpen size={18} /></div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-white">Stationery Shop</h3>
              <p className="text-xs text-slate-400">{products.filter(p => p.shopType === ShopType.STATIONERY).length} products</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3"><p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-semibold">Revenue</p><p className="text-xl font-black text-blue-700 dark:text-blue-400">{currencySymbol}{statRevenue.toLocaleString()}</p></div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-3"><p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-semibold">Profit</p><p className="text-xl font-black text-indigo-700 dark:text-indigo-400">{currencySymbol}{statProfit.toLocaleString()}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600"><Store size={18} /></div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-white">General Store</h3>
              <p className="text-xs text-slate-400">{products.filter(p => p.shopType === ShopType.GENERAL_STORE).length} products</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3"><p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-semibold">Revenue</p><p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{currencySymbol}{genRevenue.toLocaleString()}</p></div>
            <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-3"><p className="text-xs text-teal-600/70 dark:text-teal-400/70 font-semibold">Profit</p><p className="text-xl font-black text-teal-700 dark:text-teal-400">{currencySymbol}{genProfit.toLocaleString()}</p></div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-5">Revenue Comparison</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: 12 }} formatter={(v: any) => [`${currencySymbol}${Number(v).toLocaleString()}`, '']} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="stationery" name="Stationery" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="general" name="General Store" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Revenue Share</h3>
          {pieData.length > 0 ? (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={6} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 12 }} formatter={(v: any) => [`${currencySymbol}${Number(v).toLocaleString()}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{d.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-800 dark:text-white">{currencySymbol}{d.value.toFixed(0)}</p>
                      <p className="text-[10px] text-slate-400">{totalRevenue > 0 ? ((d.value / totalRevenue) * 100).toFixed(1) : '0'}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">No data in period</div>}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Activity size={16} className="text-indigo-500" /> Recent Activity (All Shops)
        </h3>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">No sales recorded yet</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentActivity.map(sale => (
              <div key={sale.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sale.shopType === ShopType.STATIONERY ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'}`}>
                  {sale.shopType === ShopType.STATIONERY ? <BookOpen size={15} /> : <Store size={15} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{sale.customerName || 'Walk-in Customer'}</p>
                  <p className="text-[10px] text-slate-400">{sale.shopType === ShopType.STATIONERY ? 'Stationery' : 'General'} · {new Date(sale.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="font-black text-sm text-slate-900 dark:text-white shrink-0">{currencySymbol}{sale.totalAmount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CombinedDashboard;
