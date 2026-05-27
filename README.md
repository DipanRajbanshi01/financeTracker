# Orbit Ledger

Shared group finances for trips, flats, and crews. Each group is either:

- **Splitwise mode** — per-person splits, who-owes-whom, settle-up
- **Pool mode** — a shared fund everyone tops up and spends from

Built by [Syntax Orbit](https://thesyntaxorbit.com).

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind, Supabase (Postgres, Auth, RLS), deployed on Vercel. Money is stored as integer paisa (1 NPR = 100). Balance + settlement math is in pure functions with unit tests.

---

## Features

- **Owner-managed accounts**: the group owner adds members by email, the app creates each friend's account on the spot with an auto-generated password, owner shares the credentials. No magic-link email gymnastics. Google sign-in works as an alternative.
- Two group modes (Splitwise / Pool) chosen at creation, immutable after
- Transactions: `spent` and `collected` (from a member or from outside, e.g. refunds)
- Equal-by-default split editor with custom shares + balance indicator
- Live balances and minimal settle-up suggestions, with editable partial-settle amounts
- Category breakdown chart on the group overview
- URL-synced filters on the transactions list (Type / Paid by / Category)
- Row Level Security: a user only ever sees rows for groups they belong to
- Skeleton loading states + error + not-found pages

---

## Prerequisites

- Node.js 20+ and npm
- A free [Supabase](https://supabase.com) account
- A [Vercel](https://vercel.com) account (only needed for deployment)
- A Google Cloud project (only needed to enable Google sign-in)

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/DipanRajbanshi01/financeTracker.git orbit-ledger
cd orbit-ledger
npm install
```

### 2. Create a Supabase project

1. Sign in at https://supabase.com → **New project**. Free tier is fine.
2. Wait for the database to provision (~2 minutes).
3. **Project Settings → API**. Copy three values:
    - `Project URL` → goes into `NEXT_PUBLIC_SUPABASE_URL`
    - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(server-only — never expose to the browser)*

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in the three Supabase keys plus:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run the migrations

Open the **SQL editor** in the Supabase dashboard. For each file under [`supabase/migrations/`](supabase/migrations/), in numeric order, paste the contents and run:

1. [`0001_init.sql`](supabase/migrations/0001_init.sql) — tables (`profiles`, `groups`, `group_members`, `transactions`, `transaction_splits`), RLS policies, helper functions, and a trigger that auto-creates a profile row when a new `auth.users` appears and claims any pending email invites for that address.
2. [`0002_groups_rpc.sql`](supabase/migrations/0002_groups_rpc.sql) — `create_group_with_owner` RPC that atomically inserts a group plus the owner-member row.

### 5. Configure auth providers

In the Supabase dashboard, **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (use your Vercel URL in production)
- **Redirect URLs**: add `http://localhost:3000/callback` (add your production `/callback` too once deployed)

#### Email + password
Enabled by default in Supabase. Friends do **not** sign up themselves — accounts are admin-created when a group owner adds their email (Members tab). The app uses `SUPABASE_SERVICE_ROLE_KEY` server-side to create the user, then displays the auto-generated password once for the owner to share. Make sure the service-role key is set in `.env.local`.

> Tip: under **Authentication → Providers → Email** you can leave "Confirm email" on — the admin-create flow bypasses it.

#### Google sign-in
1. **Authentication → Providers → Google** → toggle it on.
2. Click the linked Google Cloud Console instructions and create an OAuth 2.0 Web client.
3. Authorized redirect URI: the one Supabase shows you (looks like `https://<project>.supabase.co/auth/v1/callback`).
4. Paste the Google client ID and secret back into the Supabase Google provider panel. **Save**.

### 6. Run the app

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

**Bootstrap your first user:** run the included helper to mint yourself an email+password account using your service-role key:

```bash
node scripts/create-admin.mjs                 # defaults to admin@orbit.local
node scripts/create-admin.mjs you@email.com   # any email you want
```

It prints the email + password to the console. Sign in with those, and you're in. (Re-running it on the same email resets the password — useful if you forget it.) Alternatively, **Continue with Google** also works if you set up the Google provider in step 5.

Once signed in, you can add other members from any group's Members tab — the app creates their accounts and shows you their credentials to share.

### 7. (Optional) Load demo data

To get a populated group to click around in:

1. Sign in once (steps above) so your auth user and profile exist.
2. Open **Authentication → Users** in Supabase and copy your User UID.
3. Open [`supabase/seed.sql`](supabase/seed.sql), paste your UID into the `seed_user_id` variable at the top, run it in the SQL editor.
4. Refresh the dashboard — "Demo: Pokhara trip 2026" appears with sample transactions and a category chart.

### 8. (Optional) Run tests + typecheck

```bash
npm run typecheck   # tsc --noEmit
npm run test        # vitest run
```

The pure functions in `lib/balances.ts` and `lib/settlement.ts` are covered by 16 unit tests in [`tests/`](tests/).

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. On Vercel, **Add New → Project** → import the repo.
3. **Environment Variables** — add the four values from your `.env.local`:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `NEXT_PUBLIC_SITE_URL` — set to your final Vercel URL (e.g. `https://orbit-ledger.vercel.app`). You can update this after the first deploy.
4. Deploy. Vercel will auto-detect Next.js, run `npm install` + `npm run build`.
5. Back in Supabase, **Authentication → URL Configuration**:
    - Set **Site URL** to your Vercel URL.
    - Add your Vercel URL + `/callback` to **Redirect URLs**.
6. If you set `NEXT_PUBLIC_SITE_URL` to a placeholder during step 3, update it now and redeploy.

You can also wire `npm run typecheck` and `npm run test` into a CI workflow (GitHub Actions, etc.) before deploys; both run offline without Supabase.

---

## Project layout

```
orbit-ledger/
├── app/                  # Next.js App Router — pages, layouts, route handlers
│   ├── (auth)/           # login + OAuth/magic-link callback
│   └── (app)/            # authed shell, dashboard, groups
├── components/           # reusable UI, broken down by domain
│   ├── balances/         # balance summary, settlement list, category chart
│   ├── groups/           # group card, member list
│   ├── transactions/     # form, split editor, list, filters
│   └── ui/               # skeleton + small primitives
├── lib/
│   ├── balances.ts       # PURE: compute net balances
│   ├── settlement.ts     # PURE: minimize transfers
│   ├── money.ts          # paisa helpers, splitEqually
│   ├── validation.ts     # Zod schemas
│   ├── categories.ts     # default category list
│   ├── types.ts          # shared TS types
│   └── supabase/         # client / server / middleware factories
├── actions/              # Server Actions (groups, transactions, members, auth)
├── supabase/
│   ├── migrations/       # numbered SQL files (run in order)
│   └── seed.sql          # optional demo data
├── scripts/
│   └── create-admin.mjs  # one-off: create/reset an admin user from .env.local
├── tests/                # vitest unit tests for the pure functions
└── middleware.ts         # auth gate for (app) routes
```

Money is stored as integer **paisa** (1 NPR = 100 paisa). No floating-point math on money anywhere — see [lib/money.ts](lib/money.ts).

The pure compute functions in [lib/balances.ts](lib/balances.ts) and [lib/settlement.ts](lib/settlement.ts) make zero DB calls and are unit-tested in [tests/](tests/).

---

## Architecture notes

- **Server Components** for all reads (data fetched in `page.tsx` files using `lib/supabase/server.ts`).
- **Server Actions** for writes, validated with Zod (see [actions/](actions/) and [lib/validation.ts](lib/validation.ts)).
- **RLS** does the access-control heavy lifting — see [0001_init.sql](supabase/migrations/0001_init.sql). The app code never needs to manually check "is this user a member of this group" before a query; RLS filters the result set.
- **The auth gate** is in [middleware.ts](middleware.ts). It refreshes the Supabase session cookie on every request and redirects unauthenticated users away from the `(app)` group.
- **Pending invites** are claimed by a `SECURITY DEFINER` trigger when the matching email signs up.

---

## License

MIT — do whatever you want, but no warranty.
