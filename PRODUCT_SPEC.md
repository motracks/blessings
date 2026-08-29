# Blessings — Product & Technical Specification
## Authoritative build document for Claude Code

---

## 1. Product Philosophy

Blessings is a mobile-first wellbeing and habit companion for iPhone Safari.

Its purpose is not to optimize the user. Its purpose is to create a quiet, nurturing place to arrive, where small acts of self-care become visible through the growth of a personal plant.

**Core principles**
- Blessings measures care, not performance
- Consistency is not a streak. It is the ability to return to care
- The plant has no destination
- Every small thing matters
- Nothing needs to be caught up
- The app never judges absence
- The application must feel calm, warm, safe, non-clinical and completely free of guilt

---

## 2. Non-Negotiable Rules

**Never implement:**
- Streaks or broken streaks
- Missed-day warnings
- Red or negative calendar days
- Failure states or catch-up tasks
- Any language like: "you missed X days", "get back on track", "start again", "you are behind"
- Negative points or lost points
- Plant penalties or plant reset
- Daily targets or completion percentages
- Rankings, leaderboards, or badges
- Achievement pressure
- Notifications reminding the user they have not opened the app
- Productivity language or diagnostic language
- Any communication that the user has done something wrong by not using the app

**A missing day is simply a day with no Blessings data.**

---

## 3. Day Zero Principle

Every interaction exists entirely in the present. The app never frames the current day in relation to previous inactivity.

If the user opens Blessings after one day, two weeks, or three months, the experience is identical.

- No "Welcome back."
- No "You haven't been here for 14 days."
- Simply: present state, no reference to absence.

---

## 4. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Backend / DB | Supabase (Postgres + Auth + RLS) |
| Deployment | Vercel |
| Auth | Supabase Email + Password (no OAuth, no magic link) |
| Animations | CSS only (no Framer Motion, no Lottie for MVP) |

---

## 5. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 6. Database Schema

Run the following SQL in the Supabase SQL editor in order.

### Profiles

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'coachee' CHECK (role IN ('admin', 'coachee')),
  selected_plant TEXT NOT NULL DEFAULT 'monstera' CHECK (selected_plant IN ('monstera')),
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Note: `selected_plant` CHECK constraint starts with `monstera` only. Extend when additional plant images are ready.

### Plant Progress

```sql
CREATE TABLE plant_progress (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_water_drops INT NOT NULL DEFAULT 0 CHECK (total_water_drops >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Daily Check-ins

```sql
CREATE TABLE daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  energy_level INT CHECK (energy_level BETWEEN 1 AND 6),
  sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 5),
  hydration INT CHECK (hydration BETWEEN 1 AND 4),
  mental_load INT CHECK (mental_load BETWEEN 1 AND 6),
  steps_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);
```

### Task Library

```sql
CREATE TABLE task_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mobility', 'cardio', 'side_quest', 'micro')),
  base_points INT NOT NULL DEFAULT 2 CHECK (base_points BETWEEN 1 AND 3),
  is_low_energy BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tasks (daily user tasks, generated from library)

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  library_id UUID REFERENCES task_library(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('mobility', 'cardio', 'side_quest', 'micro', 'custom')),
  description TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  points_value INT NOT NULL DEFAULT 2 CHECK (points_value BETWEEN 1 AND 3),
  source TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Evening Wrap-ups

```sql
CREATE TABLE evening_wrapups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  journal_entry TEXT,
  journal_visibility TEXT NOT NULL DEFAULT 'private' CHECK (journal_visibility IN ('private', 'shared')),
  tomorrow_goal TEXT,
  goal_visibility TEXT NOT NULL DEFAULT 'private' CHECK (goal_visibility IN ('private', 'shared')),
  goal_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);
```

### Water Drop Events (immutable ledger)

