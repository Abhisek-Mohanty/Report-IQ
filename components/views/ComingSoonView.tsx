"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, Send, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { motion } from "framer-motion";

interface ComingSoonProps {
  title: string;
  description: string;
  features: string[];
}

export function ComingSoonView({ title, description, features }: ComingSoonProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitted(true);
    toast.success("Notification request registered! We'll keep you updated.");
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto text-center">
      {/* Decorative Glow Ring */}
      <div className="relative mb-6">
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/30 to-violet-500/30 blur-xl -z-10"
        />
        <div className="h-20 w-20 rounded-2xl bg-card border border-border flex items-center justify-center shadow-lg text-primary">
          <Sparkles className="h-10 w-10 animate-pulse" />
        </div>
      </div>

      {/* Main Headers */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-semibold mb-4 uppercase tracking-wider">
        <Rocket className="h-3 w-3" />
        <span>Coming Soon</span>
      </div>
      
      <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4 leading-tight">
        {title}
      </h2>
      
      <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mb-8 leading-relaxed font-medium">
        {description}
      </p>

      {/* Expected Capabilities List */}
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm text-left">
        <h3 className="font-display font-semibold text-sm text-foreground uppercase tracking-wider mb-4">
          Capabilities in Development
        </h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/80 font-medium">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Subscription Notify Box */}
      <div className="w-full max-w-md bg-card/60 backdrop-blur border border-border p-4 rounded-xl shadow-inner">
        {submitted ? (
          <div className="text-xs text-success font-semibold flex items-center justify-center gap-2 py-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>You've subscribed for release updates!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              placeholder="Enter email for beta notification..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-background text-foreground border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium"
              required
            />
            <Button type="submit" size="sm" className="gap-1.5">
              <Send className="h-3 w-3" />
              <span>Notify Me</span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
