# DEPLOYMENT — admin-donit

## Build local

```bash
npm ci
npm run build:image
```

## Docker

```bash
cp .env.example .env
# Revisar DONIT_API_URL en .env antes de arrancar.
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
`develop` publica DEV y `master` publica PROD. El CD local requiere `jq`
para comprobar que la API servida por nginx corresponde al entorno.

### CORS (backend)

El backend `donit-api.marfern.dev` debe permitir requests desde `https://admin-donit.marfern.dev`:

```
Access-Control-Allow-Origin: https://admin-donit.marfern.dev
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

**No usar** `Access-Control-Allow-Origin: *` ya que se envía `Authorization` header.

Cookies HttpOnly no se usan actualmente. `Access-Control-Allow-Credentials` solo sería necesario si en el futuro migra auth a cookies.

## No incluir

- Secretos o tokens
- Credenciales del backend
- JWT_ADMIN_SECRET