```sql
CREATE TABLE water_drop_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id),
  source TEXT NOT NULL CHECK (source IN ('task', 'steps', 'goal_completed')),
  base_points INT NOT NULL,
  multiplier NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  awarded_points INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. Postgres RPC Functions

All point-awarding operations happen inside Postgres transactions. Never award points from React or API routes directly.

### complete_task

```sql
CREATE OR REPLACE FUNCTION complete_task(
  p_task_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task        tasks%ROWTYPE;
  v_energy      INT;
  v_multiplier  NUMERIC := 1.0;
  v_awarded     INT;
  v_new_total   INT;
BEGIN
  SELECT * INTO v_task
  FROM tasks
  WHERE id = p_task_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND            THEN RAISE EXCEPTION 'task_not_found'; END IF;
  IF v_task.is_completed  THEN RAISE EXCEPTION 'already_completed'; END IF;
  IF v_task.is_dismissed  THEN RAISE EXCEPTION 'task_dismissed'; END IF;

  SELECT energy_level INTO v_energy
  FROM daily_checkins
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  IF v_energy IS NOT NULL AND v_energy <= 2 THEN
    v_multiplier := 2.0;
  END IF;

  v_awarded := CEIL(v_task.points_value * v_multiplier);

  UPDATE tasks
  SET is_completed = TRUE, completed_at = NOW()
  WHERE id = p_task_id;

  INSERT INTO water_drop_events
    (user_id, task_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, p_task_id, 'task', v_task.points_value, v_multiplier, v_awarded);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + v_awarded,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'awarded',    v_awarded,
    'new_total',  v_new_total
  );
END;
$$;
```

### award_steps

```sql
CREATE OR REPLACE FUNCTION award_steps(
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_checkin     daily_checkins%ROWTYPE;
  v_already     BOOLEAN;
  v_new_total   INT;
BEGIN
  SELECT * INTO v_checkin
  FROM daily_checkins
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'checkin_not_found'; END IF;
  IF v_checkin.steps_done THEN RAISE EXCEPTION 'steps_already_awarded'; END IF;

  UPDATE daily_checkins
  SET steps_done = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  INSERT INTO water_drop_events
    (user_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, 'steps', 2, 1.0, 2);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + 2,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total);
END;
$$;
```

### award_goal_completed

```sql
CREATE OR REPLACE FUNCTION award_goal_completed(
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wrapup    evening_wrapups%ROWTYPE;
  v_new_total INT;
BEGIN
  SELECT * INTO v_wrapup
  FROM evening_wrapups
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF NOT FOUND               THEN RAISE EXCEPTION 'wrapup_not_found'; END IF;
  IF v_wrapup.goal_completed THEN RAISE EXCEPTION 'goal_already_awarded'; END IF;
  IF v_wrapup.tomorrow_goal IS NULL THEN RAISE EXCEPTION 'no_goal_set'; END IF;

  UPDATE evening_wrapups
  SET goal_completed = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  INSERT INTO water_drop_events
    (user_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, 'goal_completed', 2, 1.0, 2);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + 2,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total);
END;
$$;
```

### generate_daily_tasks

```sql
CREATE OR REPLACE FUNCTION generate_daily_tasks(
  p_user_id UUID,
  p_date DATE,
  p_energy_level INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_count INT;
  v_use_low_energy BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_existing_count
  FROM tasks
  WHERE user_id = p_user_id AND date = p_date AND source = 'generated';

  IF v_existing_count > 0 THEN RETURN; END IF;

  v_use_low_energy := (p_energy_level <= 2);

  INSERT INTO tasks (user_id, library_id, date, type, description, points_value, source)
  SELECT
    p_user_id,
    tl.id,
    p_date,
    tl.type,
    tl.description,
    tl.base_points,
    'generated'
  FROM task_library tl
  WHERE tl.is_active = TRUE
    AND (v_use_low_energy = FALSE OR tl.is_low_energy = TRUE)
  ORDER BY RANDOM()
  LIMIT 2;
END;
$$;
```

---

## 8. Row Level Security

```sql
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE evening_wrapups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_drop_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_library      ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "admin read profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Plant progress
CREATE POLICY "own plant" ON plant_progress
  FOR ALL USING (auth.uid() = user_id);

-- Daily check-ins
CREATE POLICY "own checkins" ON daily_checkins
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin read checkins" ON daily_checkins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tasks
CREATE POLICY "own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin read tasks" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Evening wrap-ups: coachee owns, admin sees only shared entries
CREATE POLICY "own wrapups" ON evening_wrapups
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin read shared journal" ON evening_wrapups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    AND journal_visibility = 'shared'
  );

-- Water drop events
CREATE POLICY "own events" ON water_drop_events
  FOR ALL USING (auth.uid() = user_id);

-- Task library: all authenticated users can read
CREATE POLICY "read task library" ON task_library
  FOR SELECT USING (auth.uid() IS NOT NULL);
```

---

## 9. Automatic Profile + Plant Creation

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  INSERT INTO plant_progress (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 10. Plant Phase System

### Phase thresholds

```typescript
// lib/plants.ts
export const PHASE_THRESHOLDS = [0, 10, 25, 50, 90, 140, 200, 280];

