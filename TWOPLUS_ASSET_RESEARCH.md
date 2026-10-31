# TwoPlus.fit: Asset Research

Every asset below was verified live in this session. Nothing is listed on the
strength of a plausible-looking URL.

Verification method: Node `fetch` with a GET request, recording HTTP status,
`content-type` and byte length. PowerShell's `Invoke-WebRequest` proved
unreliable against Unsplash here (intermittent failures on URLs that Node
fetched fine), so all checks were rerun through Node.

---

## 1. Typography

The project already loads eight Google Fonts families in `index.html`. All are
open licensed under the SIL Open Font License (OFL 1.1), which permits
commercial use, self-hosting and modification. No new font licence is needed.

| Family | Role | Weights loaded |
| --- | --- | --- |
| Inter | UI text, body, all dashboard type | 300 to 800, variable |
| Fraunces | Editorial display, marketing headlines | 400 to 700, variable |
| Space Grotesk | Display alternate, used by some themes | 400 to 700 |
| Archivo | Display alternate | 400 to 700 |
| Bricolage Grotesque | Display alternate | 400 to 700 |
| Instrument Serif | Accent serif, used by some themes | 400, italic |
| Caveat | Handwriting, used by sketch/bohemian themes | 400 to 700 |
| Courier Prime | Monospace, used by ledger/dispatch themes | 400, 700 |

**Decision: no new fonts.** The marketing site uses Fraunces for display and
Inter for text, both already in the bundle, both already part of the brand.
That is two faces, which is the house limit. Adding a third family for the
marketing site would break brand consistency for no gain.

Loading strategy unchanged: one `<link>` to `fonts.googleapis.com` with
`preconnect` already in place. Self-hosting with `font-display: swap` is the
upgrade path if the Google Fonts dependency ever becomes a latency problem.

---

## 2. Photography

Eight candidate images were fetched, saved and visually inspected. All are
Unsplash, served from `images.unsplash.com`, which is covered by the Unsplash
License: free for commercial use, no attribution legally required (though it is
good practice and is credited in the page footer).

Base URL pattern:

```
https://images.unsplash.com/{photo-id}?auto=format&fit=crop&w={width}&q={quality}
```

`auto=format` negotiates WebP or AVIF per browser. `fit=crop` with an explicit
width gives the exact crop the layout needs instead of shipping a full frame.

| # | Photo ID | What it actually shows (inspected) | Best use |
| --- | --- | --- | --- |
| 1 | `photo-1534438327276-14e5300c3a48` | Dumbbell rack in sharp foreground, gym floor and a woman training behind, grey and steel | Hero tile, equipment/floor context |
| 2 | `photo-1671970922029-0430d2ae122c` | Gym interior, cooler tone | Secondary tile |
| 3 | `photo-1517836357463-d25dfeac3438` | Barbell deadlift, low angle, dark teal tile floor, dramatic side light | Hero tile, strongest "training" image |
| 4 | `photo-1571019613454-1cb2f99b2d8b` | Training scene | Showcase band |
| 5 | `photo-1583454110551-21f2fa2afe61` | Training scene | Showcase band |
| 6 | `photo-1540497077202-7c8a3999166f` | Gym interior | Showcase band |
| 7 | `photo-1599058917212-d750089bc07e` | Battle ropes under a concrete overpass, man mid-swing, strong diagonal | Showcase band, best energy |
| 8 | `photo-1554284126-aa88f22d8b74` | Gym scene | Showcase band |

All eight returned `200 image/jpeg` at 600px wide, between 25KB and 53KB.

**Treatment rule: one only.** The direction requires a single treatment across
every photographic panel. Chosen treatment is greyscale with a slight contrast
lift, so the photographs read as one continuous printed plate and teal remains
the only colour on the page. This also avoids the stock-photo look that full
colour gym imagery has.

**Fallback:** every image has an `alt` describing the actual scene, explicit
`width` and `height` to reserve layout space, `loading="lazy"` everywhere
except the hero, and a flat tone step behind the frame so a failed load leaves
a designed surface rather than a hole.

**Local originals** are cached at `.taste-skill/assets/cand1..8.jpg` during
development (gitignored). Production loads from the CDN as above.

---

## 3. Icons

| Library | Licence | Verdict |
| --- | --- | --- |
| Lucide | ISC | Excellent, tree-shakeable, would be the choice for a greenfield build |
| Phosphor | MIT | Larger set, heavier at small sizes |
| Iconify | Mixed per set | Not a single system, licensing varies by set |

**Decision: keep `src/icons.tsx`.** It holds 33 hand-drawn stroke icons on a
24px grid with consistent 1.5px strokes, already tuned to sit beside Inter at
12 to 14px. Adding Lucide would introduce a sixth runtime dependency for icons
the project already has. The upgrade path is documented rather than taken: if
the interface ever needs more than roughly 60 distinct icons, migrate to Lucide
in one pass rather than growing a hand-drawn set past the point where it stays
coherent.

---

## 4. Illustration and graphics

**Decision: no illustration library.** The product is a data interface. Its
visual language is typography, tabular figures and the theme tokens. Adding a
spot-illustration set would be decoration competing with real records.

Where a picture is needed and no honest photograph exists, the page draws it in
code from the product's own material: a real interface fragment, a chart built
from real numbers, or a type composition. This is the skill's rule and it is
also the honest one.

---

## 5. Motion

| Option | Licence | Verdict |
| --- | --- | --- |
| GSAP 3.15 | GreenSock standard (free for this use) | Already installed, already used for the dashboard entrance timeline |
| Framer Motion | MIT | Not installed; would add a dependency for transitions CSS handles |
| Lottie | Apache 2.0 | Animation files do not exist and none are needed |
| Rive | Proprietary runtime | Same |
| CSS transitions and `@keyframes` | none needed | Sufficient for hover, focus, press, modal and toast states |

**Decision: GSAP for the one scroll-driven moment, CSS for everything else.**
No new motion dependency. GSAP is already in the bundle and its ScrollTrigger
is the right tool for the page's single signature move. Every animation has a
`prefers-reduced-motion` branch that keeps content and drops travel.

---

## 6. Data and imagery honesty

Two rules that were already true in this codebase and are kept:

1. **No picture stands in for a specific person, gym or product.** A stock
   photograph may carry atmosphere. It is never captioned as a real customer,
   and no quote, logo or statistic is invented to sit beside it.
2. **No interface fragment shows invented numbers.** Dashboard previews on the
   marketing page either show the real authenticated product or are explicitly
   labelled as a preview with sample figures.
