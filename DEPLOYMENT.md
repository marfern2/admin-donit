# DEPLOYMENT — admin-donit

El despliegue normal de DEV y PROD lo realizan GitHub Actions, GHCR y los pollers systemd con imagen `ghcr.io/marfern2/admin-donit:<SHA40>`. Esta página conserva comandos de comprobación y de arranque manual; el flujo de CD, la separación de entornos y el rollback están en [ENVIRONMENTS.md](ENVIRONMENTS.md).

## Build local

```bash
npm ci
npm run build:image
```

## Docker manual (bootstrap o diagnóstico)

```bash
cp .env.example .env
# Revisar DONIT_API_URL en .env antes de arrancar; debe apuntar a la API PROD.
docker compose -f compose.yaml -f compose.build.yaml --env-file .env up -d --build
```

## Verificar

```bash
curl http://127.0.0.1:8081/
curl http://127.0.0.1:8081/health
curl http://127.0.0.1:8081/config/runtime-config.json
```

## Producción

- **Frontend**: https://admin-donit.marfern.dev
- **API**: https://donit-api.marfern.dev

## Configuración externa requerida

### Cloudflare Tunnel

```
admin-donit.marfern.dev → 127.0.0.1:8081
```

El contenedor expone el puerto 80 internamente, mapeado a 8081 en localhost.
La imagen es la misma para DEV y PROD: el entrypoint genera
`/config/runtime-config.json` desde `DONIT_API_URL` en `.env`. La variable es
obligatoria; sin ella Compose no arranca. En operación normal se usa
`docker compose -f compose.yaml --env-file .env up -d` con la imagen de GHCR.
`develop` publica DEV y `master` publica PROD. El CD en el servidor requiere `jq`
para comprobar que la API servida por nginx corresponde al entorno.

### CORS (backend)

El backend PROD permite el origen `https://admin-donit.marfern.dev`; DEV permite `https://admin-dev.marfern.dev` en `donit-api-dev.marfern.dev`. La política CORS debe incluir la cabecera `Authorization` usada por el panel:

```
Access-Control-Allow-Origin: https://admin-donit.marfern.dev
Access-Control-Allow-Headers: Authorization, Content-Type
```

Mantener la lista de orígenes explícita y separada por entorno.

Cookies HttpOnly no se usan actualmente.

## No incluir

- Secretos o tokens
- Credenciales del backend
- JWT_ADMIN_SECRET
