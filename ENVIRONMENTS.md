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

`develop` usa GitHub Environment `development` y concurrencia
`admin-development` con cancelación del run anterior. `master` usa
`production` y `admin-production` sin cancelación. Los pollers validan health
local y público y comprueban con `jq` el `apiUrl` servido por nginx en localhost
antes de escribir `.deployed-sha`. El host de CD necesita `jq` instalado.
