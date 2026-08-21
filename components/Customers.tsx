import React, { useState, useMemo } from 'react';
import { User, Users, Plus, History, ArrowDownRight, ArrowUpRight, Search, X, Banknote, Calendar } from 'lucide-react';
import { Customer, LedgerTransaction, AppSettings } from '../types';

interface CustomersProps {
  customers: Customer[];
  ledgerTransactions: LedgerTransaction[];
  settings: AppSettings;
  onAddCustomer: (c: Customer) => void;
  onRecordPayment: (customerId: string, amount: number, notes?: string) => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, ledgerTransactions, settings, onAddCustomer, onRecordPayment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Payment state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Add customer state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const { currencySymbol } = settings;

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    ).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [customers, searchTerm]);

  const customerLedger = useMemo(() => {
    if (!selectedCustomer) return [];
    return ledgerTransactions
      .filter(tx => tx.customerId === selectedCustomer.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedCustomer, ledgerTransactions]);

  const totalOutstanding = customers.reduce((acc, c) => acc + c.totalDebt, 0);

  const handlePaymentSubmit = () => {
    if (!selectedCustomer) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    onRecordPayment(selectedCustomer.id, amount, paymentNotes);
    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentNotes('');
    // Update local selected customer to reflect new debt immediately in UI
    setSelectedCustomer(prev => prev ? { ...prev, totalDebt: Math.max(0, prev.totalDebt - amount) } : null);
  };

  const handleAddSubmit = () => {
    if (!newCustomerName.trim()) return;
    onAddCustomer({
      id: Math.random().toString(36).substr(2, 9),
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      totalDebt: 0,
      createdAt: Date.now()
    });
    setShowAddModal(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  return (
    <div className="h-full flex gap-6 animate-fade-in relative overflow-hidden">
      {/* Left: Customer List */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300 ${selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Header & Stats */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={20} className="text-indigo-600" /> Customers & Ledger
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage customer debts (Udhaar) and payments.</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> New Customer
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Outstanding</p>
              <p className="text-2xl font-black text-rose-600">{currencySymbol}{totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Customers</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{customers.length}</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Users size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No customers found.</p>
            </div>
          ) : (
            filteredCustomers.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCustomer(c)}
                className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all border ${selectedCustomer?.id === c.id ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.totalDebt > 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{c.name}</h3>
                    <p className="text-xs text-slate-500">{c.phone || 'No phone'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Debt</p>
                  <p className={`font-black ${c.totalDebt > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                    {currencySymbol}{c.totalDebt.toLocaleString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Ledger Panel (Slide over on mobile, permanent on desktop if selected) */}
      {selectedCustomer && (
        <div className="absolute inset-0 lg:static lg:flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col z-20 animate-slide-left lg:animate-none">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <button onClick={() => setSelectedCustomer(null)} className="lg:hidden text-indigo-600 font-bold text-sm mb-2 flex items-center gap-1">
                ← Back to list
              </button>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedCustomer.name}</h3>
              <p className="text-sm text-slate-500">{selectedCustomer.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Debt</p>
              <p className="text-2xl font-black text-rose-600">{currencySymbol}{selectedCustomer.totalDebt.toLocaleString()}</p>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <button 
              onClick={() => setShowPaymentModal(true)}
              disabled={selectedCustomer.totalDebt <= 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Banknote size={18} /> Receive Payment
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <History size={14} /> Ledger History
            </h4>
            
            {customerLedger.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No ledger history found.</div>
            ) : (
              customerLedger.map(tx => {
                const isDebt = tx.type === 'SALE_DEBT';
                return (
                  <div key={tx.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDebt ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'}`}>
                        {isDebt ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{isDebt ? 'Purchased on Credit' : 'Payment Received'}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={10}/> {new Date(tx.timestamp).toLocaleString()}</p>
                        {tx.notes && <p className="text-[10px] text-slate-400 mt-0.5">{tx.notes}</p>}
                      </div>
                    </div>
                    <span className={`font-black ${isDebt ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isDebt ? '+' : '-'}{currencySymbol}{Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {!selectedCustomer && (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
          <History size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">Select a customer to view their ledger</p>
        </div>
      )}

      {/* Receive Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-bounce-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Receive Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl mb-4 border border-rose-100 dark:border-rose-800">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Current Debt: {currencySymbol}{selectedCustomer.totalDebt.toLocaleString()}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">{currencySymbol}</span>
                  <input 
                    type="number" min={1} max={selectedCustomer.totalDebt}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-white"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Notes (Optional)</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm dark:text-white"
                  placeholder="e.g. Paid in cash"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                />
              </div>
            </div>

            <button 
              onClick={handlePaymentSubmit}
              disabled={!paymentAmount || isNaN(parseFloat(paymentAmount))}
              className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-black disabled:opacity-50 hover:bg-emerald-700 transition-colors"
            >
              Confirm Payment
            </button>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-bounce-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Add Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Customer Name *</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium dark:text-white"
                  placeholder="John Doe"
                  value={newCustomerName}
                  onChange={e => setNewCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Phone Number</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
                  placeholder="0300-0000000"
                  value={newCustomerPhone}
                  onChange={e => setNewCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <button 
              onClick={handleAddSubmit}
              disabled={!newCustomerName.trim()}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black disabled:opacity-50 hover:bg-indigo-700 transition-colors"
            >
              Add Customer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
