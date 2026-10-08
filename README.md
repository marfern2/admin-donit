# Donit — Web y Admin

Donit es una aplicación de gestión de tareas formada por una API Spring Boot, esta web Angular y una aplicación Android Kotlin/Compose. Este repositorio contiene el panel privado de administración y un catálogo público de demostración de solo lectura.

## Catálogo público `/demo`

La experiencia pública tiene layout y modelos propios, separados del backoffice. Rutas: `/demo`, `/demo/users`, `/demo/users/:publicId`, `/demo/task-types`, `/demo/task-types/:publicId`, `/demo/tasks` y `/demo/tasks/:publicId`. Todos los IDs de estas rutas son `publicId` UUID; no se exponen IDs internos, datos administrativos ni permisos.

`PublicDemoApiService` consume únicamente `GET /api/public/demo/**` con la URL base de `runtime-config.json`. El interceptor elimina `Authorization` en estas peticiones, incluso si existe una sesión admin. La configuración runtime se carga globalmente; la restauración de sesión admin y su llamada de refresh solo ocurren al entrar en rutas privadas protegidas por `authGuard`. Abrir `/demo` de forma anónima no inicia la sesión admin. El acceso administrativo sigue en `/login` y el resto de rutas privadas no cambia.

Los listados sincronizan búsqueda, orden, filtros, página y tamaño con la URL para conservar el estado al recargar y usar atrás/adelante. La búsqueda se recorta, espera 300 ms y solo se envía con 2–60 caracteres; los parámetros fuera de rango se ignoran y las solicitudes anteriores se cancelan. Usuarios ordena por `displayName` o `handle`; tipos por `name`; tareas por `dueDate` o `title`. Los filtros públicos son `userPublicId`, `taskTypePublicId`, `completed` y `urgency` según la sección. Los campos de usuario y tipo ofrecen sugerencias públicas al enfocarse (primeros 20 resultados) y también aceptan un UUID pegado. Las pantallas incluyen estados de carga, vacío, error y datos, también cuando DEV no tiene elementos publicados.

La API DEV puede no tener publicaciones. La web no incluye mocks en runtime. En la comprobación local, la API DEV permitió el origen `https://admin-dev.marfern.dev`, pero respondió 403 a `http://localhost:4200` y `http://127.0.0.1:4300`; el QA local con datos reales requiere un proxy o un origen autorizado. Antes de publicar la experiencia fuera del entorno actual, comprobar CORS/proxy para el origen público y definir rate limiting en la capa correspondiente; este cambio no configura esas capas.

## Stack y arquitectura

- Angular 21 y Angular Material.
- nginx sirve el frontend y `/health`; Docker y GHCR distribuyen la imagen.
- La API ofrece autenticación de administrador separada de la de usuarios Android.
- La misma imagen sirve DEV y PROD. Al arrancar, `DONIT_API_URL` genera `/config/runtime-config.json`; Angular lo carga y valida antes de iniciar las rutas.

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
