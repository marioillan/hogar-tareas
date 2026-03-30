-- ============================================================
--  SCHEMA: Tareas del Hogar
--  Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- Personas del hogar
CREATE TABLE IF NOT EXISTS people (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Registro de tareas completadas
CREATE TABLE IF NOT EXISTS completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type    TEXT NOT NULL CHECK (task_type IN ('dishwasher', 'floor')),
  person_id    UUID REFERENCES people(id) ON DELETE SET NULL,
  due_date     DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS completions_task_type_idx ON completions(task_type);
CREATE INDEX IF NOT EXISTS completions_due_date_idx  ON completions(due_date DESC);

-- ============================================================
--  ROW LEVEL SECURITY — acceso público (uso familiar sin auth)
-- ============================================================
ALTER TABLE people      ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

-- Permitir todo a anon (ajusta si quieres añadir auth después)
CREATE POLICY "public_people"      ON people      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_completions" ON completions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
--  MIGRACIÓN: Habitaciones (rooms)
--  Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- Habitaciones del piso
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '🏠',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

-- Añadir room_id a completions para las tareas de habitación
ALTER TABLE completions ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

-- Actualizar constraint para permitir task_type = 'room'
ALTER TABLE completions DROP CONSTRAINT IF EXISTS completions_task_type_check;
ALTER TABLE completions ADD CONSTRAINT completions_task_type_check
  CHECK (task_type IN ('dishwasher', 'floor', 'room'));

CREATE INDEX IF NOT EXISTS completions_room_id_idx ON completions(room_id);
