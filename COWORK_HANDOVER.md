# Blessings — Handover for Steps 5–8

## What this project is

Blessings is a mobile-first Next.js (App Router, TypeScript) wellbeing app. A user's small acts of self-care grow a plant on their home screen. The authoritative spec is [PRODUCT_SPEC.md](PRODUCT_SPEC.md) in the repo root — read it in full before writing any code. It defines the DB schema, RPC functions, the psychological/copy rules, and the design system.

**Critical override to the spec:** all UI copy must be in **English**, not the German shown in the spec's tables/examples. Everything else in the spec (schema, RPCs, RLS, design tokens, the non-negotiable psychological rules) still applies exactly as written.

## Done so far (Steps 1–4)

- **Step 1 — Foundation:** Next.js + TypeScript + Tailwind v4, Supabase client/server/middleware files, route protection middleware, design tokens in `app/globals.css`, Inter font.
- **Step 2 — Database:** All tables, RPCs, RLS policies, and the profile/plant auto-creation trigger are live in Supabase. Migration files are in `supabase/migrations/`:
  - `0001_init.sql` — the spec's SQL verbatim
  - `0002_fix_handle_new_user_search_path.sql` — **bug fix**: the `handle_new_user` trigger needed `SET search_path = public` or signup failed with a 500 ("Database error saving new user")
  - `0003_fix_profiles_rls_recursion.sql` — **bug fix**: the spec's "admin read profiles" RLS policy caused infinite recursion (Postgres 42P17) because it queried `profiles` from within a policy on `profiles`. Fixed via a `SECURITY DEFINER` `is_admin()` helper function, now used by all four admin-read policies.
  - `task_library` is currently **empty** — no seed rows exist yet. `generate_daily_tasks` runs fine but inserts nothing until real task content is added.
- **Step 3 — Auth:** Login, signup, `/auth/callback`, and `/onboarding` (Monstera-only) all built and verified end-to-end against the live Supabase project.
- **Step 4 — Home screen:** Built and then **redesigned per user feedback**, diverging from the spec's original home screen layout:
  - Plant image is the sole centerpiece — large, centered, generous white space around it
  - "You are here." text was **removed** entirely
  - The boxed/bordered morning check-in prompt was **removed** — replaced with a plain-text 1–6 energy picker directly on the home screen (`components/checkin/EnergyPicker.tsx`) that saves immediately and calls `generate_daily_tasks`
  - **Tasks were moved off the home screen onto their own `/tasks` page** — this is a deliberate deviation from the spec, which originally put tasks on the home screen. Bottom nav is now 5 items: Home / Tasks / Check-in / Rewind / Settings (spec says 4; Tasks was added as a 5th).
  - Plant images: the user's own 13 Monstera photos live in `public/plants/monstera/`, mapped down to the spec's 8 phases (phase-0.jpg … phase-7.jpg), each cropped to a centered square via Pillow (not a naive center-crop — the mature-plant photos needed a different crop box than the seedling photos, since plant position/size varies a lot across the source photos).
  - **Bug fixed:** `TaskCard`/`TasksClient` originally swallowed RPC errors silently (a failed `complete_task` call looked like "nothing happened, can't click"). Fixed so `onComplete` returns a success boolean, the water-drop animation only fires on real success, and a gentle inline error message shows on failure.

## What's left (Steps 5–8) — build in this order, confirm with the user after each

- **Step 5 — Check-in page (`/checkin`):** Full Morgen/Abend consolidated page per spec section 11. Note the home screen now already has a quick energy-only picker, so `/checkin` should handle the **rest**: sleep quality, hydration, mental load (all optional), plus the full Abend section (journal entry + visibility toggle, tomorrow's goal + visibility toggle, steps checkbox calling `award_steps`, yesterday's goal display calling `award_goal_completed`). Reconcile with the existing home-screen energy picker rather than duplicating it — maybe check-in's Morgen section only appears if energy wasn't already set today.
- **Step 6 — Rewind (`/rewind`):** Cumulative stats page, no negative framing, per spec section 11.
- **Step 7 — Admin (`/admin`):** Protected route, `profile.role = 'admin'` enforced server-side, read-only check-in data + shared journal/goal entries only. The `is_admin()` SQL helper function already exists — reuse it conceptually (call it via RPC or replicate the check in a server component) rather than re-querying `profiles` for role in a way that could reintroduce recursion.
- **Step 8 — Settings (`/settings`):** Plant selection (Monstera only), basic account info.

## Working agreements to carry forward

- Do not proceed to the next step without the user confirming the previous one works.
- Verify features live in the browser (not just type-check/build) before declaring a step done — several real bugs (RLS recursion, silent RPC failures, trigger search_path) were only caught by actually clicking through the app.
- No streaks, no missed-day language, no negative framing anywhere — see spec section 2 and 19 for the full list of banned patterns.
- Task library is still empty; Steps 5–8 don't strictly need it, but flag to the user that they'll want to seed `task_library` with real content before this feels usable end-to-end.
