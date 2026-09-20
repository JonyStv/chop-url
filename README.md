# Chop URL

Acortador de enlaces moderno construido con Express (Backend), Prisma + PostgreSQL (Neon) y React + Vite (Frontend) en una arquitectura Monorepo.

---

## 🛠️ Variables de Entorno (Environment Variables)

Para el funcionamiento correcto de la aplicación (tanto en desarrollo local como al desplegar en **Vercel** u otras plataformas), debes configurar las siguientes variables de entorno.

### 🟢 Backend (`apps/api`)

| Variable                 |    Requerido    | Descripción                                                                                        | Valor por defecto / Ejemplo                                      |
| :----------------------- | :-------------: | :------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| `DATABASE_URL`           |     **Sí**      | URI de conexión a la base de datos PostgreSQL (Neon, Supabase, Railway, etc.).                     | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET`             | **Sí** _(prod)_ | Clave secreta para firmar tokens JWT. Sirve de fallback si no se definen las claves específicas.   | `cadena_secreta_aleatoria_muy_segura`                            |
| `JWT_ACCESS_SECRET`      |    Opcional     | Clave secreta específica para firmar los tokens de acceso JWT.                                     | `secreto_access_token_super_seguro`                              |
| `JWT_REFRESH_SECRET`     |    Opcional     | Clave secreta específica para firmar los tokens de refresco JWT.                                   | `secreto_refresh_token_super_seguro`                             |
| `CORS_ORIGINS`           |    Opcional     | Dominios permitidos para solicitudes CORS (separados por comas).                                   | `https://tu-app.vercel.app,http://localhost:5173`                |
| `PUBLIC_URL`             |    Opcional     | URL pública base de la API backend.                                                                | `https://tu-app.vercel.app`                                      |
| `JWT_ACCESS_EXPIRES_IN`  |    Opcional     | Tiempo de expiración del token de acceso JWT.                                                      | `15m`                                                            |
| `JWT_REFRESH_EXPIRES_IN` |    Opcional     | Tiempo de expiración del token de refresco JWT.                                                    | `7d`                                                             |
| `COOKIE_SECURE`          |    Opcional     | Determina si las cookies requieren conexión segura HTTPS (`true` / `false`).                       | `true` _(en producción)_                                         |
| `COOKIE_SAME_SITE`       |    Opcional     | Configuración SameSite de cookies (`none`, `lax`, `strict`).                                       | `none` _(en producción)_                                         |
| `NOT_ALLOWED_SLUG`       |    Opcional     | Lista de palabras clave reservadas separadas por comas que no se pueden usar como slugs acortados. | `analytics,links,settings,identify,api`                          |
| `LOG_LEVEL`              |    Opcional     | Nivel de logs de la aplicación (`info`, `debug`, `error`).                                         | `info`                                                           |
| `PORT`                   |    Opcional     | Puerto para el servidor backend local (Vercel lo gestiona automáticamente).                        | `3000`                                                           |

---

### 🔵 Frontend (`apps/web`)

> 💡 **Nota**: Todas las variables del frontend deben comenzar con el prefijo `VITE_` para que Vite las exponga en el cliente.

| Variable          | Requerido | Descripción                                                                                                                                | Valor por defecto / Ejemplo              |
| :---------------- | :-------: | :----------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------- |
| `VITE_API_URL`    | Opcional  | URL base de la API Backend. Si el frontend y backend comparten el mismo dominio en Vercel, se usa `/api`.                                  | `/api` o `https://tu-app.vercel.app/api` |
| `VITE_APP_DOMAIN` | Opcional  | Dominio público usado para construir y copiar los enlaces acortados. Si no se especifica, tomará automáticamente `window.location.origin`. | `https://tu-app.vercel.app`              |
| `VITE_APP_NAME`   | Opcional  | Nombre principal de la aplicación mostrado en la interfaz.                                                                                 | `Chop URL`                               |

---

## 🚀 Despliegue en Vercel

1. **Importar el repositorio**: Conecta tu repositorio de GitHub en Vercel.
2. **Configuración del proyecto**:
   - **Framework Preset**: Vite
   - **Build Command**: `pnpm build:web`
   - **Output Directory**: `apps/web/dist`
3. **Variables de Entorno**: Agrega las variables descritas arriba en **Project Settings -> Environment Variables** en la consola de Vercel.
   > 💡 **Nota**: Variables como NODE_ENV=production y PORT las gestiona Vercel de forma automática en sus Serverless Functions

---

## 💻 Desarrollo Local

```bash
# Clonar el proyecto e instalar dependencias
pnpm install

# Copiar archivos de variables de entorno de ejemplo
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Ejecutar backend y frontend en modo desarrollo
pnpm dev
```
