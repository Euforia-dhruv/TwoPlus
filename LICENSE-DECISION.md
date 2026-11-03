# License decision required

This repository has no `LICENSE` file, so under default copyright law it is
**all rights reserved**: nobody may copy, modify, or redistribute it, including
contributors outside the owner's organization.

Choosing a license is the owner's decision, not an engineering one. It changes
who may use the code, whether competitors may run it, and whether a future sale
or open-source release is possible or implicitly given away. Nothing in this repo
should be read as having made that choice.

## The realistic options

**Stay proprietary (no license).** Keep the current all-rights-reserved default.
Suits a commercial SaaS where the source is not the product. Nothing to add; the
status quo is already this. Adding a short `LICENSE` that says "Copyright (C)
2026 TwoPlus. All rights reserved." makes it explicit rather than implicit.

**Proprietary with a commercial license.** Same as above, but the file states
that use requires a written agreement, which is what a future enterprise or
white-label deal would reference.

**MIT or Apache-2.0.** Permissive open source. Anyone may use, modify, and sell,
provided they keep the notice. Apache-2.0 additionally grants patent rights and
requires stating changes, which some companies prefer. Both make it legal for
others to run a competing hosted service on this code.

**AGPL-3.0.** Open source, but anyone offering the software as a network service
must publish their modifications. This is the common choice for a SaaS that
wants to publish code without letting a closed competitor host it.

**Business Source License (BUSL).** Source-available: usable in production
except for competing with the owner's service, converting to a real open-source
license after a set period. Custom, and needs the exact terms written down.

## What the decision affects

- Whether the mobile stores and desktop distribution can name a license in their
  listings.
- Whether third parties may self-host.
- Whether an acquisition can assume the code is unencumbered.
- Whether contributed code can be merged without a contributor agreement.

## To close this item

1. Choose one of the options above (or another).
2. Add `LICENSE` with the full text. For MIT, Apache-2.0, or AGPL-3.0, use the
   canonical text from `spdx.org/licenses`, with the copyright line filled in.
3. Replace the "License" section of `README.md` with the chosen license name and
   a link to the file.
4. If the license is permissive, add the same notice to `package.json`
   (`"license": "MIT"`).

No assistant should make this choice on the owner's behalf, which is why this
file exists instead of a `LICENSE`.
