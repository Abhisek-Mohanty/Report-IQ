"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ShieldCheck, Check, Brain, ArrowRight } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectUrl?: string;
}

export function LoginModal({
  isOpen,
  onClose,
  redirectUrl = "http://localhost:8000/api/v1/auth/google",
}: LoginModalProps) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleGoogleLogin = () => {
    window.location.href = redirectUrl;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop with Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl shadow-indigo-950/50 z-10 flex flex-col md:flex-row min-h-[500px]"
          >
            {/* =================================================================
                LEFT SIDE: ARTWORK & VISUAL SHOWCASE
               ================================================================= */}
            <div className="relative w-full md:w-5/12 h-56 md:h-auto overflow-hidden bg-slate-900 flex flex-col justify-between p-6">
              {/* Background Art Image */}
              <img
                src="/assets/login-art.jpg"
                alt="Report IQ AI Intelligence"
                className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-700 hover:scale-110"
              />

              {/* Gradient Overlays for Readability & Depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 to-transparent" />
              <div className="absolute inset-0 bg-indigo-950/20 mix-blend-overlay" />

              {/* Top Badge: Brand Tag */}
              <div className="relative z-10 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/90 backdrop-blur-md border border-indigo-400/30 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <Brain className="w-4 h-4" />
                </div>
                <div className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-semibold text-slate-200">
                  Report IQ Suite
                </div>
              </div>

              {/* Bottom Glass Card: Value Props */}
              <div className="relative z-10 space-y-2 p-3.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 shadow-lg">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Next-Gen Financial AI</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Automate cross-sheet validation, reconciliation, and policy compliance in seconds.
                </p>
                <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400 font-mono">
                  <span>&bull; Real-time AI</span>
                  <span>&bull; Local Data Privacy</span>
                </div>
              </div>
            </div>

            {/* =================================================================
                RIGHT SIDE: LOGIN CONTENT & GOOGLE AUTH BUTTON
               ================================================================= */}
            <div className="w-full md:w-7/12 p-8 sm:p-10 flex flex-col justify-between bg-slate-950 relative">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-all"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Top Title & Info */}
              <div className="space-y-4 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Authentication Required</span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-2xl font-bold font-display text-white tracking-tight">
                    Welcome to Report IQ
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sign in to access AI Insights, Copilot Chat, Query Agents, and Automated Policy Reconciliation.
                  </p>
                </div>

                {/* Features List */}
                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>Instant single sign-on with your enterprise account</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>Zero spreadsheet exfiltration &bull; Client-side security</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>Full access to AI Validator &amp; Scenario Rule Engines</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Google Login */}
              <div className="space-y-4 pt-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm shadow-lg shadow-white/5 hover:shadow-indigo-500/10 transition-all duration-200 border border-slate-200 group active:scale-[0.99]"
                >
                  {/* Official Google Vector Logo */}
                  <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* Footer Disclaimer */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-900">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>256-bit encrypted authentication</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
