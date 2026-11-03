## What this changes

<!-- One or two sentences. What is different for a user after this lands? -->

## Why

<!-- The problem, or the issue this closes. Link it. -->

Closes #

## What it does not change

<!-- Anything a reviewer might assume is included but is not. Write "nothing" if truly nothing. -->

## How it was verified

<!-- Commands and their result. A pass count, not just "tests pass". -->

```
npm run check
npm run test
```

## Checklist

- [ ] `npm run check` passes (types, build, lint)
- [ ] `npm run test` passes, or the specs that could not run are named below
- [ ] New tables have RLS enabled and policies in the same migration
- [ ] New queries against gym data filter by `organization_id`
- [ ] New org-scoped write policies call `org_has_role()`
- [ ] No secrets, `.env` values, or session tokens in the diff
- [ ] A new migration was added rather than an applied one edited
- [ ] Screens changed: checked at 390, 1024 and 1440 px in light and dark

## Not verified

<!-- The part you could not test, and why. Delete if everything was verified. -->

## Screenshots

<!-- For a UI change, before and after. Delete otherwise. -->
