-- Ejecutar en la base del proyecto principal. No contiene datos de ejemplo.
begin;
create table if not exists public.agent_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('monitoring', 'analysis', 'alert', 'complete')),
  message text not null,
  source text not null,
  created_at timestamptz not null default now()
);
create index if not exists agent_events_created_at_idx on public.agent_events(created_at desc);
alter table public.agent_events enable row level security;
revoke all on public.agent_events from anon, authenticated;
grant select on public.agent_events to authenticated;
grant all on public.agent_events to service_role;
drop policy if exists "Active staff read agent events" on public.agent_events;
create policy "Active staff read agent events" on public.agent_events for select to authenticated
using (exists(select 1 from public.perfiles p where p.id = auth.uid() and p.status = 'activo'));
commit;
