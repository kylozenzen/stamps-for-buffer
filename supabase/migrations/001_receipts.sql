begin;
-- gen_random_uuid() is built into PostgreSQL 13+ (including Supabase).
create table public.creators (
 id uuid primary key default gen_random_uuid(), buffer_account_id text not null unique,
 profile jsonb not null, organizations jsonb not null default '[]', organization_id text,
 tokens_ciphertext text, refresh_lock uuid, refresh_lock_until timestamptz,
 created_at timestamptz not null default now()
);
create table public.creator_sessions (
 token_hash text primary key, creator_id uuid not null references public.creators(id) on delete cascade,
 expires_at timestamptz not null
);
create table public.oauth_flows (
 state_hash text primary key, verifier_ciphertext text not null, expires_at timestamptz not null
);
create table public.clients (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creators(id) on delete cascade,
 company text not null, name text not null, email text not null default '', approval_note text not null default '',
 color text not null default '#cafd00', room_token_hash text not null unique,
 room_token_ciphertext text not null, active boolean not null default true,
 unique (id, creator_id)
);
create table public.content_refs (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creators(id) on delete cascade,
 organization_id text not null, source_kind text not null check (source_kind in ('post', 'content_item')),
 source_id text not null, client_id uuid,
 snapshot jsonb not null, fingerprint text not null, version integer not null default 1 check(version > 0),
 imported_at timestamptz not null default now(),
 foreign key (client_id, creator_id) references public.clients(id, creator_id),
 unique(creator_id, organization_id, source_kind, source_id), unique(id, creator_id)
);
create table public.review_versions (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creators(id) on delete cascade,
 client_id uuid not null, content_id uuid not null, version integer not null,
 snapshot jsonb not null, fingerprint text not null, active boolean not null default true,
 shared_at timestamptz not null default now(),
 foreign key(client_id, creator_id) references public.clients(id, creator_id),
 foreign key(content_id, creator_id) references public.content_refs(id, creator_id),
 unique(content_id, client_id, version), unique(id, client_id)
);
create unique index one_active_review on public.review_versions(content_id) where active;
create table public.feedback_deliveries (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id),
 review_id uuid not null, idempotency_key uuid not null, author_name text not null check(length(author_name) between 1 and 100),
 body text not null check(length(body) between 1 and 5000), payload_hash text not null,
 status text not null default 'pending' check(status in ('pending', 'sending', 'delivered', 'uncertain', 'failed')),
 buffer_note_id text, created_at timestamptz not null default now(),
 foreign key(review_id, client_id) references public.review_versions(id, client_id),
 unique(client_id, idempotency_key), unique(client_id, buffer_note_id)
);
create table public.room_note_visibility (
 client_id uuid not null references public.clients(id), review_id uuid not null,
 buffer_note_id text not null, delivery_id uuid not null unique references public.feedback_deliveries(id),
 primary key(client_id, buffer_note_id),
 foreign key(review_id, client_id) references public.review_versions(id, client_id)
);
-- All browser roles have no direct table access. Only server-side service-role calls.
alter table public.creators enable row level security;
alter table public.creator_sessions enable row level security;
alter table public.oauth_flows enable row level security;
alter table public.clients enable row level security;
alter table public.content_refs enable row level security;
alter table public.review_versions enable row level security;
alter table public.feedback_deliveries enable row level security;
alter table public.room_note_visibility enable row level security;
revoke all on public.creators, public.creator_sessions, public.oauth_flows, public.clients,
 public.content_refs, public.review_versions, public.feedback_deliveries, public.room_note_visibility from anon, authenticated;
grant all on public.creators, public.creator_sessions, public.oauth_flows, public.clients,
 public.content_refs, public.review_versions, public.feedback_deliveries, public.room_note_visibility to service_role;

create function public.acquire_refresh(p_creator uuid, p_lock uuid) returns boolean language plpgsql security invoker set search_path = public as $$
begin
 update creators set refresh_lock=p_lock, refresh_lock_until=now()+interval '60 seconds'
 where id=p_creator and refresh_lock is null;
 return found;
end $$;
-- A crashed refresh cannot safely reuse a rotating token: expired locks require reconnection.
create function public.save_refreshed_tokens(p_creator uuid, p_lock uuid, p_tokens text) returns boolean language plpgsql security invoker set search_path = public as $$
begin
 update creators set tokens_ciphertext=p_tokens, refresh_lock=null, refresh_lock_until=null
 where id=p_creator and refresh_lock=p_lock;
 return found;
