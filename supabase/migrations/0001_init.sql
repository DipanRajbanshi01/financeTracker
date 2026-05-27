-- Orbit Ledger — initial schema
-- Phase 1: profiles, groups, group_members, transactions, splits, RLS, profile trigger.

set search_path = public;

-- ============================================================================
-- profiles: one row per authenticated user, auto-created on signup
-- ============================================================================
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    display_name text,
    created_at timestamptz not null default now()
);

-- ============================================================================
-- groups: a shared ledger; mode chosen at creation
-- ============================================================================
create table if not exists groups (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(name) between 1 and 80),
    mode text not null check (mode in ('splitwise', 'pool')),
    currency text not null default 'NPR' check (length(currency) = 3),
    created_by uuid not null references profiles(id),
    created_at timestamptz not null default now()
);

create index if not exists groups_created_by_idx on groups(created_by);

-- ============================================================================
-- group_members: links profiles to groups; supports pending email invites
-- ============================================================================
create table if not exists group_members (
    group_id uuid not null references groups(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    invite_email text,
    display_name text,
    role text not null default 'member' check (role in ('owner', 'member')),
    joined_at timestamptz not null default now(),
    -- One of (user_id, invite_email) must be set
    constraint group_members_target_check check (
        (user_id is not null and invite_email is null)
        or (user_id is null and invite_email is not null)
    ),
    -- Same person cannot be added twice (NULLs are distinct, so multiple pending
    -- invites with different emails are allowed; only same group_id + same user_id
    -- or same group_id + same invite_email collide)
    constraint group_members_unique_user unique (group_id, user_id),
    constraint group_members_unique_invite unique (group_id, invite_email)
);

create index if not exists group_members_user_idx on group_members(user_id);
create index if not exists group_members_invite_idx on group_members(lower(invite_email));

-- ============================================================================
-- transactions: spent / collected / settlement, money as integer paisa
-- ============================================================================
create table if not exists transactions (
    id uuid primary key default gen_random_uuid(),
    group_id uuid not null references groups(id) on delete cascade,
    type text not null check (type in ('spent', 'collected', 'settlement')),
    amount_minor bigint not null check (amount_minor > 0),
    paid_by uuid references profiles(id),
    paid_to uuid references profiles(id),
    source text check (source in ('member', 'outside')),
    description text not null default '',
    category text,
    occurred_on date not null default current_date,
    created_by uuid not null references profiles(id),
    created_at timestamptz not null default now(),
    -- Per-type sanity (mirrored at the app layer in Zod)
    constraint transactions_type_shape check (
        (type = 'spent' and paid_by is not null and source is null and paid_to is null)
        or (type = 'collected' and source is not null and paid_to is null)
        or (type = 'settlement' and paid_by is not null and paid_to is not null and source is null)
    )
);

create index if not exists transactions_group_idx on transactions(group_id, occurred_on desc);

-- ============================================================================
-- splits: who owes what share of a given transaction (Splitwise-mode only)
-- ============================================================================
create table if not exists transaction_splits (
    transaction_id uuid not null references transactions(id) on delete cascade,
    user_id uuid not null references profiles(id) on delete cascade,
    share_minor bigint not null check (share_minor >= 0),
    primary key (transaction_id, user_id)
);

-- ============================================================================
-- Helper: SECURITY DEFINER membership check avoids RLS recursion on policies
-- ============================================================================
create or replace function is_group_member(g uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from group_members gm
        where gm.group_id = g
          and gm.user_id = auth.uid()
    );
$$;

create or replace function is_group_owner(g uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from group_members gm
        where gm.group_id = g
          and gm.user_id = auth.uid()
          and gm.role = 'owner'
    );
$$;

-- ============================================================================
-- Enable RLS
-- ============================================================================
alter table profiles            enable row level security;
alter table groups              enable row level security;
alter table group_members       enable row level security;
alter table transactions        enable row level security;
alter table transaction_splits  enable row level security;

-- ---- profiles ----
-- Readable to self and to anyone sharing a group with you (so we can display names).
drop policy if exists profiles_read_self_or_shared on profiles;
create policy profiles_read_self_or_shared on profiles
    for select
    using (
        id = auth.uid()
        or exists (
            select 1
            from group_members me
            join group_members them on them.group_id = me.group_id
            where me.user_id = auth.uid()
              and them.user_id = profiles.id
        )
    );

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
    for update
    using (id = auth.uid())
    with check (id = auth.uid());

-- ---- groups ----
drop policy if exists groups_read_members on groups;
create policy groups_read_members on groups
    for select
    using (is_group_member(id));

drop policy if exists groups_insert_self on groups;
create policy groups_insert_self on groups
    for insert
    with check (created_by = auth.uid());

drop policy if exists groups_update_owner on groups;
create policy groups_update_owner on groups
    for update
    using (is_group_owner(id))
    with check (is_group_owner(id));

drop policy if exists groups_delete_owner on groups;
create policy groups_delete_owner on groups
    for delete
    using (is_group_owner(id));

-- ---- group_members ----
drop policy if exists group_members_read_same_group on group_members;
create policy group_members_read_same_group on group_members
    for select
    using (is_group_member(group_id) or user_id = auth.uid());

drop policy if exists group_members_insert_owner on group_members;
create policy group_members_insert_owner on group_members
    for insert
    with check (
        -- Group creator can seed themselves as the first owner
        (
            user_id = auth.uid()
            and exists (select 1 from groups g where g.id = group_id and g.created_by = auth.uid())
        )
        or is_group_owner(group_id)
    );

drop policy if exists group_members_update_owner on group_members;
create policy group_members_update_owner on group_members
    for update
    using (is_group_owner(group_id))
    with check (is_group_owner(group_id));

drop policy if exists group_members_delete_owner on group_members;
create policy group_members_delete_owner on group_members
    for delete
    using (is_group_owner(group_id));

-- ---- transactions ----
drop policy if exists transactions_read_members on transactions;
create policy transactions_read_members on transactions
    for select
    using (is_group_member(group_id));

drop policy if exists transactions_insert_members on transactions;
create policy transactions_insert_members on transactions
    for insert
    with check (is_group_member(group_id) and created_by = auth.uid());

drop policy if exists transactions_update_creator on transactions;
create policy transactions_update_creator on transactions
    for update
    using (created_by = auth.uid() and is_group_member(group_id))
    with check (created_by = auth.uid() and is_group_member(group_id));

drop policy if exists transactions_delete_creator on transactions;
create policy transactions_delete_creator on transactions
    for delete
    using (created_by = auth.uid() and is_group_member(group_id));

-- ---- transaction_splits ----
drop policy if exists splits_read_members on transaction_splits;
create policy splits_read_members on transaction_splits
    for select
    using (
        exists (
            select 1 from transactions t
            where t.id = transaction_id and is_group_member(t.group_id)
        )
    );

drop policy if exists splits_write_members on transaction_splits;
create policy splits_write_members on transaction_splits
    for all
    using (
        exists (
            select 1 from transactions t
            where t.id = transaction_id
              and t.created_by = auth.uid()
              and is_group_member(t.group_id)
        )
    )
    with check (
        exists (
            select 1 from transactions t
            where t.id = transaction_id
              and t.created_by = auth.uid()
              and is_group_member(t.group_id)
        )
    );

-- ============================================================================
-- Auto-create a profile row when a new auth user appears, and claim any
-- pending invites that match the new user's email.
-- ============================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, display_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
    )
    on conflict (id) do nothing;

    -- Claim pending invites
    update public.group_members
        set user_id = new.id,
            invite_email = null
        where user_id is null
          and lower(invite_email) = lower(new.email);

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();
