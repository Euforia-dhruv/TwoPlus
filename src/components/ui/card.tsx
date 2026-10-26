"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps {
  className?: string;
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (props, ref) => {
    const { className, children } = props;

    return (
      <div
        ref={ref}
        className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";