import { test, expect } from "@playwright/test";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { ErrorBoundary } from "../src/components/ErrorBoundary";

// The boundary is the only thing between a render bug and a blank page, so it
// gets tested without a browser: constructing the class and calling render()
// returns the same element tree React would mount, and walking it proves the
// fallback carries the message and both escape routes.
//
// Testing the markup this way avoids shipping a deliberately-crashing fixture
// page into dist/ just so a test can navigate to it.

function walk(node: ReactNode, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, out);
  } else if (isValidElement(node)) {
    out.push(node);
    walk((node.props as { children?: ReactNode }).children, out);
  }
  return out;
}

function crashed(message: string) {
  const boundary = new ErrorBoundary({ children: null });
  // Same state React produces from getDerivedStateFromError.
  boundary.state = ErrorBoundary.getDerivedStateFromError(new Error(message));
  return walk(boundary.render());
}

function text(elements: ReactElement[]): string {
  return elements
    .flatMap((element) => {
      const children = (element.props as { children?: ReactNode }).children;
      return typeof children === "string" ? [children] : [];
    })
    .join(" ");
}

test("a render error shows the message and both ways out", () => {
  const elements = crashed("members.map is not a function");
  const visible = text(elements);

  expect(visible).toContain("Something broke on this screen");
  // The reassurance matters: a crash must not read as data loss.
  expect(visible).toContain("Your data is not lost");
  // The thrown message is shown verbatim; that is the one useful diagnostic.
  expect(visible).toContain("members.map is not a function");

  const buttons = elements.filter((element) => element.type === "button");
  expect(buttons.map((button) => text([button]))).toEqual([
    "Reload",
    "Go to sign in",
  ]);
});

test("the fallback is announced and is not the loading splash", () => {
  const elements = crashed("boom");
  const field = elements.find(
    (element) => (element.props as { className?: string }).className === "splash",
  );

  // role=alert, without aria-live: screen readers interrupt for an alert, which
  // is right for a crash and wrong for every ordinary "loading" splash.
  expect(field).toBeDefined();
  const props = field!.props as { role?: string; "aria-live"?: string };
  expect(props.role).toBe("alert");
  expect(props["aria-live"]).toBeUndefined();
});

test("no error means children pass straight through", () => {
  const element = <p>the app</p>;
  const boundary = new ErrorBoundary({ children: element });
  expect(boundary.render()).toBe(element);
});
