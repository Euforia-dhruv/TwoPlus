import { useRef, useState, type KeyboardEvent } from "react";
import "./rubber-segment.css";

// Compact segmented control with a rubber thumb. Behavior contract:
// click/tap selects, arrow keys move selection, Home/End jump, and the thumb
// animates between segments. Reduced motion disables the spring.
export type RubberSegmentOption = { value: string; label: string };

export function RubberSegment({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: RubberSegmentOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [dragging, setDragging] = useState(false);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const select = (i: number) => {
    const next = Math.max(0, Math.min(options.length - 1, i));
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      select(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      select(index - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(0);
    } else if (e.key === "End") {
      e.preventDefault();
      select(options.length - 1);
    }
  };

  return (
    <div
      className={`rubber-segment${disabled ? " is-disabled" : ""}${dragging ? " is-dragging" : ""}`}
      role="tablist"
      aria-label="Setup views"
    >
      <div
        className="rubber-segment__thumb"
        style={{
          width: `${100 / options.length}%`,
          transform: `translateX(${index * 100}%)`,
        }}
        aria-hidden="true"
      />
      {options.map((option, i) => (
        <button
          key={option.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={i === index}
          tabIndex={i === index ? 0 : -1}
          disabled={disabled}
          onPointerDown={() => setDragging(true)}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
          onClick={() => onChange(option.value)}
          onKeyDown={onKeyDown}
          className={i === index ? "is-active" : ""}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
