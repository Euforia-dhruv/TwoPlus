-- Optional profile photo for members. A URL only: the gym pastes a hosted
-- image or their own CDN link. No stock imagery is ever filled in.
-- Re-runnable.

alter table public.members
  add column if not exists photo_url text;
