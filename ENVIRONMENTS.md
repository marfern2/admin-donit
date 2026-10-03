# Entornos admin Donit

La imagen Angular es independiente del entorno. Al arrancar, el contenedor
genera `/config/runtime-config.json` desde `DONIT_API_URL`; Angular bloquea su
bootstrap hasta cargar y validar ese fichero.

| Contexto | Comando/configuración | API |
|---|---|---|
| LOCAL | `npm start` | `http://localhost:8080` desde `public/config/runtime-config.json` |
| DEV | misma imagen Docker + `.env` DEV | `https://donit-api-dev.marfern.dev` |
| PROD | misma imagen Docker + `.env` PROD | `https://donit-api.marfern.dev` |

`runtime-config.json` solo contiene configuración pública. No admite HTTP
fuera de localhost y se sirve con `Cache-Control: no-store`. Si falta o es
inválido, la aplicación no termina el bootstrap; el código no tiene una URL
API de respaldo. Compose exige `DONIT_API_URL` explícita en cada `.env` de
DEV/PROD, sin defaults. Los ejemplos `.env.dev.example` y `.env.example`
muestran los valores respectivos; no contienen secretos. Cada Compose fija además
`DONIT_EXPECTED_API_URL`: el contenedor rechaza una API del otro entorno.

## Docker

```bash
# Bootstrap DEV local/server antes de disponer de GHCR
docker compose -f compose.dev.yaml -f compose.build.yaml --env-file .env up -d --build

# Operación normal desde GHCR
docker compose -f compose.dev.yaml --env-file .env up -d

# PROD, con un .env independiente basado en .env.example
docker compose -f compose.yaml --env-file .env up -d
```

DEV escucha solo en `127.0.0.1:8083`; PROD en `127.0.0.1:8081`. Ambos exponen
`/health` y guardan estados de despliegue independientes.

## Imagen y CD

Los pushes a `develop` y `master` publican `ghcr.io/marfern2/admin-donit:<sha40>`. El mismo
digest sirve DEV o PROD; la diferencia está únicamente en `DONIT_API_URL`.
Los aliases `develop` y `master` no son la fuente del despliegue.

El poller consulta la rama solo para seleccionar `TARGET_SHA`. El deploy exige
un SHA hexadecimal lowercase de 40 caracteres que exista como commit, descarga
ese objeto y extrae a un directorio temporal los únicos artefactos runtime
permitidos: `compose.dev.yaml` en DEV o `compose.yaml` en PROD,
`scripts/cd-poll.sh` y `scripts/cd-deploy.sh`. Verifica los archivos antes de
sincronizarlos y ejecuta el deployer extraído del propio `TARGET_SHA`. No usa
`origin/develop` ni `origin/master` como fuente después de seleccionar el SHA.
Comprueba además que Compose resuelve la imagen `frontend` al tag SHA exacto
antes de hacer pull o arrancar, tanto en deploy como en rollback.
No se sincronizan `src/`, Angular, `package*.json`, `docker/`, nginx ni los
ficheros de systemd: el contenedor ya trae el frontend y su entrypoint.

El checkout del servidor puede tener cambios locales: CD no hace `git pull`,
`git reset`, `git clean` ni `git checkout` y solo sustituye los tres archivos
versionados de la allowlist. El `.env`
real conserva sus variables; CD cambia atómicamente solo `ADMIN_IMAGE_TAG` y
guarda una copia en `backups-antes-deploy/`. Logs y marcadores son persistentes.
Si existe `.deployed-sha`, antes del cambio se preparan Compose y scripts del
`PREVIOUS_SHA` exacto para rollback, junto a su imagen. Tras un fallo, el
marcador anterior solo se repone si health local, health público y runtime
config vuelven a pasar. Si no existe `.deployed-sha`, el primer deploy puede
avanzar, pero no hay versión previa verificable: un fallo deja `.failed-sha`
del candidato, no escribe `.deployed-sha` y requiere intervención manual; no
deduce un SHA anterior a partir del alias `:develop` o `:master`.
Si un `PREVIOUS_SHA` existe pero su commit no contiene la allowlist completa o
su imagen SHA no está disponible, el deploy se detiene antes de tocar el
runtime: no hay rollback exacto verificable. Esto afecta a commits antiguos
anteriores a los scripts de CD y requiere resolver esa migración por separado.

`develop` usa GitHub Environment `development` y concurrencia
`admin-development` con cancelación del run anterior. `master` usa
`production` y `admin-production` sin cancelación. El deploy valida health
local y público y comprueba con `jq` el `apiUrl` servido por nginx en localhost
antes de escribir `.deployed-sha`. El host de CD necesita `jq` instalado.
El harness local de CD se ejecuta con `bash scripts/cd.test.sh`.
