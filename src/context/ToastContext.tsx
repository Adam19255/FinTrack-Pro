import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-slide-up min-w-[300px] ${
              toast.type === 'success' 
                ? 'bg-white dark:bg-gray-800 border-green-500 text-green-700 dark:text-green-400' 
                : toast.type === 'error'
                ? 'bg-white dark:bg-gray-800 border-red-500 text-red-700 dark:text-red-400'
                : 'bg-white dark:bg-gray-800 border-blue-500 text-blue-700 dark:text-blue-400'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={20} className="text-green-500" />}
            {toast.type === 'error' && <AlertCircle size={20} className="text-red-500" />}
            {toast.type === 'info' && <Info size={20} className="text-blue-500" />}
            <span className="flex-1 font-medium text-sm">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};