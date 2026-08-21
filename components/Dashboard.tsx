
import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import {
  ShoppingCart, Package, TrendingUp, AlertCircle, Plus,
  ArrowUpRight, ArrowDownRight, Clock, Users, Zap, Award, ChevronRight
} from 'lucide-react';
import { ShopType, Product, Sale, UnitType } from '../types';
import { AppSettings } from '../types';

interface DashboardProps {
  shopType: ShopType;
  products: Product[];
  sales: Sale[];
  onNewSale: () => void;
  settings: AppSettings;
  onGoToInventory?: () => void;
}

type DateRangeKey = 'TODAY' | '7D' | '30D' | 'ALL';

const Dashboard: React.FC<DashboardProps> = ({ shopType, products, sales, onNewSale, settings, onGoToInventory }) => {
  const [dateRange, setDateRange] = useState<DateRangeKey>('7D');
  const isBlue = shopType === ShopType.STATIONERY;
  const accent = isBlue ? 'blue' : 'emerald';
  const { currencySymbol } = settings;

  const shopProducts = products.filter(p => p.shopType === shopType);
  const shopSales = sales.filter(s => s.shopType === shopType);

  // Filter sales by date range
  const filteredSales = useMemo(() => {
    const now = Date.now();
    const ranges: Record<DateRangeKey, number> = {
      TODAY: 24 * 60 * 60 * 1000,
      '7D': 7 * 24 * 60 * 60 * 1000,
      '30D': 30 * 24 * 60 * 60 * 1000,
      ALL: Infinity,
    };
    const cutoff = now - ranges[dateRange];
    return shopSales.filter(s => s.timestamp >= cutoff || dateRange === 'ALL');
  }, [shopSales, dateRange]);

  const prevFilteredSales = useMemo(() => {
    const now = Date.now();
    const ranges: Record<DateRangeKey, number> = {
      TODAY: 24 * 60 * 60 * 1000,
      '7D': 7 * 24 * 60 * 60 * 1000,
      '30D': 30 * 24 * 60 * 60 * 1000,
      ALL: Infinity,
    };
    const duration = ranges[dateRange];
    if (!isFinite(duration)) return shopSales;
    const cutoff = now - duration;
    const prevCutoff = cutoff - duration;
    return shopSales.filter(s => s.timestamp >= prevCutoff && s.timestamp < cutoff);
  }, [shopSales, dateRange]);

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalProfit = filteredSales.reduce((acc, s) => acc + s.totalProfit, 0);
  const prevRevenue = prevFilteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const prevProfit = prevFilteredSales.reduce((acc, s) => acc + s.totalProfit, 0);
  const stockValue = shopProducts.reduce((acc, p) => acc + (p.stock * p.purchasePrice), 0);
  const lowStockItems = shopProducts.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0);
  const outOfStockItems = shopProducts.filter(p => p.stock <= 0);
  const avgTransaction = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  const revenueTrend = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const profitTrend = prevProfit > 0 ? ((totalProfit - prevProfit) / prevProfit) * 100 : 0;

  // Chart: last 7 or 30 days daily sales
  const chartDays = dateRange === '30D' ? 30 : 7;
  const dailySalesData = Array.from({ length: chartDays }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (chartDays - 1 - i));
    const label = d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
    const daySales = shopSales.filter(s => new Date(s.timestamp).toDateString() === d.toDateString());
    return {
      name: label,
      revenue: daySales.reduce((acc, s) => acc + s.totalAmount, 0),
      profit: daySales.reduce((acc, s) => acc + s.totalProfit, 0),
    };
  });

  // Top products by revenue
  const topProducts = useMemo(() => {
    const productRevenue = new Map<string, { name: string; revenue: number; qty: number }>();
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productRevenue.get(item.productId) || { name: item.productName, revenue: 0, qty: 0 };
        productRevenue.set(item.productId, {
          name: item.productName,
          revenue: existing.revenue + item.subtotal,
          qty: existing.qty + item.quantity,
        });
      });
    });
    return Array.from(productRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  // Category pie chart
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = shopProducts.find(p => p.id === item.productId);
        if (product) {
          map.set(product.category, (map.get(product.category) || 0) + item.subtotal);
        }
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [filteredSales, shopProducts]);

  // Hourly heatmap (0-23)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, sales: 0 }));
    filteredSales.forEach(sale => {
      const h = new Date(sale.timestamp).getHours();
      hours[h].sales += sale.totalAmount;
    });
    return hours.filter((_, i) => i >= 7 && i <= 22); // show 7am-10pm
  }, [filteredSales]);

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const recentSales = [...shopSales].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner */}
      <div className={`${isBlue ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800' : 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800'} p-8 rounded-[2rem] text-white relative overflow-hidden animated-gradient`}>
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -right-5 top-16 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute right-24 -bottom-8 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
              <span className="text-white/70 text-sm font-medium">Live Dashboard</span>
            </div>
            <h2 className="text-3xl font-black mb-1">{settings.businessName}</h2>
            <p className="text-white/70">
              {(lowStockItems.length + outOfStockItems.length) > 0
                ? <><span className="text-white font-bold">{lowStockItems.length + outOfStockItems.length}</span> items need attention · </>
                : 'All stock levels are healthy · '}
              {filteredSales.length} sales in period
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={onNewSale}
              className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-2xl font-black hover:scale-105 transition-transform shadow-xl"
            >
              <Plus size={20} />
              New Sale
            </button>
            {(lowStockItems.length > 0 || outOfStockItems.length > 0) && onGoToInventory && (
              <button
                onClick={onGoToInventory}
                className="flex items-center gap-2 bg-white/20 text-white px-5 py-3 rounded-2xl font-semibold hover:bg-white/30 transition-colors border border-white/30"
              >
                <AlertCircle size={18} />
                {lowStockItems.length + outOfStockItems.length} Stock Alerts
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Period:</span>
        {(['TODAY', '7D', '30D', 'ALL'] as DateRangeKey[]).map(r => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${dateRange === r ? (isBlue ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white') : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
          >
            {r === 'TODAY' ? 'Today' : r === '7D' ? 'Last 7 Days' : r === '30D' ? 'Last 30 Days' : 'All Time'}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue"
          value={`${currencySymbol} ${totalRevenue.toLocaleString()}`}
          subtext={`${filteredSales.length} transactions`}
          trend={revenueTrend}
          color={isBlue ? 'blue' : 'emerald'}
          icon={<TrendingUp size={18} />}
        />
        <KpiCard
          label="Net Profit"
          value={`${currencySymbol} ${totalProfit.toLocaleString()}`}
          subtext={totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% margin` : 'No sales yet'}
          trend={profitTrend}
          color="indigo"
          icon={<Zap size={18} />}
        />
        <KpiCard
          label="Avg. Sale"
          value={`${currencySymbol} ${avgTransaction.toFixed(0)}`}
          subtext="Per transaction"
          color="violet"
          icon={<Users size={18} />}
        />
        <KpiCard
          label="Stock Value"
          value={`${currencySymbol} ${stockValue.toLocaleString()}`}
          subtext={`${shopProducts.length} SKUs tracked`}
          color="amber"
          icon={<Package size={18} />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Revenue & Profit Trend</h3>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySalesData}>
                <defs>
                  <linearGradient id={`grad-rev-${accent}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isBlue ? '#3b82f6' : '#10b981'} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={isBlue ? '#3b82f6' : '#10b981'} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-profit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 13 }}
                  formatter={(value: any, name: string) => [`${currencySymbol}${Number(value).toLocaleString()}`, name === 'revenue' ? 'Revenue' : 'Profit']}
                />
                <Area
                  type="monotone" dataKey="revenue"
                  stroke={isBlue ? '#3b82f6' : '#10b981'} strokeWidth={2.5}
                  fill={`url(#grad-rev-${accent})`}
                />
                <Area
                  type="monotone" dataKey="profit"
                  stroke="#6366f1" strokeWidth={2}
                  fill="url(#grad-profit)"
                  strokeDasharray="5 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex gap-5 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <div className={`w-3 h-3 rounded-full ${isBlue ? 'bg-blue-500' : 'bg-emerald-500'}`} />
              Revenue
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              Profit
            </div>
          </div>
        </div>

        {/* Category Pie */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Sales by Category</h3>
          {categoryData.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {categoryData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 12 }}
                      formatter={(value: any) => [`${currencySymbol}${Number(value).toLocaleString()}`, 'Revenue']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {categoryData.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{currencySymbol}{item.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[240px] flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
              <ShoppingCart size={40} className="mb-2" />
              <p className="text-sm">No sales in this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Top Products + Recent Sales + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Award size={16} className="text-amber-500" /> Top Sellers
          </h3>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const maxRevenue = topProducts[0].revenue;
                const pct = maxRevenue > 0 ? (p.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{p.name}</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white">{currencySymbol}{p.revenue.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isBlue ? 'bg-blue-500' : 'bg-emerald-500'} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No sales data</p>
          )}
        </div>

        {/* Recent Sales */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-indigo-500" /> Recent Sales
          </h3>
          {recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isBlue ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                      <ShoppingCart size={14} className={isBlue ? 'text-blue-600' : 'text-emerald-600'} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">{sale.customerName || 'Walk-in'}</p>
                      <p className="text-[10px] text-slate-400">{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-slate-800 dark:text-white">{currencySymbol}{sale.totalAmount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No recent sales</p>
          )}
        </div>

        {/* Stock Alerts */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500" /> Stock Alerts
            {(lowStockItems.length + outOfStockItems.length) > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {lowStockItems.length + outOfStockItems.length}
              </span>
            )}
          </h3>
          {outOfStockItems.length === 0 && lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-300 dark:text-slate-600">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-2">
                <Package size={20} className="text-emerald-500" />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center">All stock levels healthy!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {outOfStockItems.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/30">
                  <div>
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400 truncate max-w-[120px]">{p.name}</p>
                    <p className="text-[10px] text-rose-500 font-semibold uppercase">Out of Stock</p>
                  </div>
                  <button onClick={onGoToInventory} className="text-[10px] bg-rose-600 text-white px-2 py-1 rounded-lg font-bold">
                    Restock
                  </button>
                </div>
              ))}
              {lowStockItems.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                  <div>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 truncate max-w-[120px]">{p.name}</p>
                    <p className="text-[10px] text-amber-600 font-semibold">{p.stock.toFixed(p.unitType === UnitType.KG ? 2 : 0)} {p.unitType} left</p>
                  </div>
                  <button onClick={onGoToInventory} className="text-[10px] bg-amber-500 text-white px-2 py-1 rounded-lg font-bold">
                    Restock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hourly Heatmap */}
      {filteredSales.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-slate-500" /> Busiest Hours
          </h3>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="hour"
                  axisLine={false} tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(h) => h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 12 }}
                  labelFormatter={(h) => `${h}:00 - ${h}:59`}
                  formatter={(value: any) => [`${currencySymbol}${Number(value).toFixed(0)}`, 'Sales']}
                />
                <Bar dataKey="sales" radius={[4, 4, 0, 0]} fill={isBlue ? '#bfdbfe' : '#a7f3d0'}>
                  {hourlyData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.sales > 0 ? (isBlue ? '#3b82f6' : '#10b981') : (isBlue ? '#dbeafe' : '#d1fae5')}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  trend?: number;
  color: string;
  icon: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, subtext, trend, color, icon }) => {
  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400', text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', text: 'text-emerald-600' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'text-indigo-600 dark:text-indigo-400', text: 'text-indigo-600' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', icon: 'text-violet-600 dark:text-violet-400', text: 'text-violet-600' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', text: 'text-amber-600' },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-2xl ${c.bg} flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
        {trend !== undefined && isFinite(trend) && (
          <div className={`flex items-center gap-0.5 text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 leading-tight">{value}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtext}</p>
    </div>
  );
};

export default Dashboard;
