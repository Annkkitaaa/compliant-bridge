"use client";
import { useEffect } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastData {
  id:      string;
  type:    ToastType;
  title:   string;
  message?: string;
}

export function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const cfg = {
    success: { icon: <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />, border: "border-emerald-200" },
    error:   { icon: <XCircle    className="w-4 h-4 text-red-500    flex-shrink-0" />, border: "border-red-200"     },
    info:    { icon: <Info       className="w-4 h-4 text-blue-500   flex-shrink-0" />, border: "border-blue-200"    },
  }[toast.type];

  return (
    <div className={`flex items-start gap-3 bg-white border ${cfg.border} rounded-xl shadow-xl px-4 py-3 max-w-sm w-full animate-in slide-in-from-bottom-2`}>
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-500 mt-0.5 break-all">{toast.message}</p>
        )}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts:    ToastData[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/** Helper to generate a unique toast id */
export function toastId() {
  return Math.random().toString(36).slice(2);
}
