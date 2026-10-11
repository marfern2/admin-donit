# Donit Admin v1.0.0

Donit Admin es el panel web de administración de Donit. Permite consultar y gestionar usuarios, tareas y tipos de tarea reales, y mantener un catálogo de demostración separado. Donit también incluye una API Spring Boot, que autentica y autoriza las operaciones, y una aplicación Android Kotlin/Compose para usuarios. Este repositorio contiene la web Angular y su despliegue; no contiene el backend ni Android.

**Estado:** Donit Admin v1.0.0 está desplegado y validado en producción en [admin-donit.marfern.dev](https://admin-donit.marfern.dev). El catálogo público está en [admin-donit.marfern.dev/demo](https://admin-donit.marfern.dev/demo). En la validación de esta release, PROD sirve el Admin del commit `8e04d92a4e9ff936796415f31f0799e6d0354b66` y el backend del commit `a37fd8e24481bca1c6178fdc3e033b0e3ff3dd50`. La demo PROD tiene **6 usuarios, 12 tipos, 24 tareas y 8 tareas completadas**; manifest v1, revisión 1. Estas cifras describen el estado validado, no un valor fijo de la interfaz.

## Arquitectura y tecnologías

- Angular 21, Angular Material y CSS nativo con CSS nesting; diseño responsive y temas claro, oscuro o según el sistema.
- Vitest mediante el test runner de Angular para pruebas unitarias y de integración de rutas.
- nginx sirve el bundle y `/health`; Docker empaqueta la web y GHCR distribuye imágenes identificadas por el SHA del commit.
- La misma imagen sirve DEV y PROD. Al iniciar el contenedor, `DONIT_API_URL` genera `/config/runtime-config.json`; Angular lo carga y valida antes de arrancar. El archivo solo contiene la URL pública de la API.
- La autenticación administrativa del backend es independiente de la aplicación Android. La web usa `/api/admin/**` para el panel privado y `/api/public/demo/**` para el catálogo anónimo.

## Rutas y permisos

| Área | Rutas | Acceso |
|---|---|---|
| Catálogo público | `/demo`, `/demo/users`, `/demo/task-types`, `/demo/tasks` y sus detalles `/:publicId` | Anónimo, solo lectura. Usa `publicId` UUID y `GET /api/public/demo/**` sin `Authorization`. |
| Inicio de sesión | `/login` | Autenticación administrativa. |
| Datos reales | `/dashboard`, `/users`, `/tasks`, `/task-types` y sus detalles | Sesión privada y `ADMIN_READ` para lectura. `USER_WRITE`, `USER_DELETE` y `TASK_WRITE` habilitan sus mutaciones correspondientes junto con `ADMIN_READ`. |
| Contenido demo | `/demo-content`, `/demo-content/users`, `/demo-content/task-types`, `/demo-content/tasks` y detalles | Sesión privada y algún permiso DEMO; los listados y detalles requieren `DEMO_READ`. |
| Fixtures demo | `/demo-content/fixtures` | Sesión privada y `DEMO_RESTORE`. |
| Preferencias | `/settings` | Sesión privada; selección de tema claro, oscuro o sistema. |

Tras el login y cada renovación de sesión, la web consulta `GET /api/admin/me`. Los permisos admitidos son `ADMIN_READ`, `USER_WRITE`, `USER_DELETE`, `TASK_WRITE`, `DEMO_READ`, `DEMO_WRITE`, `DEMO_PUBLISH` y `DEMO_RESTORE`. `DEMO_WRITE` permite crear, editar y borrar recursos demo; `DEMO_PUBLISH` permite publicar y despublicar; `DEMO_RESTORE` permite previsualizar y restaurar fixtures. Las operaciones sobre recursos demo necesitan además `DEMO_READ` en la UI para obtener datos y ETag. La API es la autoridad final para cada operación.

Los guards protegen las rutas privadas y filtran el acceso según capacidades. Una cuenta con permisos solo DEMO puede entrar en `/demo-content` sin acceso a los datos reales. La navegación inicial y tras cerrar sesión lleva a una ruta permitida o a `/login`; una URL privada no autorizada no se abre. Si `/api/admin/me` falla, las capacidades sensibles se vacían (fail-closed); un 401 termina la sesión. El logout limpia la sesión local y solicita la invalidación del refresh token al backend.

## Catálogo público

`/demo/**` presenta datos sintéticos publicados: 6 usuarios, 12 tipos de tarea, 24 tareas y 8 completadas en el estado PROD validado. Tiene layout y modelos propios. Los listados conservan búsqueda, filtros, orden y paginación en la URL, y muestran estados de carga, vacío y error. La UI también soporta un catálogo sin elementos publicados. No hay mocks en runtime ni se exponen IDs internos o permisos administrativos.

`PublicDemoApiService` usa solo `GET /api/public/demo/**`. El interceptor elimina `Authorization` de estas peticiones aunque exista una sesión administrativa. Entrar en `/demo` anónimamente no intenta renovar la sesión privada.

## Gestión privada de la demo

`/demo-content/**` usa `DemoAdminApiService` y `/api/admin/demo/**` con autenticación. Permite leer, editar y publicar contenido según los permisos independientes. La publicación es una acción separada de la edición y de la restauración. No existe borrado de usuarios demo.

La UI conserva el ETag opaco que devuelve cada GET individual y lo envía literalmente en `If-Match` al editar, borrar o cambiar la publicación. Un `412` indica que los datos cambiaron y requiere recarga; un `428` indica una precondición ausente. Un `429` muestra el límite y, si existe, `Retry-After`; la web no reintenta automáticamente. También se muestran errores de validación, permisos, conflictos y servidor sin exponer trazas.

En `/demo-content/fixtures`, `restore-preview` muestra el efecto previsto, incluidos conflictos y el número de registros personalizados, sin modificar datos. La restauración exige `DEMO_RESTORE`, un preview reciente (menos de cinco minutos), su ETag en `If-Match` y confirmación explícita. **La restauración nunca ocurre automáticamente.** Los fixtures gestionados vuelven al manifest en estado DRAFT; los registros personalizados no se modifican. Después se actualizan preview y estadísticas disponibles. Restaurar no publica: la publicación se hace aparte. Un catálogo vacío también puede previsualizarse y restaurarse explícitamente.

## Entornos y ejecución local

| Entorno | Admin | API | Puerto Admin en el host |
|---|---|---|---|
| LOCAL | `http://localhost:4200` | `http://localhost:8080` | `4200` (servidor Angular) |
| DEV | `https://admin-dev.marfern.dev` | `https://donit-api-dev.marfern.dev` | `127.0.0.1:8083` |
| PROD | `https://admin-donit.marfern.dev` | `https://donit-api.marfern.dev` | `127.0.0.1:8081` |

Con Node.js 22 y npm:

```bash
npm ci
npm start
```

Abrir `http://localhost:4200`. En desarrollo, `public/config/runtime-config.json` apunta a la API local. Para un bundle de producción independiente del entorno: `npm run build:image`. DEV y PROD tienen configuración runtime y despliegues separados; la URL de API se decide al iniciar el contenedor. Consultar [ENVIRONMENTS.md](ENVIRONMENTS.md) y [DEPLOYMENT.md](DEPLOYMENT.md) para operación y rollback.

## Pruebas y controles

```bash
npm test -- --watch=false
npm run test:audit
npm run build:image
node scripts/audit-dependencies.mjs
npm audit --omit=dev --audit-level=high
git diff --check
```

`npm test -- --watch=false` ejecuta la suite Angular canónica con Vitest. El verificador de dependencias cubre también tooling de desarrollo y mantiene una excepción específica y temporal para [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp). `npm audit --omit=dev --audit-level=high` comprueba por separado las dependencias de producción.

## Despliegue y seguridad

GitHub Actions construye y publica `ghcr.io/marfern2/admin-donit:<SHA40>` al integrar en `develop` (DEV) o `master` (PROD). Los pollers systemd seleccionan el SHA y despliegan la imagen con los artefactos operativos del mismo commit. Antes de registrar un despliegue validan contenedor, `/health`, URL de API de runtime e imagen exacta; el procedimiento de rollback está en [ENVIRONMENTS.md](ENVIRONMENTS.md).

El backend debe permitir por CORS el origen de cada Admin y, para las operaciones privadas, las cabeceras `Authorization`, `Content-Type` e `If-Match`; debe exponer `ETag` y `Retry-After` para que la web pueda gestionar concurrencia y límites. Los orígenes DEV y PROD se mantienen separados. `/config/runtime-config.json` no almacena credenciales ni secretos. Los guards y controles de UI complementan la autorización del backend; la API pública permanece anónima.
