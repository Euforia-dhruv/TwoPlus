# Implementation Plan

Execution order for the findings in `AUDIT.md`. Ordered by risk removed per unit
of change, not by how interesting the work is. Each item states what "done"
means, so progress is checkable rather than assertable.

## Sequence

### 1. Unify the animation system — DONE

`framer-motion` duplicated `motion/react`. Swap seven import lines, remove the
package.

- **Done when:** no `framer-motion` import remains, `package.json` has no
  `framer-motion`, `tsc -b` and `npm run build` exit 0.
- **Result:** done. 7 files swapped, package removed, all gates green.

### 2. Repair the screenshot harness — DONE

`scripts/shots.mjs` targeted selectors that no longer exist and reported success
while capturing the wrong page.

- **Done when:** it signs in, captures a named workspace screen, and exits
  non-zero on any page error or overflow.
- **Result:** done. Verified against the real Members screen at 390/1024/1440.

### 3. Accessibility: name the side dock links — CHECKED, NOT A DEFECT

The 64 px dock is icon-only, so I expected unnamed links. A browser probe
(`scripts/_a11y-probe.mjs`) showed every one of the 8 dock links already carries
`aria-label` and `title` from `NAV_CATEGORIES`, and focus is a visible 2 px
outline (`rgb(14,122,108)`). No change made; the finding was wrong.

- **Result:** verified in a real browser, recorded in `AUDIT.md` C1 as checked.

### 4. React correctness: the 8 real lint findings — DEFERRED WITH REASON

Four `setState`-in-effect and four refs-read-during-render.

- **Decision:** not changed this session. Each of these is behaviour-bearing:
  the four effects gate loading state and org sync, and the four ref reads feed
  measured geometry for animations. "Fixing" them without a failing test to
  reproduce would be guessing at live timing. They are catalogued in `ISSUES.md`
  with file and line so they can be addressed behind a real reproduction.
- **Done when (future):** a test reproduces the double-render or stale-ref
  symptom, then the fix lands with that test.

### 5. Remove dead tokens and unused mobile imports — DONE

The mobile half was real: 16 unused imports removed across five files, `mobile/`
`tsc --noEmit` exits 0.

The token half was **not** a defect. `--lime`/`--lavender` looked like dead
accents; they are in fact referenced 79 times across 8 files as the
light-on-dark ink colour. Only the names mislead. Recorded, not renamed.

- **Result:** done. Lint dropped 27 → 17 warnings, all remaining ones catalogued.

### 6. Tighten the two real `any` types — DONE

`animated-number.tsx` now types `variants` as `Variants`; `animated-tooltip.tsx`
takes `MouseEvent<HTMLImageElement>` and reads `event.currentTarget.offsetWidth`,
since `target` is only an `EventTarget`. `tsc -b` exits 0, and no `: any`
remains in `src/`.

### 7. Split `App.tsx` — DEFERRED, needs a decision

184 KB / 47 `useState` in one component. The largest maintainability risk in the
project, and the only item here that is not a bounded fix. Doing it blind would
risk the working flows the tests cover.

- **Why deferred:** it is a multi-hour structural change with real regression
  surface. Seeking owner confirmation of approach before starting.
- **Proposed seam:** extract one module panel at a time (Members first, it is the
  most exercised), keeping state in the parent until the last step. Each
  extraction is verified by the existing suite before the next.

### 8. Migrations on the live database — BLOCKED ON OWNER APPROVAL

`members.photo_url` is missing, so saving a member photo fails. One idempotent
line:

```sql
alter table public.members add column if not exists photo_url text;
```

- **Blocked because:** it writes to the live database. Requires explicit
  approval.
- **Also outstanding:** only 3 of 16 migrations are recorded, so the history is
  inaccurate and the next `db push` is unreliable. Reconciling that needs a
  decision on whether the remaining migrations are already fully applied.

## Not planned, with reasons

| Item | Reason |
| --- | --- |
| Payment gateway | No provider account exists. Recording a real payment is honest; simulating a charge is not. |
| SMS / email / push | No delivery provider. The UI already says nothing was sent. |
| Error tracking service | None connected; the boundary exposes `recentErrors()` as the hook. |
| Code splitting `App.tsx` further | Being handled as item 7. |
| Replacing any part of the stack | Outside this audit's mandate and not justified by findings. |
| New dependencies for animation | `motion` already covers everything in use. |

## Definition of done for the whole audit

- `npx tsc -b` exit 0
- `npm run build` exit 0
- `npx oxlint src` no warnings outside the three fast-refresh ones
- `npx playwright test` 42/42, or the one documented flake explained
- Every changed screen inspected in a browser at 390 and 1440
- `AUDIT.md`, `SKILL_PROGRESS.md` and `ISSUES.md` reflect the final state
