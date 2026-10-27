-- TwoPlus.fit — 0003_workspace_theme
-- Per-workspace appearance: glass backdrop preset, light/dark mode, optional
-- custom background image.
--
-- No new RLS is needed: the existing "org update owner" policy on
-- public.organizations already lets an owner update their own row, and every
-- member already reads the row through "org read member". Staff therefore see
-- the workspace theme but cannot change it (enforced by RLS, not the UI).

alter table public.organizations
  add column theme_preset text not null default 'sage'
    check (theme_preset in ('sage','lagoon','blush','lilac')),
  add column theme_mode text not null default 'light'
    check (theme_mode in ('light','dark')),
  add column theme_image text
    check (theme_image is null or char_length(theme_image) <= 2000);
