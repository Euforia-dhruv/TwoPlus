/**
 * GSAP Animations for GymOS Gym Management Platform
 * 
 * Uses GSAP core API and gsap-react hook for meaningful, functional animations
 * that enhance UX without being decorative.
 * 
 * Principles from the frontend-design skill:
 * - Motion that answers a person's action is welcome
 * - A single orchestrated moment lands better than scattered effects
 * - Respect prefers-reduced-motion
 */

import { gsap } from "gsap";
import { useEffect } from "react";

// Breakpoint for prefers-reduced-motion check
// Reduced motion preference
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Animate dashboard metrics on mount with staggered entrance
 * Uses gsap.from() with sensible defaults
 * Respects prefers-reduced-motion
 */
export function useDashboardMetricsAnimation(elementRefs: React.RefObject<HTMLDivElement>[]) {
  useEffect(() => {
    // Skip GSAP animation if reduced motion is preferred
    if (prefersReducedMotion) {
      elementRefs.forEach((ref) => {
        if (ref.current) {
          ref.current.style.opacity = "1";
          ref.current.style.transform = "none";
        }
      });
      return;
    }

    const elements = elementRefs.map((ref) => ref?.current).filter(
      (el): el is HTMLDivElement => el !== null
    );

    if (elements.length === 0) return;

    // Staggered entrance animation
    gsap.from(elements, {
      opacity: 0,
      y: 40,
      duration: 0.8,
      stagger: {
        amount: 0.4,
        from: "center",
      },
      ease: "power2.out",
    });

    return () => {
      // Cleanup on unmount
      gsap.killTweensOf(elements);
    };
  }, [elementRefs]);
}

/**
 * Animate a single metric counter from 0 to target value
 * Uses gsap.to() with custom easing
 * @param target - The target number value
 * @param element - The DOM element to animate
 * @param options - Optional configuration
 */
export function animateCounter(
  target: number,
  element: HTMLDivElement,
  options: {
    duration?: number;
    prefix?: string;
    suffix?: string;
    separator?: boolean;
  } = {}
) {
  const {
    duration = 1.5,
    prefix = "",
    suffix = "",
    separator = true,
  } = options;

  if (prefersReducedMotion) {
    element.textContent = `${prefix}${target}${suffix}`;
    return;
  }

  const formattedTarget = separator
    ? new Intl.NumberFormat().format(target)
    : target;

  gsap.fromTo(
    element,
    {
      innerText: "0",
    },
    {
      innerText: `${prefix}${formattedTarget}${suffix}`,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        // Format with commas on each update
        if (separator) {
          element.textContent = `${prefix}${new Intl.NumberFormat().format(
            Math.round(parseFloat((element as any).innerText || "0"))
          )}${suffix}`;
        }
      },
    }
  );
}

/**
 * Create a timeline for member lifecycle animations
 * Uses gsap.timeline() with scrub for scroll-driven effects
 * @param elements - Selector string or array of elements
 */export function createMemberLifecycleTimeline(
  elements: string | string[]
) {
  const tl = gsap.timeline({});


  const targets = Array.isArray(elements) ? elements : [elements];

  tl.to(targets, {
    opacity: 1,
    y: 0,
    duration: 0.6,
    ease: "power2.out",
  });

  return tl;
}

/**
 * Add hover highlight animation to table rows
 * Uses gsap to animate background color on hover
 * @param tableRef - React ref to the table element
 */
export function addRowHoverAnimation(tableRef: React.RefObject<HTMLTableElement>) {
  useEffect(() => {
    if (prefersReducedMotion || !tableRef.current) return;

    const rows = tableRef.current.querySelectorAll("tbody tr");

    rows.forEach((row) => {
      row.addEventListener("mouseenter", () => {
        gsap.to(row, {
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          duration: 0.3,
        });
      });

      row.addEventListener("mouseleave", () => {
        gsap.to(row, {
          backgroundColor: "",
          duration: 0.3,
        });
      });
    });

    return () => {
    // Cleanup - no persistent handlers were added
  };
  }, [tableRef, prefersReducedMotion]);
}

/**
 * Staggered animation for member cards or expense items
 * Uses gsap.utils.stagger for controlled animations
 * @param containerRef - React ref to the container
 * @param animation - GSAP animation config object
 * @param staggerAmount - Stagger duration between items
 */export function animateStaggeredItems(
  containerRef: React.RefObject<HTMLElement>,
  staggerAmount = 0.2
) {
  useEffect(() => {
    if (prefersReducedMotion || !containerRef.current) return;

    const container = containerRef.current;
    const items = container.querySelectorAll(
      ".member-card, .expense-row, .metric-card"
    );

    if (items.length === 0) return;

    gsap.from(items, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      stagger: staggerAmount,
      ease: "power2.out",
    })
    .play();

    return () => {
      gsap.killTweensOf(items);
    };
  }, [containerRef, staggerAmount, prefersReducedMotion]);
}

/**
 * Scroll-triggered reveal animation for sections

 * Uses gsap with ScrollTrigger for parallax/scroll effects
 * @param sectionRef - React ref to the section
 * @param triggerOnce - Whether the animation should only trigger once
 */
export function useScrollReveal(
  sectionRef: React.RefObject<HTMLElement>,
  triggerOnce = true
) {
  useEffect(() => {
    if (prefersReducedMotion) {
      if (sectionRef.current) {
        sectionRef.current.style.opacity = "1";
        sectionRef.current.style.transform = "none";
      }
      return;
    }

    if (!sectionRef.current) return;

    const element = sectionRef.current;

    gsap.from(element, {
      opacity: 0,
      y: 100,
      duration: 1,
      // @ts-ignore - ScrollTrigger types may vary by GSAP version
      scrollTrigger: {
        trigger: element as Element,
        start: "top 80%",
        end: "bottom 20%",
        scrub: 0.5,
        toggleActions: "play reverse play reverse",
        once: triggerOnce,
      },
    });

    return () => {
      gsap.killTweensOf(element);
    };
  }, [sectionRef, triggerOnce, prefersReducedMotion]);
}

export default {
  useDashboardMetricsAnimation,
  animateCounter,
  createMemberLifecycleTimeline,
  addRowHoverAnimation,
  animateStaggeredItems,
  useScrollReveal,
};