# Donit — Admin

Donit es una aplicación de gestión de tareas formada por una API Spring Boot, este panel de administración Angular y una aplicación Android Kotlin/Compose. Este repositorio permite al administrador iniciar sesión y gestionar usuarios, tareas y tipos de tarea, incluido habilitar o deshabilitar usuarios.

## Stack y arquitectura

- Angular 21 y Angular Material.
- nginx sirve el frontend y `/health`; Docker y GHCR distribuyen la imagen.
- La API ofrece autenticación de administrador separada de la de usuarios Android.
- La misma imagen sirve DEV y PROD. Al arrancar, `DONIT_API_URL` genera `/config/runtime-config.json`; Angular lo carga y valida antes de iniciar.

## Entornos

| Entorno | Admin | API | Puerto Admin en el host |
|---|---|---|---|
| LOCAL | `http://localhost:4200` | `http://localhost:8080` | `4200` |
| DEV | `https://admin-dev.marfern.dev` | `https://donit-api-dev.marfern.dev` | `127.0.0.1:8083` |
| PROD | `https://admin-donit.marfern.dev` | `https://donit-api.marfern.dev` | `127.0.0.1:8081` |

DEV y PROD tienen configuración runtime y despliegues separados. La URL de API se decide al arrancar el contenedor, no durante el build. Detalles en [ENVIRONMENTS.md](ENVIRONMENTS.md).

## Ejecución local

Con Node.js 22 y npm:

```bash
npm ci
npm start
```

Abrir `http://localhost:4200`. El servidor de desarrollo lee `public/config/runtime-config.json`, que apunta a la API local. Para generar el bundle de la imagen: `npm run build:image` (salida en `dist/`). Configuración Docker y comprobaciones manuales en [DEPLOYMENT.md](DEPLOYMENT.md).

## Tests

```bash
npm test -- --watch=false
npm run test:audit
```

CI también ejecuta controles de dependencias y construye el bundle independiente del entorno.

## CI/CD

`feature/*` se integra en `develop` para DEV; `develop` se promueve a `master` para PROD. GitHub Actions publica `ghcr.io/marfern2/admin-donit:<SHA40>`. Pollers systemd seleccionan el commit y usan imagen y artefactos operativos del mismo SHA, sin depender de que el working tree del servidor esté limpio. El despliegue valida contenedor healthy, `/health`, URL de API exacta en runtime config e imagen SHA40 antes de escribir `.deployed-sha`; en éxito no queda `.failed-sha`.

La allowlist de artefactos incluye Compose, `scripts/cd-poll.sh` y `scripts/cd-deploy.sh`. Procedimiento y rollback en [ENVIRONMENTS.md](ENVIRONMENTS.md).

## Seguridad

El panel usa la autenticación de administrador del backend. `/config/runtime-config.json` solo contiene la URL pública de API: no admite secretos. Cada entorno exige su propia `DONIT_API_URL` y comprueba que corresponde a DEV o PROD. CI aplica `npm audit --omit=dev --audit-level=high` y el gate completo de `scripts/audit-dependencies.mjs`. Este último mantiene una excepción temporal y específica para [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp) en tooling de desarrollo. No se versionan credenciales ni tokens.

## Estado

Admin DEV y PROD operativos; CD de ambos entornos operativo.
