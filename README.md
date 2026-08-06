# Salvio Frontend

Sistema para clinicas en LATAM. Frontend web (Next.js) del SaaS multi-tenant
Salvio, que consume la API de [SalvioCore](../SalvioCore).

## Stack

- **Next.js 14** (App Router)
- **React 18** + **TypeScript**
- **Tailwind CSS**
- **Zustand** — estado global (auth, etc.)
- **TanStack Query** — data fetching / cache
- **React Hook Form + Zod** — formularios y validacion
- **jose** — manejo de JWT en el cliente

## Requisitos previos

- Node.js 18+
- El backend [SalvioCore](../SalvioCore) corriendo (por defecto en `http://127.0.0.1:8000`)

## Arranque local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Configurar variables de entorno:

   ```bash
   cp .env.local.example .env.local
   ```

3. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   La app queda disponible en `http://localhost:3000`.

## Variables de entorno (`.env.local`)

| Variable | Descripcion |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base de la API de SalvioCore |
| `NEXT_PUBLIC_DEFAULT_TENANT` | Tenant por defecto usado en desarrollo local |
| `NEXT_PUBLIC_APP_NAME` | Nombre de la app mostrado en la UI |

## Multi-tenant en desarrollo

La app resuelve el tenant por subdominio (`<tenant>.localhost:3000`). Para
probar un tenant especifico en local, agregalo a tu `hosts` o navega a
`http://<tenant>.localhost:3000`.

## Estructura del proyecto

```
src/
  app/
    (auth)/          Rutas publicas: login, onboarding, recuperar/resetear password, clinica bloqueada
    (dashboard)/     Rutas autenticadas: dashboard, agenda, pacientes, catalogos, clinica, operacion
    layout.tsx        Layout raiz
    globals.css       Estilos globales (Tailwind)
  modules/
    auth/            Login, wizard de alta de clinica, store de sesion, servicios de auth y platform-admin
    appointments/     Agenda: calendario mensual, admision/triage, filtros por medico
    clinical/         Historia clinica: encuentros, registros estructurados, notas
    operations/       Ordenes, laboratorio, imagenologia, referencias, facturacion (tabs de operacion)
    patients/         Alta, perfil y recursos del paciente (historial, quick-add)
    catalogs/         Catalogos clinicos (medicamentos, examenes, sistemas)
    tenant/           Utilidades de resolucion de tenant
  core/
    api/              Cliente HTTP base
    auth/             JWT, usuario actual, almacenamiento de token
  shared/
    components/       Layout (header, sidebar) y componentes de UI reutilizables
    utils/            Formateo de fechas, numeros, etc.
```

## Scripts

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de produccion
npm run start    # levantar build de produccion
npm run lint     # linter
```

## Docker

```bash
docker build -t salvio-frontend .
```
