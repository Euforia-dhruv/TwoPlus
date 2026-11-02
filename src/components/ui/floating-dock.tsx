"use client";
/**
 * Note: Use position fixed according to your needs
 * Desktop navbar is better positioned at the bottom
 * Mobile navbar is better positioned at bottom right.
 **/

import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import { useRef, useState } from "react";

export type FloatingDockItem = { title: string; icon: React.ReactNode; href: string };

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
  vertical = false,
  activeTitle,
}: {
  items: FloatingDockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
  vertical?: boolean;
  activeTitle?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop
        items={items}
        className={desktopClassName}
        vertical={vertical}
        activeTitle={activeTitle}
      />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: {
                    delay: idx * 0.05,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
              >
                <a
                  href={item.href}
                  key={item.title}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.href);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-neutral-900"
                >
                  <div className="h-4 w-4">{item.icon}</div>
                </a>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-neutral-800"
      >
        <IconLayoutNavbarCollapse className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
  vertical = false,
  activeTitle,
}: {
  items: FloatingDockItem[];
  className?: string;
  vertical?: boolean;
  activeTitle?: string;
}) => {
  const mouse = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouse.set(vertical ? e.clientY : e.pageX)}
      onMouseLeave={() => mouse.set(Infinity)}
      className={cn(
        "mx-auto hidden h-16 items-end gap-4 rounded-2xl bg-gray-50 px-4 pb-3 md:flex dark:bg-neutral-900",
        vertical && "h-auto w-[64px] flex-col items-center gap-2 px-2 py-2.5",
        className,
      )}
    >
      {items.map((item) => (
        <IconContainer
          mouse={mouse}
          key={item.title}
          vertical={vertical}
          activeTitle={activeTitle}
          {...item}
        />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouse,
  title,
  icon,
  href,
  vertical = false,
  activeTitle,
}: {
  mouse: MotionValue;
  title: string;
  icon: React.ReactNode;
  href: string;
  vertical?: boolean;
  activeTitle?: string;
}) {
  let ref = useRef<HTMLDivElement>(null);

  let distance = useTransform(mouse, (val) => {
    let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0, height: 0 };
    return vertical ? val - bounds.y - bounds.height / 2 : val - bounds.x - bounds.width / 2;
  });

  let widthTransform = useTransform(distance, [-150, 0, 150], [40, 62, 40]);
  let heightTransform = useTransform(distance, [-150, 0, 150], [40, 62, 40]);

  let widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 32, 20]);
  let heightTransformIcon = useTransform(
    distance,
    [-150, 0, 150],
    [20, 32, 20],
  );

  let width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  let widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);
  const selected = hovered || title === activeTitle;
  const navigate = useNavigate();

  return (
    <a
      href={href}
      aria-label={title}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
    >
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "relative flex aspect-square items-center justify-center rounded-full",
          selected ? "bg-gray-300 dark:bg-neutral-700" : "bg-gray-200 dark:bg-neutral-800",
        )}
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, x: vertical ? -6 : 0, y: vertical ? 0 : 10 }}
              animate={{ opacity: 1, x: vertical ? 0 : "-50%", y: vertical ? 0 : 0 }}
              exit={{ opacity: 0, x: vertical ? -4 : 0, y: vertical ? 0 : 2 }}
              className={cn(
                "w-fit whitespace-pre rounded-md border px-2 py-0.5 text-xs",
                "border-gray-200 bg-gray-100 text-neutral-700",
                "dark:border-neutral-900 dark:bg-neutral-800 dark:text-white",
                vertical
                  ? "absolute left-full top-1/2 ml-3 -translate-y-1/2"
                  : "absolute -top-8 left-1/2 -translate-x-1/2",
              )}
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className={cn(
            "flex items-center justify-center",
            selected
              ? "text-neutral-900 dark:text-white"
              : "text-neutral-500 dark:text-neutral-400",
          )}
        >
          {icon}
        </motion.div>
      </motion.div>
    </a>
  );
}
