-- ============================================================
--  Tareas del Hogar · Esquema Supabase (PostgreSQL)
--  Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ── Grupos ──────────────────────────────────────────────────
create table if not exists groups (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  name             text not null,
  admin_member_id  uuid,                         -- se rellena tras crear al admin
  created_at       timestamptz not null default now()
);

-- ── Integrantes ─────────────────────────────────────────────
create table if not exists members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  order_index  integer not null default 0,
  joined       boolean not null default false,    -- true cuando alguien lo elige al entrar
  joined_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (group_id, name)
);
create index if not exists members_group_idx on members(group_id);

alter table groups
  drop constraint if exists groups_admin_fk,
  add constraint groups_admin_fk foreign key (admin_member_id)
      references members(id) on delete set null;

-- ── Zonas de limpieza ───────────────────────────────────────
create table if not exists rooms (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  order_index  integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists rooms_group_idx on rooms(group_id);

-- ── Lavavajillas: registro (una vez por día y grupo) ────────
create table if not exists dish_log (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  person_id   uuid references members(id) on delete set null,   -- quién lo sacó
  marked_by   uuid references members(id) on delete set null,   -- quién pulsó el botón
  skipped     uuid[] not null default '{}',                     -- a quién cubrió
  done_at     timestamptz not null default now(),
  done_date   date not null default (now() at time zone 'Europe/Madrid')::date,
  unique (group_id, done_date)                                  -- ← solo 1 al día
);
create index if not exists dish_log_group_idx on dish_log(group_id, done_at desc);

-- ── Lavavajillas: saltos pendientes del turno actual ────────
--   Se borran todos los del grupo al registrar un dish_log.
create table if not exists dish_skips (
  group_id    uuid not null references groups(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  created_by  uuid references members(id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (group_id, member_id)
);

-- ── Rotación semanal de limpieza (una por grupo) ────────────
create table if not exists rotations (
  group_id    uuid primary key references groups(id) on delete cascade,
  status      text not null default 'waiting' check (status in ('waiting','active')),
  mode        text check (mode in ('aleatoria','manual')),
  order_ids   uuid[] not null default '{}',   -- orden de integrantes; zona i en semana w → order_ids[(i+w) % n]
  week        integer not null default 0,
  started_at  timestamptz,
  updated_at  timestamptz not null default now()
);

-- ── Zonas hechas por semana ─────────────────────────────────
create table if not exists room_done (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references groups(id) on delete cascade,
  week      integer not null,
  room_id   uuid not null references rooms(id) on delete cascade,
  done_by   uuid references members(id) on delete set null,
  done_at   timestamptz not null default now(),
  unique (group_id, week, room_id)
);
create index if not exists room_done_group_week_idx on room_done(group_id, week);

-- ── Función: crear grupo + admin + integrantes + zonas en 1 llamada
create or replace function create_group(
  p_group_name text, p_admin_name text, p_members text[], p_rooms text[]
) returns table (group_id uuid, code text, admin_id uuid)
language plpgsql as $$
declare
  v_code text; v_group uuid; v_admin uuid; i int;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from groups g where g.code = v_code);
  end loop;

  insert into groups(code, name) values (v_code, p_group_name) returning id into v_group;
  insert into members(group_id, name, order_index, joined, joined_at)
    values (v_group, p_admin_name, 0, true, now()) returning id into v_admin;
  update groups set admin_member_id = v_admin where id = v_group;

  for i in 1..coalesce(array_length(p_members, 1), 0) loop
    insert into members(group_id, name, order_index) values (v_group, p_members[i], i);
  end loop;
  for i in 1..coalesce(array_length(p_rooms, 1), 0) loop
    insert into rooms(group_id, name, order_index) values (v_group, p_rooms[i], i - 1);
  end loop;
  insert into rotations(group_id) values (v_group);

  return query select v_group, v_code, v_admin;
end $$;

-- ── Función: registrar lavavajillas (limpia saltos de forma atómica)
create or replace function mark_dish(p_group uuid, p_person uuid, p_marked_by uuid)
returns dish_log language plpgsql as $$
declare v_row dish_log;
begin
  insert into dish_log(group_id, person_id, marked_by, skipped)
  values (p_group, p_person, p_marked_by,
          coalesce((select array_agg(member_id) from dish_skips where group_id = p_group), '{}'))
  returning * into v_row;               -- falla con unique_violation si ya se hizo hoy
  delete from dish_skips where group_id = p_group;
  return v_row;
end $$;

-- ============================================================
--  ROW LEVEL SECURITY
--  La app no usa login: la sesión es el id de integrante guardado
--  en el móvil (localStorage). Igual que el repo actual, se abre el
--  acceso a la clave anon. Suficiente para uso doméstico; si luego
--  quieres cerrarlo, añade Supabase Auth y filtra por group_id.
-- ============================================================
alter table groups     enable row level security;
alter table members    enable row level security;
alter table rooms      enable row level security;
alter table dish_log   enable row level security;
alter table dish_skips enable row level security;
alter table rotations  enable row level security;
alter table room_done  enable row level security;

create policy "anon_all_groups"     on groups     for all using (true) with check (true);
create policy "anon_all_members"    on members    for all using (true) with check (true);
create policy "anon_all_rooms"      on rooms      for all using (true) with check (true);
create policy "anon_all_dish_log"   on dish_log   for all using (true) with check (true);
create policy "anon_all_dish_skips" on dish_skips for all using (true) with check (true);
create policy "anon_all_rotations"  on rotations  for all using (true) with check (true);
create policy "anon_all_room_done"  on room_done  for all using (true) with check (true);

-- ── Realtime: que todos los móviles se actualicen al momento ─
alter publication supabase_realtime add table members, rooms, dish_log, dish_skips, rotations, room_done;
