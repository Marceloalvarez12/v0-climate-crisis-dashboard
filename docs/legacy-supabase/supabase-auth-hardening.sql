-- Para la base operativa existente. Requiere perfiles, auditoria_admin,
-- asignaciones_recursos y recursos. Ejecutar mediante Supabase SQL Editor.
begin;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles(id, nombre, rol, status)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data->>'nombre', 120), ''), new.email, 'Usuario'), 'operador', 'suspendido');
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.perfiles where id = auth.uid() and rol = 'admin' and status = 'activo');
$$;

create or replace function public.registrar_auditoria(p_accion text, p_detalle jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acceso denegado' using errcode = '42501'; end if;
  insert into public.auditoria_admin(admin_id, accion, detalle) values(auth.uid(), p_accion, p_detalle);
end;
$$;

create or replace function public.replace_operator_resources(p_operator_id uuid, p_resource_ids text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acceso denegado' using errcode = '42501'; end if;
  -- Serialize replacements for the same operator; no intermediate empty state.
  perform 1 from public.perfiles where id = p_operator_id and status = 'activo' and rol = 'operador' for update;
  if not found then raise exception 'Operador activo requerido'; end if;
  if cardinality(p_resource_ids) > 100 then raise exception 'Demasiados recursos'; end if;
  if exists(select 1 from unnest(coalesce(p_resource_ids, '{}'::text[])) as ids(id)
    where not exists(select 1 from public.recursos r where r.id::text = ids.id and r.estado <> 'retired'))
    then raise exception 'Recurso inexistente o retirado'; end if;
  delete from public.asignaciones_recursos where operador_id = p_operator_id;
  insert into public.asignaciones_recursos(operador_id, recurso_id)
    select p_operator_id, id from unnest(coalesce(p_resource_ids, '{}'::text[])) as ids(id) group by id;
  perform public.registrar_auditoria('assign_resources', jsonb_build_object('user_id', p_operator_id, 'resource_ids', p_resource_ids));
end;
$$;

revoke all on function public.registrar_auditoria(text, jsonb) from public, anon;
revoke all on function public.replace_operator_resources(uuid, text[]) from public, anon;
grant execute on function public.registrar_auditoria(text, jsonb) to authenticated;
grant execute on function public.replace_operator_resources(uuid, text[]) to authenticated;
create index if not exists recursos_incidente_estado_idx on public.recursos(incidente_id, estado);
commit;
