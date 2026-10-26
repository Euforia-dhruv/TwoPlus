"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type DockIcon = React.ComponentType<{ className?: string }>;

export interface DockItem {
  title: string;
  icon: DockIcon;
  onClick?: () => void;
  href?: string;
}

export interface GlassDockProps extends React.HTMLAttributes<HTMLDivElement> {
  items: DockItem[];
  dockClassName?: string;
}

export const GlassDock = React.forwardRef<HTMLDivElement, GlassDockProps>(
  ({ items, className, dockClassName, ...props }, ref) => {
    const reduceMotion = useReducedMotion();
    const hoverMotion = reduceMotion ? undefined : { scale: 1.1, y: -3 };

    return (
      <div ref={ref} className={cn("glass-dock-wrap", className)} {...props}>
        <div className={cn("glass-dock", dockClassName)}>
          {items.map(({ title, icon: Icon, onClick, href }) => (
            <div className="glass-dock-entry" key={title}>
              {href ? (
                <motion.a
                  href={href}
                  onClick={onClick}
                  className="glass-dock-item"
                  aria-label={title}
                  whileHover={hoverMotion}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 360, damping: 24 }}
                >
                  <Icon className="glass-dock-icon" />
                </motion.a>
              ) : (
                <motion.button
                  type="button"
                  onClick={onClick}
                  className="glass-dock-item"
                  aria-label={title}
                  whileHover={hoverMotion}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 360, damping: 24 }}
                >
                  <Icon className="glass-dock-icon" />
                </motion.button>
              )}
              <span className="glass-dock-tooltip" aria-hidden="true">
                {title}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

GlassDock.displayName = "GlassDock";

export default GlassDock;
