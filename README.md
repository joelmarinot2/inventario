# Inventario y ventas de comestibles

Aplicación web para controlar el inventario y las ventas diarias de un negocio
pequeño de comestibles, con productos **empacados** (por gramaje) y **a granel**
(vendidos pesados). Pensada para usarse a diario desde el celular y el
computador, con foco total en la facilidad de uso.

- **Stack:** Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui,
  Supabase (PostgreSQL + Auth + Storage). PWA instalable. Despliegue en Vercel.
- **Idioma/moneda:** español de Colombia, pesos sin decimales (`$ 12.500`),
  zona horaria `America/Bogota`.
- El inventario se guarda siempre en **unidad base y entero**: paquetes
  (empacado) o gramos (granel). Nunca decimales.

---

## 1. Requisitos

- Node.js 20 o superior.
- Una cuenta de [Supabase](https://supabase.com) (gratis).
- Una cuenta de [Vercel](https://vercel.com) para desplegar (opcional para
  desarrollo local).

---

## 2. Configurar Supabase

### 2.1 Crear el proyecto
1. Entra a Supabase y crea un proyecto nuevo. Guarda la contraseña de la base.
2. Cuando termine de crearse, ve a **Project Settings → Data API** y copia el
   **Project URL** (algo como `https://xxxx.supabase.co`).
3. Ve a **Project Settings → API Keys** y copia la clave **publishable**
   (también llamada `anon public`). **Nunca uses la clave secreta
   (`service_role`) en el navegador.**

### 2.2 Ejecutar las migraciones y el seed
Las migraciones crean las tablas, las funciones (RPC), activan RLS, crean las
políticas y dan los `GRANT` explícitos al rol `authenticated` (en proyectos
nuevos de Supabase esto no es automático).

**Opción A — desde el panel (más fácil):**
1. Abre **SQL Editor** en el panel de Supabase.
2. Copia y ejecuta, **en orden**, el contenido de cada archivo:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_seguridad.sql`
   - `supabase/migrations/0003_funciones.sql`
   - `supabase/migrations/0004_storage.sql`
3. (Opcional, datos de ejemplo) Ejecuta `supabase/seed.sql` para cargar 8
   productos (5 empacados y 3 a granel).

**Opción B — con la CLI de Supabase:**
```bash
npm i -g supabase
supabase link --project-ref TU_PROJECT_REF
supabase db push          # aplica supabase/migrations en orden
# y para el seed:
psql "TU_CONNECTION_STRING" -f supabase/seed.sql
```

### 2.3 Crear el primer usuario administrador
El registro público está **desactivado**: los usuarios los crea el
administrador. Para el primer admin:

1. En el panel: **Authentication → Users → Add user** → escribe correo y
   contraseña, y marca el correo como confirmado.
2. Al crearse el usuario, un *trigger* le crea su perfil con rol `vendedor`.
   Conviértelo en admin ejecutando en el **SQL Editor**:
   ```sql
   update public.perfiles set rol = 'admin'
   where id = (select id from auth.users where email = 'TU_CORREO');
   ```
3. Ya con un admin, puedes crear los demás usuarios desde la app
   (**Administración → Usuarios**) o desde el panel.

> Para crear usuarios **desde la app**, configura la variable de servidor
> `SUPABASE_SERVICE_ROLE_KEY` (ver abajo). Si no la configuras, crea los
> usuarios desde el panel de Supabase; el cambio de rol sí funciona sin ella.

### 2.4 Storage (fotos)
La migración `0004_storage.sql` crea el bucket público `fotos-productos` con
lectura pública y subida/edición solo para admin. No necesitas hacer nada más.

---

## 3. Variables de entorno

Copia `.env.example` a `.env.local` y llena los valores:

```bash
cp .env.example .env.local
```

| Variable | Dónde va | Para qué |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | navegador + servidor | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navegador + servidor | clave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor**, opcional | crear usuarios desde la app |

⚠️ La `SUPABASE_SERVICE_ROLE_KEY` es secreta: úsala **solo en el servidor**
(sin el prefijo `NEXT_PUBLIC_`). Nunca la pongas en el navegador.

---

## 4. Correr en local

```bash
npm install
npm run dev
```
Abre http://localhost:3000 y entra con el usuario admin que creaste.

Otros comandos:
```bash
npm run test        # pruebas (venta, conversión, formato, redondeo $50, por plata)
npm run typecheck   # revisa tipos
npm run build       # build de producción
npm run lint        # ESLint
```

---

## 5. Desplegar en Vercel

1. Sube este repositorio a GitHub.
2. En Vercel: **New Project → Import** el repositorio.
3. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - (opcional) `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy.** Vercel detecta Next.js automáticamente.
5. Para instalar la PWA: abre la URL en Chrome/Edge (o Safari en iPhone) y usa
   **Instalar app** / **Agregar a la pantalla de inicio**.

---

## 6. Cómo funciona (resumen técnico)

- **Sesión persistente:** el middleware refresca el token en cada request; la
  sesión no se cierra sola.
- **Ventas atómicas e idempotentes:** guardar una venta llama a la función
  `registrar_venta` (RPC, `SECURITY DEFINER`), que recalcula los valores en el
  servidor, inserta venta + ítems + movimientos y descuenta el inventario en
  una sola transacción. La clave de idempotencia (generada en el cliente)
  evita duplicar por doble toque.
- **Nunca se bloquea una venta** por falta de inventario: si la app cree que no
  alcanza, avisa y deja vender; el stock puede quedar negativo (al vendedor se
  le muestra "Se acabó"; al admin, "Por revisar").
- **Nada se borra:** las ventas se anulan (devuelven el inventario) y el
  inventario se corrige con ajustes que guardan el motivo. Todo queda en la
  tabla `movimientos`.
- **Seguridad:** RLS en todas las tablas; los permisos de admin se validan en
  la base de datos (`public.es_admin()`), no solo en la interfaz. Registro
  público desactivado.
- **Granel:** por peso el valor se redondea al múltiplo de `$50`; "por plata"
  calcula los gramos y cobra exactamente la plata digitada.

### Modelo de datos
`perfiles`, `productos` (con CHECKs por tipo), `ventas` (con
`clave_idempotencia` única), `venta_items`, `movimientos`, más funciones de
informe (`informe_diario`, `informe_rango`, `resumen_dia`, `ranking_productos`).
Todo el SQL está en `supabase/migrations/` y el seed en `supabase/seed.sql`.

---

## 7. Pantallas

**Vendedor:** Inicio (4 botones gigantes), Vender (empacados y granel, con
teclado numérico, botones rápidos de granel, "por plata" y bulto completo),
Llegó mercancía, ¿Qué me queda? (semáforo) y ¿Cuánto vendí? (con envío por
WhatsApp).

**Administrador (acceso discreto):** productos y precios (con foto), ajuste de
inventario con motivo, "Por revisar" (negativos), ventas y anulaciones,
informes por rango de fechas con exportación a Excel/CSV, y usuarios.
