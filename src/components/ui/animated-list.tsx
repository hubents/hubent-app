"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedListProps {
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};

const AnimatedList = ({
  children,
  className,
  staggerDelay = 0.1,
}: AnimatedListProps) => {
  return (
    <motion.ul
      variants={{
        ...containerVariants,
        visible: {
          ...containerVariants.visible,
          transition: { staggerChildren: staggerDelay },
        },
      }}
      initial="hidden"
      animate="visible"
      className={cn("space-y-2", className)}
    >
      {children.map((child, index) => (
        <motion.li key={index} variants={itemVariants}>
          {child}
        </motion.li>
      ))}
    </motion.ul>
  );
};

export { AnimatedList };
