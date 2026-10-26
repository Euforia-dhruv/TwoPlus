"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps {
  className?: string;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (props, ref) => {
    return (
      <div
        ref={ref}
        className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", props.className)}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";