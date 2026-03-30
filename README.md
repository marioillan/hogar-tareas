# 🏠 Tareas del Hogar

App web para gestionar las tareas del hogar con turnos rotativos,
historial y recordatorios de notificación.

**Stack:** React + Vite · Supabase (PostgreSQL) · Vercel

---

## ✨ Características

- 🍽️ **Lavavajillas** — tarea diaria con turno rotativo
- 🧹 **Limpiar el piso** — tarea semanal con turno rotativo
- 👥 **Personas ilimitadas** — añade quien quieras, reordena con ▲▼
- ✅ **Marcar como hecho** — un clic para registrar la tarea
- 🔥 **Rachas** — días/semanas consecutivas completadas
- 🔔 **Recordatorios** — notificaciones nativas del navegador
- 📋 **Historial** — con filtros y estadísticas
- 📱 **Mobile-first** — optimizado para móvil

---

## 🚀 Despliegue paso a paso

### 1. Clonar y preparar el proyecto

```bash
# Descomprime el ZIP y entra en la carpeta
cd hogar-tareas

# Instala dependencias
npm install
```

---

### 2. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) → **New Project**
2. Pon un nombre (ej. `hogar-tareas`) y contraseña segura
3. Espera a que termine de crear el proyecto (~1 min)

#### Crear las tablas

1. En el dashboard de Supabase ve a **SQL Editor**
2. Copia el contenido de `schema.sql` y ejecútalo
3. Verás las tablas `people` y `completions` en **Table Editor**

#### Obtener las credenciales

1. Ve a **Project Settings → API**
2. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

---

### 3. Variables de entorno locales

Crea un archivo `.env` en la raíz (copia `.env.example`):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Probar en local

```bash
npm run dev
# Abre http://localhost:5173
```

---

### 4. Subir a GitHub

```bash
git init
git add .
git commit -m "feat: initial hogar-tareas app"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/hogar-tareas.git
git push -u origin main
```

---

### 5. Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa tu repositorio de GitHub
3. En **Environment Variables** añade:
   - `VITE_SUPABASE_URL` → tu Project URL
   - `VITE_SUPABASE_ANON_KEY` → tu anon key
4. Click **Deploy** → ¡listo! 🎉

Vercel detecta automáticamente que es un proyecto Vite.

---

## 🔄 Cómo funcionan los turnos

Los turnos se calculan así:

```
turno_actual = número_de_completaciones % número_de_personas
```

Ejemplo con 3 personas [Ana, Luis, Marta]:
- 0 completaciones → turno de **Ana** (0 % 3 = 0)
- 1 completación   → turno de **Luis** (1 % 3 = 1)
- 2 completaciones → turno de **Marta** (2 % 3 = 2)
- 3 completaciones → turno de **Ana** de nuevo

Reordenar personas en la pestaña "Personas" cambia el orden de los turnos.

---

## 📁 Estructura del proyecto

```
hogar-tareas/
├── index.html
├── vite.config.js
├── package.json
├── schema.sql              ← Ejecutar en Supabase SQL Editor
├── .env.example            ← Copiar a .env y rellenar
└── src/
    ├── main.jsx
    ├── App.jsx             ← Navegación y fetching de datos
    ├── index.css           ← Estilos globales
    ├── lib/
    │   └── supabase.js     ← Cliente Supabase
    └── components/
        ├── Dashboard.jsx   ← Vista principal con las tareas
        ├── TaskCard.jsx    ← Tarjeta individual de tarea
        ├── PeopleManager.jsx ← Gestión de personas
        └── History.jsx     ← Historial y estadísticas
```

---

## 🗄️ Esquema de base de datos

### `people`
| campo        | tipo    | descripción            |
|-------------|---------|------------------------|
| id          | uuid    | Primary key            |
| name        | text    | Nombre de la persona   |
| order_index | integer | Orden en los turnos    |
| created_at  | timestamptz | Fecha de creación  |

### `completions`
| campo        | tipo    | descripción                          |
|-------------|---------|--------------------------------------|
| id          | uuid    | Primary key                          |
| task_type   | text    | `'dishwasher'` o `'floor'`           |
| person_id   | uuid    | FK → people.id                       |
| due_date    | date    | Día o semana a la que pertenece       |
| completed_at | timestamptz | Momento real de marcado       |

---

## 🔔 Notificaciones

Al pulsar el icono 🔔 en cada tarea:
1. El navegador pedirá permiso la primera vez
2. Verás una notificación nativa con el nombre de quien tiene el turno

> **Nota:** Las notificaciones automáticas programadas (recordatorio a las 8am, etc.)
> requieren un Service Worker. Por ahora el recordatorio se dispara manualmente.
> Se puede añadir como mejora futura.

---

## 🛠️ Mejoras futuras posibles

- [ ] Autenticación con Supabase Auth (para acceso privado)
- [ ] Notificaciones push programadas (Service Worker)
- [ ] Modo PWA / instalar en móvil como app
- [ ] Agregar más tipos de tareas personalizables
- [ ] Exportar historial a CSV

---

## 📄 Licencia

MIT — úsalo libremente para tu hogar 🏠
