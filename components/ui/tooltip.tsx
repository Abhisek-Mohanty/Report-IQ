"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({ content, children, position = "top", className }: TooltipProps) {
  const [active, setActive] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      {children}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-[100] px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 rounded shadow-md whitespace-nowrap pointer-events-none",
              {
                "bottom-full left-1/2 -translate-x-1/2 mb-2": position === "top",
                "top-full left-1/2 -translate-x-1/2 mt-2": position === "bottom",
                "right-full top-1/2 -translate-y-1/2 mr-2": position === "left",
                "left-full top-1/2 -translate-y-1/2 ml-2": position === "right",
              },
              className
            )}
          >
            {content}
            {/* Arrow */}
            <div
              className={cn("absolute border-4 border-transparent", {
                "top-full left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-slate-800": position === "top",
                "bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-slate-800": position === "bottom",
                "left-full top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-slate-800": position === "left",
                "right-full top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-slate-800": position === "right",
              })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
