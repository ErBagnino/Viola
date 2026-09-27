"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

// A soft fade between pages. Opacity only: a transform here would break the
// full-screen (position: fixed) experiences inside pages.
export default function ViolaTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
