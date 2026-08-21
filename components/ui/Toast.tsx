
import React, { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastNotification } from '../../types';

interface ToastProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: <CheckCircle2 size={18} className="text-emerald-400" />,
  error: <XCircle size={18} className="text-rose-400" />,
  warning: <AlertTriangle size={18} className="text-amber-400" />,
  info: <Info size={18} className="text-blue-400" />,
};

const BORDER_COLORS = {
  success: 'border-l-emerald-500',
  error: 'border-l-rose-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

const Toast: React.FC<{ toast: ToastNotification; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const duration = toast.duration ?? 3500;
    timerRef.current = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl border-l-4 ${BORDER_COLORS[toast.type]} min-w-[280px] max-w-[380px] animate-slide-up cursor-pointer`}
      onClick={() => onDismiss(toast.id)}
    >
      <div className="mt-0.5 shrink-0">{ICONS[toast.type]}</div>
      <p className="text-sm font-medium leading-snug flex-1">{toast.message}</p>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        className="text-slate-500 hover:text-white transition-colors shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

// Hook for easy use
export const useToast = (
  setToasts: React.Dispatch<React.SetStateAction<ToastNotification[]>>
) => {
  const show = (message: string, type: ToastNotification['type'] = 'info', duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message, duration }]);
  };

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return {
    success: (msg: string, duration?: number) => show(msg, 'success', duration),
    error: (msg: string, duration?: number) => show(msg, 'error', duration ?? 5000),
    warning: (msg: string, duration?: number) => show(msg, 'warning', duration),
    info: (msg: string, duration?: number) => show(msg, 'info', duration),
    dismiss,
  };
};

export default ToastContainer;
