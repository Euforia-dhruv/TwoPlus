"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const variantStyles = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "underline-offset-4 hover:underline text-primary hover:text-primary/90",
};

const sizeStyles = {
  default: "",
  sm: "h-8 px-3 rounded text-sm",
  lg: "h-10 px-8 rounded text-lg",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const variant = props.variant ?? "default";
    const size = props.size ?? "default";
    const asChild = props.asChild ?? false;

    const VariantClassNames = variantStyles[variant] || variantStyles.default;
    const SizeClassNames = sizeStyles[size] || sizeStyles.default;

    if (asChild) {
      return <Slot.AsChild>{({ className }) => <button className={cn(VariantClassNames, SizeClassNames, className)} {...props} />}</Slot.AsChild>;
    }

    return (
      <button
        ref={ref}
        className={cn("inline-flex items-center justify-center", VariantClassNames, SizeClassNames, props.className)}
        {...props}
      >
        {props.children}
      </button>
    );
  }
);

Button.displayName = "Button";