"use client";

import type React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimatedButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children?: React.ReactNode;
};

const AnimatedButton = ({
  children,
  className = "",
  type = "button",
  disabled,
  ...props
}: AnimatedButtonProps) => (
  <AnimatedButtonMotion
    {...props}
    type={type}
    disabled={disabled}
    className={className}
  >
    {children}
  </AnimatedButtonMotion>
);

function AnimatedButtonMotion({
  children,
  className,
  type,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      {...props}
      type={type}
      disabled={disabled}
      whileHover={disabled || reduceMotion ? undefined : { y: -1, scale: 1.01 }}
      whileTap={disabled || reduceMotion ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={cn("animated-button", className)}
    >
      <span className="animated-button__label">{children}</span>
    </motion.button>
  );
}

export default AnimatedButton;
