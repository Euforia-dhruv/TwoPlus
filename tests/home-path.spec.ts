import { test, expect } from "@playwright/test";
import { homePathFor } from "../src/lib/member-api";

// Where a signed-in account lands decides whether a member ever reaches the
// claim screen. The bug this covers: an invited member who confirmed their
// email has no member row yet, was sent to /app, and was then bounced into the
// "set up your gym" form, so the only screen that can link their account was
// unreachable.

const base = { staffReadFailed: false, isStaff: false, hasMemberRow: false };

test.describe("homePathFor", () => {
  test("sends an invited member with no link yet to the claim screen", () => {
    // No member row and no gym name: this is someone whose gym added them.
    expect(homePathFor({ ...base })).toBe("/member");
  });

  test("sends a linked member to the member app", () => {
    expect(homePathFor({ ...base, hasMemberRow: true })).toBe("/member");
  });

  test("sends staff to the workspace even when they are also a member", () => {
    expect(homePathFor({ ...base, isStaff: true, hasMemberRow: true })).toBe("/app");
  });

  test("does not demote a staff account when the role read fails", () => {
    expect(homePathFor({ ...base, staffReadFailed: true })).toBe("/app");
  });

  test("finishes the gym a signup form started", () => {
    expect(homePathFor({ ...base, gymName: "CoreFit Studio" })).toBe("/onboarding");
  });

  test("ignores a blank gym name, which is what a member signup leaves behind", () => {
    expect(homePathFor({ ...base, gymName: "" })).toBe("/member");
  });
});
