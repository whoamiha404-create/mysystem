import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const cleanToastMessage = (message) => String(message ?? '')
  .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          const Icon = toastIcons[t.type] || toastIcons.info;
          return (
            <div key={t.id} className={`toast ${t.type}`}>
              <Icon size={17} strokeWidth={2.4} />
              <span>{cleanToastMessage(t.message)}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