export function getPlantPhase(totalDrops: number): number {
  let phase = 0;
  for (let i = 0; i < PHASE_THRESHOLDS.length; i++) {
    if (totalDrops >= PHASE_THRESHOLDS[i]) phase = i;
  }
  return phase; // 0–7
}

export function getDaysSinceLastOpen(lastOpenedAt: string | null): number {
  if (!lastOpenedAt) return 0;
  const diff = Date.now() - new Date(lastOpenedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function calculateWiltAmount(daysSinceLastOpen: number): number {
  // Wilting begins after 3 days, caps at 80% grayscale over the following 7 days
  return Math.min(Math.max(0, (daysSinceLastOpen - 3) / 7), 0.8);
}
```

### Image file structure

```
/public/plants/monstera/phase-0.png
/public/plants/monstera/phase-1.png
/public/plants/monstera/phase-2.png
/public/plants/monstera/phase-3.png
/public/plants/monstera/phase-4.png
/public/plants/monstera/phase-5.png
/public/plants/monstera/phase-6.png
/public/plants/monstera/phase-7.png
```

Placeholder images (colored boxes with phase number) must exist at these paths from day one.

### PlantDisplay component

```typescript
// components/plant/PlantDisplay.tsx
'use client';
import { useEffect, useState } from 'react';
import { getPlantPhase, calculateWiltAmount } from '@/lib/plants';

interface PlantDisplayProps {
  totalDrops: number;
  daysSinceLastOpen: number;
  plant?: 'monstera';
}

export function PlantDisplay({
  totalDrops,
  daysSinceLastOpen,
  plant = 'monstera',
}: PlantDisplayProps) {
  const phase = getPlantPhase(totalDrops);
  const initialWilt = calculateWiltAmount(daysSinceLastOpen);
  const [grayscale, setGrayscale] = useState(initialWilt);

  useEffect(() => {
    if (initialWilt > 0) {
      const timer = setTimeout(() => setGrayscale(0), 100);
      return () => clearTimeout(timer);
    }
  }, [initialWilt]);

  return (
    <img
      src={`/plants/${plant}/phase-${phase}.png`}
      alt="Deine Pflanze"
      style={{
        filter: `grayscale(${grayscale})`,
        transition: grayscale === 0 && initialWilt > 0
          ? 'filter 2.5s ease-out'
          : 'none',
      }}
      className="w-full max-w-xs mx-auto"
    />
  );
}
```

### last_opened_at update

Update `last_opened_at` on every app open via a Server Action called from the root layout. Throttle: only update if more than 30 minutes have passed since the last update to avoid unnecessary writes.

---

## 11. Feature Specifications

### Authentication

- Supabase Email + Password
- Sign up creates profile + plant_progress via DB trigger (see Section 9)
- On first login after sign-up: redirect to `/onboarding`
- Onboarding: plant selection screen (Monstera only for MVP) → then redirect to `/`
- Middleware protects all `(app)` routes

### Check-in Page (`/checkin`)

Single dedicated page with two sections: **Morgen** and **Abend**.

The page is always accessible from navigation. It is also the default landing screen when:
- User has no check-in for today → show Morgen section first
- User has completed morning but not evening → show Abend section first
- Both complete → show summary of today's entries

**Morgen section (energy required, rest optional):**

| Question | Input | Required |
|---|---|---|
| Wie viel Energie hast du heute? | 6-step scale | Yes |
| Wie erholsam war dein Schlaf? | 1–5 stars | No |
| Wie gut hast du heute schon getrunken? | 1–4 drops | No |
| Wie voll fühlt sich dein Kopf heute an? | 1–6 scale | No |

Energy level labels (1–6):
1. Tief erschöpft
2. Sehr wenig Energie
3. Wenig Energie
4. Etwas Energie
5. Viel Energie
6. Voller Energie

On morning check-in submission:
- Save to `daily_checkins`
- Call `generate_daily_tasks(user_id, date, energy_level)` immediately
- Redirect to home

**Abend section (all optional):**

| Question | Input |
|---|---|
| Wie war dein Tag? | Large text area |
| Teile deinen Tagebucheintrag mit dem Coach | Toggle (default: off / private) |
| Was wäre ein sanftes Ziel für morgen? | Text area |
| Teile dein Ziel mit dem Coach | Toggle (default: off / private) |
| Hast du dich heute bewegt? | Checkbox (steps tick — awards 2 drops once) |

Steps tick calls `award_steps` RPC. Idempotent.

**Yesterday's goal (shown at top of Abend section if exists):**

If yesterday's `evening_wrapups.tomorrow_goal` is set and `goal_completed = false`:
```
Dein gestriges Ziel:
"[goal text]"
[ Geschafft ✓ ]
```
Tapping Geschafft calls `award_goal_completed` for yesterday's date. No fanfare — just a quiet tick and 2 drops.

If `goal_completed = true`: show goal with a soft checkmark, no action needed.

### Home Screen (`/`)

The home screen is a quiet place. The plant occupies most of the screen.

Layout (top to bottom):
- Current time (subtle, top center)
- Plant image (center, large)
- "Du bist hier." (warm, understated, below plant)
- Today's tasks (cards below, max 2 + any custom tasks)
- If morning check-in not yet done: a single gentle prompt card to go to check-in

**Task card states:**
- Default: description + [ Geschafft ] button
- Completed: soft checkmark, no action
- Dismissed: hidden

On task completion:
- Call `complete_task` RPC
- Show brief 💧 water drop visual (CSS, fades in/out over 1.5s)
- Update plant phase if threshold crossed (re-derive from new total)
- No point total shown, no "+X drops" label

**Custom task:**
- A subtle "+ Eigene Aufgabe" link below task cards
- Opens a small input: description only, type defaults to 'custom', points_value defaults to 2
- Saved as `source: 'custom'`
- Follows same completion flow

**Energy 1–2 day task presentation:**
- Tasks are visually identical to normal days
- No indication of low energy state in the UI
- 2× multiplier is fully silent — applied server-side only
- Task descriptions pulled from `is_low_energy = true` library entries (gentler, smaller tasks)
- Affirmation shown above tasks:
  ```
  Heute darf es ganz klein sein.
  Du musst heute nichts beweisen.
  ```

### Rewind (`/rewind`)

Cumulative positive view. Never shows gaps, missed days, or absence.

Display:
- Current plant (same PlantDisplay component)
- Total water drops (e.g. "42 Wassertropfen")
- Total tasks completed
- Breakdown by type (e.g. "12 Mobility · 8 Side Quests · 6 Micro-Momente")
- Average energy level (e.g. "Ø Energie: 3.7") — shown only after at least 3 check-ins
- Days with check-in data (framed as: "An X Tagen warst du hier") — never as a streak
- Steps ticked count
- Goals completed count

All values are aggregated from `water_drop_events` and `daily_checkins`. No negative framing anywhere.

### Admin (`/admin`)

Protected route. Only accessible if `profile.role = 'admin'`. Enforced server-side.

Admin can see:
- List of users with check-in data by date
- Energy, sleep, hydration, mental load per day
- Completed tasks per user per day
- Shared journal entries (`journal_visibility = 'shared'` only)
- Shared tomorrow goals (`goal_visibility = 'shared'` only)

Admin cannot see:
- Private journal entries
- Private goals
- Water drop totals or any performance metric

UI is functional, calm, uses the same design tokens. Not a dashboard. No completion rates, no streaks, no missed days.

---

## 12. Navigation

Bottom navigation bar (mobile-first). Four items:

```
[ 🌿 Home ] [ 📋 Check-in ] [ 📖 Rewind ] [ ⚙️ Settings ]
```

- Home: plant + tasks
- Check-in: morning + evening consolidated page (always accessible)
- Rewind: cumulative positive history
- Settings: plant selection, account

No separate morning/evening routes. Both live under `/checkin`.

The nav bar must respect `env(safe-area-inset-bottom)` on iOS.

---

## 13. Design System

### Colors

```css
--background: #F3EEE5;    /* warm oat */
--surface: #FBF9F5;       /* off-white cards */
--sage: #9CAF91;          /* muted sage accent */
--text: #403E39;          /* warm dark brown */
--text-muted: #9A9590;    /* secondary text */
--border: #E8E3DA;        /* subtle warm border */
```

Never use pure black (`#000000`) or pure red for any state.

### Typography

- Font: Inter (Google Fonts)
- Thin, spacious, calm
- No bold motivational headings
- No oversized exclamation marks

### Component style

- `rounded-2xl` and `rounded-3xl` on cards
- Large padding, large whitespace
- Subtle shadows (`shadow-sm` maximum)
- Soft transitions (`transition-all duration-300`)
- Large touch targets (minimum 44×44px)
- No hover-dependent interactions

### Mobile requirements

- Primary target: iPhone Safari, 375px+
- Use `100dvh` not `100vh`
- Bottom nav: `padding-bottom: env(safe-area-inset-bottom)`
- All interactions comfortable with one thumb
- No tiny controls

### Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
```

Plant rehydration: `filter: grayscale(X)` → `grayscale(0)` over 2.5s ease-out.
Task completion: 💧 emoji fades in, drifts down ~20px, fades out. CSS keyframe, 1.5s.

---

## 14. Error Handling

Errors use warm copy, never aggressive red UI.

```
Das hat gerade nicht funktioniert.
Versuch es bitte noch einmal.
```

A missed task or absent day is never an error. Only technical failures show error states.

Empty states are not failure states:
```
Noch keine Wassertropfen.
Alles darf klein anfangen.
```

---

## 15. Business Logic Location

All of the following live in `lib/` — never in React components:

```
lib/
├── plants.ts         getPlantPhase, calculateWiltAmount, getDaysSinceLastOpen
├── points.ts         (reference only — actual calculation in Postgres RPCs)
├── permissions.ts    isAdmin, canViewJournal
└── types.ts          all shared TypeScript types
```

React components only render state. They never contain authoritative reward logic.

---

## 16. File Structure

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── signup/
│       └── page.tsx
├── (app)/
│   ├── layout.tsx          (nav + last_opened_at update)
│   ├── page.tsx            (home)
│   ├── checkin/
│   │   └── page.tsx
│   ├── rewind/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
├── admin/
│   └── page.tsx
├── onboarding/
│   └── page.tsx
├── auth/
│   └── callback/
│       └── route.ts
├── layout.tsx
└── globals.css

components/
├── plant/
│   └── PlantDisplay.tsx
├── checkin/
│   ├── MorgenSection.tsx
│   └── AbendSection.tsx
├── tasks/
│   ├── TaskCard.tsx
│   └── CustomTaskForm.tsx
├── rewind/
│   └── RewindStats.tsx
├── navigation/
│   └── BottomNav.tsx
└── ui/
    └── (shared primitives)

lib/
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   └── middleware.ts
├── plants.ts
├── points.ts
├── permissions.ts
└── types.ts

public/
└── plants/
    └── monstera/
        ├── phase-0.png
        ├── phase-1.png
        ├── phase-2.png
        ├── phase-3.png
        ├── phase-4.png
        ├── phase-5.png
        ├── phase-6.png
        └── phase-7.png
```

---

## 17. Security Principles

- Never trust client-side role checks
- Never trust client-side point values
- Never trust client-side privacy checks
- All point-awarding operations go through Postgres RPC with `SECURITY DEFINER`
- Admin access enforced server-side via `profiles.role` check
- Private journal/goal entries never returned to admin through any API route

---

## 18. Definition of Done

The MVP is complete when a user can:

- [ ] Sign up and log in with email + password
- [ ] Select a plant during onboarding
- [ ] Arrive on the plant-based home screen
- [ ] See the plant visually recover (grayscale → color) when opening after 3+ days
- [ ] Complete a Morning Check-in (energy required, rest optional)
- [ ] See gentle affirmation copy and easier tasks on Energy 1–2 days
- [ ] See 1–2 suggested tasks on Energy 3–6 days
- [ ] Complete a task and see a 💧 animation
- [ ] Add and complete a custom task
- [ ] Dismiss a task
- [ ] Receive silent 2× task rewards on Energy 1–2 days (server-side only)
- [ ] See the plant advance to a new phase image as drops accumulate
- [ ] Complete the Abend section of check-in
- [ ] Tick off steps for 2 drops
- [ ] Write a journal entry (private by default)
- [ ] Optionally share journal with admin
- [ ] Set a tomorrow goal (private by default)
- [ ] See yesterday's goal the next day and tick it off for 2 drops
- [ ] View cumulative Rewind data with no negative framing
- [ ] Return after any amount of time without being told they were absent
- [ ] Retain all plant growth permanently
- [ ] Use the app comfortably on iPhone Safari
- [ ] Admin can view check-in data and shared entries only

---

## 19. Final Principle

Every feature should be evaluated against one question:

**Does this make the user feel cared for, or does it make the user feel evaluated?**

If it makes the user feel evaluated: reconsider or remove it.

- The plant is not a prize for productivity. It is a visual companion.
- The drops are not a score. They are water.
- The app is not a checklist. It is a quiet place to arrive.

The most important behavior Blessings reinforces is not "I never missed a day."
It is: **"I can always come back here, and nothing bad happened while I was away."**