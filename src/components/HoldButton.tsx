// Hold to confirm. A single click does nothing, so a destructive submit cannot
// happen by reflex. Keyboard activation (Enter/Space, which reports detail 0)
// still submits at once.
import { useRef, useState, type CSSProperties, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  disabled?: boolean;
  holdMs?: number;
};

export function HoldButton({ children, disabled, holdMs = 650 }: Props) {
  const [fill, setFill] = useState(0);
  const frame = useRef(0);
  const fired = useRef(false);

  const stop = () => {
    cancelAnimationFrame(frame.current);
    setFill(0);
  };

  const begin = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    fired.current = false;
    const form = event.currentTarget.form;
    const started = performance.now();

    const tick = () => {
      const share = Math.min(1, (performance.now() - started) / holdMs);
      setFill(share);
      if (share < 1) {
        frame.current = requestAnimationFrame(tick);
      } else if (!fired.current) {
        fired.current = true;
        form?.requestSubmit();
      }
    };
    frame.current = requestAnimationFrame(tick);
  };

  return (
    <button
      type="submit"
      className="btn hold"
      disabled={disabled}
      style={{ "--hold": `${fill * 100}%` } as CSSProperties}
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={(event) => {
        // Keyboard reports detail 0 and submits at once. A pointer click never
        // submits: the requestSubmit above already ran when the hold completed.
        if (event.detail !== 0) event.preventDefault();
      }}
    >
      <span className="hold-fill" aria-hidden="true" />
      <span className="hold-label">{children}</span>
    </button>
  );
}
