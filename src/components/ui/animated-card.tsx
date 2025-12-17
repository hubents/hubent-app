"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}

const AnimatedCard = ({
  children,
  className,
  delay = 0,
  hover = true,
}: AnimatedCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={hover ? { y: -4, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" } : undefined}
      className={cn(
        "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export { AnimatedCard };
