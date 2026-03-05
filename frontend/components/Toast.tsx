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
    success: { icon: <CheckCircle className="w-4 h-4 text-[#16C784] flex-shrink-0" />, borderColor: "rgba(22,199,132,0.3)" },
    error:   { icon: <XCircle    className="w-4 h-4 text-[#EA3943] flex-shrink-0" />,  borderColor: "rgba(234,57,67,0.3)"  },
    info:    { icon: <Info       className="w-4 h-4 text-[#375BD2] flex-shrink-0" />,  borderColor: "rgba(55,91,210,0.3)"  },
  }[toast.type];

  return (
    <div
      className="flex items-start gap-3 rounded-xl shadow-2xl px-4 py-3 max-w-sm w-full animate-in slide-in-from-bottom-2"
      style={{ background: "#13151A", border: `1px solid ${cfg.borderColor}` }}
    >
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-[#8892A4] mt-0.5 break-all">{toast.message}</p>
        )}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="text-[#4A5568] hover:text-[#8892A4] flex-shrink-0 transition-colors">
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

export function toastId() {
  return Math.random().toString(36).slice(2);
}
