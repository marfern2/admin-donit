# DEPLOYMENT — admin-donit

## Build local

```bash
npm ci
npm run build
```

## Docker

```bash
docker compose build
docker compose up -d
```

## Verificar

```bash
curl http://127.0.0.1:8081/
curl http://127.0.0.1:8081/health
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
