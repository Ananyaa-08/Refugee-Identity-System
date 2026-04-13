import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((type, title, message) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            removeToast(id);
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-0 right-0 p-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={cn(
                            "pointer-events-auto bg-[#0f1e38] border rounded-xl p-4 min-w-[320px] shadow-2xl flex items-start gap-3 animate-[slideInRight_0.3s_ease-out]",
                            toast.type === 'success' && "border-[#10b98140]",
                            toast.type === 'error' && "border-[#ef444440]",
                            toast.type === 'warning' && "border-[#f59e0b40]",
                            toast.type === 'info' && "border-[#00c9b140]"
                        )}
                    >
                        <div className={cn(
                            "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                            toast.type === 'success' && "bg-[#10b98120] text-[#10b981]",
                            toast.type === 'error' && "bg-[#ef444420] text-[#ef4444]",
                            toast.type === 'warning' && "bg-[#f59e0b20] text-[#f59e0b]",
                            toast.type === 'info' && "bg-[#00c9b120] text-[#00c9b1]"
                        )}>
                            {toast.type === 'success' && <CheckCircle size={16} />}
                            {toast.type === 'error' && <AlertCircle size={16} />}
                            {toast.type === 'warning' && <AlertTriangle size={16} />}
                            {toast.type === 'info' && <Info size={16} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-[#e2eaf8] text-sm font-semibold">{toast.title}</h4>
                            <p className="text-[#7a94bb] text-xs mt-1">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-[#3d5278] hover:text-[#e2eaf8] transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
