-- Phase 2: atomic group + owner-member creation.
-- A single INSERT into groups followed by an INSERT into group_members would
-- leak a group with no owner row if the second insert failed. This RPC does
-- both in one server-side transaction.

set search_path = public;

create or replace function create_group_with_owner(
    p_name text,
    p_mode text,
    p_currency text default 'NPR',
    p_owner_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_group_id uuid;
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    insert into groups (name, mode, currency, created_by)
    values (p_name, p_mode, upper(p_currency), v_uid)
    returning id into v_group_id;

    insert into group_members (group_id, user_id, display_name, role)
    values (v_group_id, v_uid, p_owner_display_name, 'owner');

    return v_group_id;
end;
$$;

revoke all on function create_group_with_owner(text, text, text, text) from public;
grant execute on function create_group_with_owner(text, text, text, text) to authenticated;
