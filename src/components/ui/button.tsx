"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const variantStyles = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "underline-offset-4 hover:underline text-primary hover:text-primary/90",
};

const sizeStyles = {
  default: "h-10 px-4 rounded text-sm font-semibold gap-2",
  sm: "h-8 px-3 rounded text-sm font-medium gap-1.5",
  lg: "h-11 px-6 rounded text-base font-semibold gap-2",
  icon: "h-10 w-10 rounded",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = "default",
      size = "default",
      className,
      children,
      type,
      ...rest
    } = props;

    const variantClassNames = variantStyles[variant] || variantStyles.default;
    const sizeClassNames = sizeStyles[size] || sizeStyles.default;

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantClassNames,
          sizeClassNames,
          className
        )}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";