# Achirapp — inventario y ventas de achiras

Aplicación web para controlar el inventario, las ventas diarias y la caja de
una fábrica de achiras. Catálogo fijo: **4 sabores × 4 gramajes (100/200/250/
500 g) × tarro o bolsa = 32 productos**, contados por unidades. Pensada para
usarse a diario desde el celular y el computador por una persona mayor, con
foco total en la facilidad de uso (botones y letra grandes, un paso a la vez).

- **Stack:** Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui,
  Supabase (PostgreSQL + Auth + Storage). PWA instalable. Despliegue en Vercel.
- **Idioma/moneda:** español de Colombia, pesos sin decimales (`$ 12.500`),
  zona horaria `America/Bogota`.
- El inventario se guarda siempre como **entero en unidad base** (unidades =
  tarros o bolsas). Nunca decimales.
- Cada día: **Iniciar día** (base en efectivo) → **Vender** → **Cerrar caja**.

> El manual de uso en PDF para la persona que vende se entrega aparte (contiene
> la dirección y las credenciales de acceso, por eso no va en el repositorio).

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
   - `supabase/migrations/0005_achiras.sql` (columna "valor de la empresa";
     deja inactivos los productos de ejemplo)
   - `supabase/migrations/0006_pagos_caja.sql` (método de pago con vuelto,
     tabla `cajas` y funciones de iniciar/cerrar caja; reaplica los GRANT)
   - `supabase/migrations/0007_presentacion.sql` (presentación tarro/bolsa)
   - `supabase/migrations/0008_seguridad_2.sql` (endurecimiento: rol desde
     `app_metadata`, funciones solo para usuarios autenticados, validación de
     ventas, una sola caja abierta, filtros por fecha con índice)
3. Ejecuta `supabase/seed.sql` para cargar el catálogo de la fábrica:
   32 productos = 4 sabores (tradicionales, gourmet, con chocolate, picantes)
   × 4 gramajes (100, 200, 250, 500 g) × tarro/bolsa. Es idempotente (solo
   inserta los que falten). Las cantidades, los precios y la foto de cada sabor
   se cargan luego desde la pantalla **Stock**.

> Si el SQL Editor se detiene por un error a mitad de un archivo, todo ese
> archivo se revierte: corrige y vuelve a ejecutarlo completo. Todos los
> archivos se pueden ejecutar más de una vez sin duplicar nada.

**Opción B — con la CLI de Supabase:**
```bash
npm i -g supabase
supabase link --project-ref TU_PROJECT_REF
supabase db push          # aplica supabase/migrations en orden
# y para el seed:
psql "TU_CONNECTION_STRING" -f supabase/seed.sql
```

### 2.3 Desactivar el registro público y crear el primer administrador
Los usuarios los crea el administrador; nadie debe poder registrarse solo.
**Desactívalo en el panel:** Authentication → Providers → Email → apaga
**"Allow new users to sign up"** (y, si aparece, "Enable anonymous sign-ins").
Sin esto, cualquiera con la clave publishable podría crearse una cuenta de
vendedor.

Para el primer admin:

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
- **Método de pago y vuelto:** cada venta guarda si se pagó en efectivo,
  transferencia, tarjeta u otro; en efectivo se registra cuánto entregó el
  cliente y la app calcula el vuelto (con atajos de billetes).
- **Caja:** `abrir_caja` (base en efectivo), `resumen_caja` y `cerrar_caja`
  resumen las ventas del turno por forma de pago. No se puede vender sin una
  caja abierta.
- **Fotos:** una por sabor, en Supabase Storage (bucket público
  `fotos-productos`; subir/quitar solo admin).

### Modelo de datos
`perfiles`, `productos` (con CHECKs por tipo, `precio_costo`, `presentacion`),
`ventas` (con `clave_idempotencia` única, `metodo_pago`, `pago_recibido`),
`venta_items`, `movimientos`, `cajas`, más funciones de informe
(`informe_diario`, `informe_rango`, `resumen_dia`, `ranking_productos`).
Todo el SQL está en `supabase/migrations/` y el seed en `supabase/seed.sql`.

---

## 7. Pantallas

**Vendedor:** Inicio (botones gigantes), Iniciar día / Cerrar caja, Vender
(sabor → gramaje → tarro/bolsa → cantidad → cobro con forma de pago y vuelto;
Deshacer la última venta), Llegó mercancía, ¿Qué me queda? (semáforo) y
¿Cuánto vendí? (por forma de pago, con envío por WhatsApp).

**Administrador:** Stock (cantidades, precio de venta, valor de la empresa y
foto por sabor) desde Inicio; y en Administración (acceso discreto):
productos, ajuste de inventario con motivo, "Por revisar" (negativos), ventas
y anulaciones, informes por rango de fechas con exportación a Excel/CSV, y
usuarios.
