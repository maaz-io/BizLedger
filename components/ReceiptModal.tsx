
import React, { useRef } from 'react';
import { X, Printer, Store, BookOpen, CheckCircle2, CreditCard, Banknote, Phone } from 'lucide-react';
import { Sale, ShopType, PaymentMode, SaleStatus } from '../types';
import { AppSettings } from '../types';

interface ReceiptModalProps {
  sale: Sale;
  settings: AppSettings;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, settings, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const subtotal = sale.items.reduce((acc, i) => acc + i.subtotal, 0);
  const discount = sale.discount || 0;
  const tax = sale.tax || 0;

  const paymentIcon = sale.paymentMode === PaymentMode.CASH
    ? <Banknote size={14} className="text-amber-500" />
    : sale.paymentMode === PaymentMode.DIGITAL
    ? <CreditCard size={14} className="text-blue-500" />
    : <Phone size={14} className="text-purple-500" />;

  const statusColor = sale.status === SaleStatus.PAID || !sale.status
    ? 'text-emerald-600 bg-emerald-50'
    : sale.status === SaleStatus.PARTIAL
    ? 'text-amber-600 bg-amber-50'
    : 'text-rose-600 bg-rose-50';

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-bounce-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${sale.shopType === ShopType.STATIONERY ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-emerald-600 to-teal-700'} px-8 py-6 text-white`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              {sale.shopType === ShopType.STATIONERY ? <BookOpen size={20} /> : <Store size={20} />}
              <span className="font-black text-lg">{settings.businessName}</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors no-print"
            >
              <X size={16} />
            </button>
          </div>
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wider">Invoice</p>
            <p className="text-2xl font-black">#{sale.invoiceNumber || sale.id.toUpperCase().slice(0, 8)}</p>
          </div>
        </div>

        {/* Receipt Body */}
        <div id="receipt-printable" ref={printRef} className="px-8 py-6">
          {/* Business Info */}
          {settings.businessAddress && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{settings.businessAddress} {settings.businessPhone ? `· ${settings.businessPhone}` : ''}</p>
          )}

          {/* Date & Customer */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Date</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatDate(sale.timestamp)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Customer</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{sale.customerName || 'Walk-in'}</p>
              {sale.customerPhone && <p className="text-xs text-slate-400">{sale.customerPhone}</p>}
            </div>
          </div>

          {/* Items */}
          <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Item</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Qty</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Rate</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {sale.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300 text-xs leading-tight">
                      {item.productName}
                      {item.discount ? <span className="text-emerald-500 ml-1">(-{settings.currencySymbol}{item.discount})</span> : ''}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-400 text-xs">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-400 text-xs">{settings.currencySymbol}{item.unitPrice}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200 text-xs">{settings.currencySymbol}{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span>{settings.currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount</span>
                <span>- {settings.currencySymbol}{discount.toFixed(2)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Tax ({sale.taxRate}%)</span>
                <span>+ {settings.currencySymbol}{tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-xl text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
              <span>Total</span>
              <span>{settings.currencySymbol}{sale.totalAmount.toFixed(2)}</span>
            </div>
            {sale.receivedAmount !== undefined && sale.receivedAmount >= 0 && (
              <>
                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span>Received</span>
                  <span>{settings.currencySymbol}{sale.receivedAmount.toFixed(2)}</span>
                </div>
                {(sale.changeAmount || 0) > 0 ? (
                  <div className="flex justify-between text-blue-600 dark:text-blue-400 text-xs font-semibold">
                    <span>Change</span>
                    <span>{settings.currencySymbol}{(sale.changeAmount || 0).toFixed(2)}</span>
                  </div>
                ) : (sale.status === SaleStatus.PARTIAL || sale.status === SaleStatus.CREDIT) ? (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 text-xs font-black">
                    <span>Debt Added</span>
                    <span>{settings.currencySymbol}{(sale.totalAmount - sale.receivedAmount).toFixed(2)}</span>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* Payment & Status Row */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
              {paymentIcon}
              <span className="capitalize">{sale.paymentMode.toLowerCase()}</span>
            </div>
            <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${statusColor}`}>
              {sale.status || 'PAID'}
            </span>
          </div>

          {sale.notes && (
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 italic">Note: {sale.notes}</p>
          )}

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
            Thank you for your business! 🙏
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-8 pb-6 no-print">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white transition-all active:scale-95 ${sale.shopType === ShopType.STATIONERY ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'}`}
          >
            <Printer size={18} />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