end $$;
create function public.import_post(p_creator uuid, p_org text, p_source text, p_snapshot jsonb, p_fingerprint text)
returns public.content_refs language plpgsql security invoker set search_path = public as $$
declare result content_refs;
begin
 if not exists(select 1 from creators where id=p_creator and organization_id=p_org) then raise exception 'Organization not selected'; end if;
 insert into content_refs(creator_id,organization_id,source_kind,source_id,snapshot,fingerprint)
 values(p_creator,p_org,'post',p_source,p_snapshot,p_fingerprint)
 on conflict(creator_id,organization_id,source_kind,source_id) do update
 set snapshot=excluded.snapshot, fingerprint=excluded.fingerprint, imported_at=now(),
 version=content_refs.version+case when content_refs.fingerprint<>excluded.fingerprint then 1 else 0 end
 returning * into result;
 return result;
end $$;
create function public.assign_content(p_creator uuid, p_content uuid, p_client uuid) returns boolean language plpgsql security invoker set search_path = public as $$
declare current_content content_refs;
begin
 select * into current_content from content_refs where id=p_content and creator_id=p_creator for update;
 if not found then raise exception 'Content not found'; end if;
 if p_client is not null and not exists(select 1 from clients where id=p_client and creator_id=p_creator and active) then raise exception 'Client not found'; end if;
 if current_content.client_id is distinct from p_client then
  update review_versions set active=false where content_id=p_content and creator_id=p_creator;
 end if;
 update content_refs set client_id=p_client where id=p_content and creator_id=p_creator;
 return true;
end $$;
create function public.share_content(p_creator uuid, p_content uuid) returns public.review_versions language plpgsql security invoker set search_path = public as $$
declare p content_refs; result review_versions;
begin
 select * into p from content_refs where id=p_content and creator_id=p_creator for update;
 if not found or p.client_id is null then raise exception 'Assign content first'; end if;
 update review_versions set active=false where content_id=p.id;
 insert into review_versions(creator_id,client_id,content_id,version,snapshot,fingerprint)
 values(p.creator_id,p.client_id,p.id,p.version,p.snapshot,p.fingerprint)
 on conflict(content_id,client_id,version) do update set active=true
 returning * into result;
 return result;
end $$;
-- Room validation + version membership + idempotency + rate limit in one transaction.
create function public.queue_feedback(p_room_hash text, p_review uuid, p_key uuid, p_name text, p_body text, p_payload_hash text)
returns public.feedback_deliveries language plpgsql security invoker set search_path = public as $$
declare room clients; existing feedback_deliveries; result feedback_deliveries;
begin
 select * into room from clients where room_token_hash=p_room_hash and active for update;
 if not found then raise exception 'Room not found'; end if;
 if not exists(select 1 from review_versions where id=p_review and client_id=room.id and active) then raise exception 'Review not shared'; end if;
 select * into existing from feedback_deliveries where client_id=room.id and idempotency_key=p_key;
 if found then
  if existing.payload_hash<>p_payload_hash or existing.review_id<>p_review then raise exception 'Idempotency key conflict'; end if;
  return existing;
 end if;
 if (select count(*) from feedback_deliveries where client_id=room.id and created_at>now()-interval '1 minute')>=20 then raise exception 'Room rate limited'; end if;
 insert into feedback_deliveries(client_id,review_id,idempotency_key,author_name,body,payload_hash)
 values(room.id,p_review,p_key,p_name,p_body,p_payload_hash) returning * into result;
 return result;
end $$;
create function public.complete_feedback(p_delivery uuid, p_note text) returns boolean language plpgsql security invoker set search_path = public as $$
declare d feedback_deliveries;
begin
 select * into d from feedback_deliveries where id=p_delivery for update;
 if not found or d.status not in ('sending','uncertain','delivered') then raise exception 'Invalid delivery state'; end if;
 if d.buffer_note_id is not null and d.buffer_note_id<>p_note then raise exception 'Note conflict'; end if;
 if length(p_note)<1 then raise exception 'Invalid note'; end if;
 update feedback_deliveries set status='delivered', buffer_note_id=p_note where id=d.id;
 insert into room_note_visibility(client_id,review_id,buffer_note_id,delivery_id)
 values(d.client_id,d.review_id,p_note,d.id) on conflict(client_id,buffer_note_id) do nothing;
 return true;
end $$;
revoke execute on function public.acquire_refresh(uuid,uuid), public.save_refreshed_tokens(uuid,uuid,text),
 public.import_post(uuid,text,text,jsonb,text), public.assign_content(uuid,uuid,uuid), public.share_content(uuid,uuid),
 public.queue_feedback(text,uuid,uuid,text,text,text), public.complete_feedback(uuid,text) from public, anon, authenticated;
grant execute on function public.acquire_refresh(uuid,uuid), public.save_refreshed_tokens(uuid,uuid,text),
 public.import_post(uuid,text,text,jsonb,text), public.assign_content(uuid,uuid,uuid), public.share_content(uuid,uuid),
 public.queue_feedback(text,uuid,uuid,text,text,text), public.complete_feedback(uuid,text) to service_role;
commit;
