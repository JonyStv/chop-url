# Chop URL ✂️

> Acortador de enlaces moderno construido con **Express**, **Prisma + PostgreSQL** y **React + Vite** en una arquitectura Monorepo.

---

## Tabla de contenidos

- [Desarrollo local](#-desarrollo-local)
- [Variables de entorno](#-variables-de-entorno)
  - [Backend](#-backend-appsapi)
  - [Frontend](#-frontend-appsweb)
- [Despliegue en Vercel](#-despliegue-en-vercel)

---

## 💻 Desarrollo local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Copiar los archivos de ejemplo de variables de entorno
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Edita los .env con tus valores y arranca
pnpm dev
```

---

## 🛠️ Variables de entorno

Configura las siguientes variables antes de desplegar o ejecutar la aplicación.

### 🟢 Backend (`apps/api`)

Variables leídas por el servidor Express / Serverless Function.

| Variable                 |   Requerido    | Descripción                                                                                        | Ejemplo                                                      |
| :----------------------- | :------------: | :------------------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| `DATABASE_URL`           |     ✅ Sí      | Cadena de conexión a PostgreSQL (Neon, Supabase, Railway…).                                        | `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require` |
| `JWT_SECRET`             | ✅ Sí _(prod)_ | Clave secreta para firmar tokens JWT. Actúa como fallback si no se definen las claves específicas. | `una_cadena_aleatoria_muy_larga`                             |
| `JWT_ACCESS_SECRET`      |  ⬜ Opcional   | Clave específica para los **tokens de acceso**. Anula `JWT_SECRET`.                                | `clave_access_token`                                         |
| `JWT_REFRESH_SECRET`     |  ⬜ Opcional   | Clave específica para los **tokens de refresco**. Anula `JWT_SECRET`.                              | `clave_refresh_token`                                        |
| `JWT_ACCESS_EXPIRES_IN`  |  ⬜ Opcional   | Tiempo de expiración del token de acceso.                                                          | `15m`                                                        |
| `JWT_REFRESH_EXPIRES_IN` |  ⬜ Opcional   | Tiempo de expiración del token de refresco.                                                        | `7d`                                                         |
| `CORS_ORIGINS`           |  ⬜ Opcional   | Dominios autorizados para CORS, separados por comas.                                               | `https://tu-app.vercel.app`                                  |
| `PUBLIC_URL`             |  ⬜ Opcional   | URL pública base del backend.                                                                      | `https://tu-app.vercel.app`                                  |
| `COOKIE_SECURE`          |  ⬜ Opcional   | Exige HTTPS para las cookies (`true` / `false`). En producción, por defecto `true`.                | `true`                                                       |
| `COOKIE_SAME_SITE`       |  ⬜ Opcional   | Política SameSite de cookies (`none`, `lax`, `strict`). En producción, por defecto `none`.         | `none`                                                       |
| `NOT_ALLOWED_SLUG`       |  ⬜ Opcional   | Palabras reservadas que no se pueden usar como slug, separadas por comas.                          | `analytics,links,settings,identify,api`                      |
| `LOG_LEVEL`              |  ⬜ Opcional   | Nivel de detalle de los logs (`info`, `debug`, `error`).                                           | `info`                                                       |
| `PORT`                   |  ⬜ Opcional   | Puerto del servidor local. Vercel lo gestiona automáticamente.                                     | `3000`                                                       |

> [!NOTE]
> En producción, el servidor lanzará un error de arranque si `JWT_ACCESS_SECRET` o `JWT_REFRESH_SECRET` contienen el valor por defecto. Asegúrate de configurar secretos reales.

---

### 🔵 Frontend (`apps/web`)

Variables inyectadas en el cliente por Vite en tiempo de compilación.

> [!IMPORTANT]
> Todas las variables del frontend **deben empezar con `VITE_`** para que Vite las exponga al navegador.

| Variable          |  Requerido  | Descripción                                                                                                     | Ejemplo                     |
| :---------------- | :---------: | :-------------------------------------------------------------------------------------------------------------- | :-------------------------- |
| `VITE_API_URL`    | ⬜ Opcional | URL base de la API. Si frontend y backend comparten dominio en Vercel, usa `/api`. Por defecto: `/api`.         | `/api`                      |
| `VITE_APP_DOMAIN` | ⬜ Opcional | Dominio que se muestra al copiar un enlace acortado. Si se omite, usa `window.location.origin` automáticamente. | `https://tu-app.vercel.app` |
| `VITE_APP_NAME`   | ⬜ Opcional | Nombre de la aplicación mostrado en la interfaz.                                                                | `Chop URL`                  |

---

## 🚀 Despliegue en Vercel

1. **Importa el repositorio** en [vercel.com/new](https://vercel.com/new).

2. **Configura el proyecto** con estos valores:

   | Campo            | Valor            |
   | :--------------- | :--------------- |
   | Framework Preset | `Vite`           |
   | Build Command    | `pnpm build:web` |
   | Output Directory | `apps/web/dist`  |

3. **Añade las variables de entorno** en **Project Settings → Environment Variables** usando las tablas de la sección anterior.

> [!TIP]
> Vercel establece `NODE_ENV=production` y gestiona `PORT` automáticamente — no hace falta añadirlos manualmente.
