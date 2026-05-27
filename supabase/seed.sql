-- Orbit Ledger — demo seed
-- ============================================================================
-- Populates one splitwise group with a handful of transactions so you have
-- something to click around in. Safe to re-run (uses ON CONFLICT DO NOTHING
-- where possible) but easiest is to run once on a fresh project.
--
-- HOW TO USE
--   1. Sign in to the app at least once so your auth user + profile exist.
--   2. In the Supabase dashboard, open Authentication → Users and copy your
--      User UID. It looks like `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`.
--   3. Replace the placeholder UUID on the line marked `<<< SET THIS >>>` below.
--   4. Run this whole file in the Supabase SQL editor.
-- ============================================================================

do $$
declare
    -- <<< SET THIS >>>  Paste your auth user UID here.
    seed_user_id uuid := '00000000-0000-0000-0000-000000000000';

    g_id uuid;
    t_id uuid;
begin
    if seed_user_id = '00000000-0000-0000-0000-000000000000' then
        raise exception 'Set seed_user_id at the top of seed.sql to your auth user UUID first.';
    end if;

    if not exists (select 1 from public.profiles where id = seed_user_id) then
        raise exception 'No profile found for that user — sign in to the app once first.';
    end if;

    -- ------------------------------------------------------------------------
    -- 1. The demo group + members
    -- ------------------------------------------------------------------------
    insert into public.groups (name, mode, currency, created_by)
        values ('Demo: Pokhara trip 2026', 'splitwise', 'NPR', seed_user_id)
        returning id into g_id;

    insert into public.group_members (group_id, user_id, display_name, role)
        values (g_id, seed_user_id, 'You', 'owner');

    -- Two pending invites so the members tab has something to show.
    insert into public.group_members (group_id, invite_email, display_name, role)
    values
        (g_id, 'asmita@example.com', 'Asmita', 'member'),
        (g_id, 'rajan@example.com',  'Rajan',  'member');

    -- ------------------------------------------------------------------------
    -- 2. Sample transactions
    -- Splits are single-member (just the seed user) since the other members
    -- are pending invites with no user_id yet. Once they sign up, you can
    -- record real splits with them through the app.
    -- ------------------------------------------------------------------------

    insert into public.transactions
        (group_id, type, amount_minor, paid_by, source, description, category, occurred_on, created_by)
    values
        (g_id, 'spent', 850000, seed_user_id, null, 'Bus to Pokhara',         'Transport', current_date - 14, seed_user_id)
    returning id into t_id;
    insert into public.transaction_splits (transaction_id, user_id, share_minor)
    values (t_id, seed_user_id, 850000);

    insert into public.transactions
        (group_id, type, amount_minor, paid_by, source, description, category, occurred_on, created_by)
    values
        (g_id, 'spent', 1200000, seed_user_id, null, 'Lakeside guesthouse (2 nights)', 'Stay', current_date - 13, seed_user_id)
    returning id into t_id;
    insert into public.transaction_splits (transaction_id, user_id, share_minor)
    values (t_id, seed_user_id, 1200000);

    insert into public.transactions
        (group_id, type, amount_minor, paid_by, source, description, category, occurred_on, created_by)
    values
        (g_id, 'spent', 320000, seed_user_id, null, 'Dinner at Mandala',      'Food',      current_date - 12, seed_user_id)
    returning id into t_id;
    insert into public.transaction_splits (transaction_id, user_id, share_minor)
    values (t_id, seed_user_id, 320000);

    insert into public.transactions
        (group_id, type, amount_minor, paid_by, source, description, category, occurred_on, created_by)
    values
        (g_id, 'spent', 95000, seed_user_id, null, 'Coffee + breakfast',     'Food',      current_date - 11, seed_user_id)
    returning id into t_id;
    insert into public.transaction_splits (transaction_id, user_id, share_minor)
    values (t_id, seed_user_id, 95000);

    insert into public.transactions
        (group_id, type, amount_minor, paid_by, source, description, category, occurred_on, created_by)
    values
        (g_id, 'spent', 450000, seed_user_id, null, 'Boating + paragliding tickets', 'Tickets', current_date - 10, seed_user_id)
    returning id into t_id;
    insert into public.transaction_splits (transaction_id, user_id, share_minor)
    values (t_id, seed_user_id, 450000);

    insert into public.transactions
        (group_id, type, amount_minor, paid_by, source, description, category, occurred_on, created_by)
    values
        (g_id, 'spent', 180000, seed_user_id, null, 'Souvenirs',              'Shopping',  current_date - 9, seed_user_id)
    returning id into t_id;
    insert into public.transaction_splits (transaction_id, user_id, share_minor)
    values (t_id, seed_user_id, 180000);

    -- One outside refund to show the "collected" flow.
    insert into public.transactions
        (group_id, type, amount_minor, paid_by, source, description, category, occurred_on, created_by)
    values
        (g_id, 'collected', 75000, null, 'outside', 'Refund — cancelled activity', null, current_date - 8, seed_user_id)
    returning id into t_id;
    insert into public.transaction_splits (transaction_id, user_id, share_minor)
    values (t_id, seed_user_id, 75000);

    raise notice 'Demo group seeded: %', g_id;
end $$;
