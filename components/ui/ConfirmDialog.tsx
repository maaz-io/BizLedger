
import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      iconBg: 'bg-rose-100 dark:bg-rose-900/40',
      icon: <Trash2 size={28} className="text-rose-600" />,
      btnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200 dark:shadow-none',
    },
    warning: {
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      icon: <AlertTriangle size={28} className="text-amber-600" />,
      btnClass: 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 dark:shadow-none',
    },
    info: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      icon: <AlertTriangle size={28} className="text-blue-600" />,
      btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none',
    },
  }[variant];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center animate-bounce-in"
        onClick={e => e.stopPropagation()}
      >
        <div className={`w-20 h-20 ${variantConfig.iconBg} rounded-full flex items-center justify-center mx-auto mb-5`}>
          {variantConfig.icon}
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-7">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); }}
            className={`flex-1 py-3.5 rounded-2xl font-bold transition-all active:scale-95 ${variantConfig.btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
