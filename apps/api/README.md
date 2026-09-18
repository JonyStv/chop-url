# Chop URL backend

Backend Express para Chop URL. La aplicación se puede ejecutar como servidor local o como función Node.js en Vercel.

## Desarrollo local

Requisitos: Node.js 20 o superior y pnpm.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

El servidor local queda disponible en `http://localhost:3000`.

## Tests y comprobaciones

```bash
pnpm test
pnpm run check
```

Los tests usan `.env.test` y restauran en memoria los datos de `data.json` al terminar.

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Selecciona el framework `Other` y deja vacío el build command.
3. Añade estas variables en Project Settings → Environment Variables:

```text
NODE_ENV=production
PUBLIC_URL=https://TU-BACKEND.vercel.app
CORS_ORIGINS=https://TU-FRONTEND.vercel.app
JWT_ACCESS_SECRET=<secreto-aleatorio-largo>
JWT_REFRESH_SECRET=<secreto-aleatorio-largo-y-distinto>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

`api/index.js` es la entrada serverless y `vercel.json` redirige todas las rutas hacia ella. No se debe ejecutar `server.js` en Vercel; ese archivo es únicamente para local.

## Persistencia provisional

`data.json` se importa como estado en memoria. Esto permite hacer demos y tests, pero no es persistente en Vercel: las escrituras pueden perderse cuando se recicle una función y distintas instancias pueden tener datos diferentes. Antes de usar el proyecto en producción hay que sustituir los modelos por una base de datos persistente, por ejemplo Postgres, Neon, Supabase o MongoDB.

La configuración ya está aislada en `config/env.js`, por lo que el cambio de almacenamiento podrá hacerse sin modificar los controladores ni las rutas.

## Frontend

El frontend debe usar la URL pública del backend mediante su propia variable, por ejemplo:

```text
VITE_API_URL=https://TU-BACKEND.vercel.app
```

Las peticiones que utilicen cookies deben incluir `credentials: "include"` y el dominio del frontend debe estar incluido en `CORS_ORIGINS`.
