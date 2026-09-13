"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Info, XCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

let toastListeners: Array<(t: ToastMessage) => void> = [];

export const toast = {
  show: (message: string, type: ToastType = "success", duration = 3500) => {
    const id = Math.random().toString(36).substring(2, 9);
    toastListeners.forEach((listener) => listener({ id, message, type, duration }));
  },
  success: (message: string, duration?: number) => toast.show(message, "success", duration),
  error: (message: string, duration?: number) => toast.show(message, "error", duration),
  warning: (message: string, duration?: number) => toast.show(message, "warning", duration),
  info: (message: string, duration?: number) => toast.show(message, "info", duration),
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const addToast = (newToast: ToastMessage) => {
      setToasts((prev) => [...prev, newToast]);
      
      if (newToast.duration !== 0) {
        setTimeout(() => {
          removeToast(newToast.id);
        }, newToast.duration || 3500);
      }
    };

    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== addToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            layout
            className="flex items-start gap-3 p-4 rounded-xl border border-border shadow-lg bg-card/95 backdrop-blur-md text-foreground overflow-hidden"
          >
            {/* Left Status Icon */}
            <div className="mt-0.5 flex-shrink-0">
              {t.type === "success" && <CheckCircle className="h-5 w-5 text-success" />}
              {t.type === "error" && <XCircle className="h-5 w-5 text-danger" />}
              {t.type === "warning" && <AlertCircle className="h-5 w-5 text-warning" />}
              {t.type === "info" && <Info className="h-5 w-5 text-primary" />}
            </div>

            {/* Content */}
            <div className="flex-1 text-sm font-medium">{t.message}</div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 rounded-lg p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
