#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-prod}"
IMAGE="ghcr.io/marfern2/admin-donit"
case "${DEPLOY_ENV}" in
  prod)
    PROJECT_DIR=/srv/docker/admin-donit; BRANCH=master; COMPOSE_FILE=compose.yaml
    LOCAL_HEALTH=http://127.0.0.1:8081/health
    PUBLIC_HEALTH=https://admin-donit.marfern.dev/health
    LOCAL_CONFIG=http://127.0.0.1:8081/config/runtime-config.json
    EXPECTED_API_URL=https://donit-api.marfern.dev
    ;;
  dev)
    PROJECT_DIR=/srv/docker/admin-donit-dev; BRANCH=develop; COMPOSE_FILE=compose.dev.yaml
    LOCAL_HEALTH=http://127.0.0.1:8083/health
    PUBLIC_HEALTH=https://admin-dev.marfern.dev/health
    LOCAL_CONFIG=http://127.0.0.1:8083/config/runtime-config.json
    EXPECTED_API_URL=https://donit-api-dev.marfern.dev
    ;;
  *) echo "DEPLOY_ENV debe ser dev o prod" >&2; exit 2 ;;
esac

target="${1:-}"
[[ "${target}" =~ ^[0-9a-f]{40}$ ]] || exit 2
tag="${target}"
ENV_FILE="${PROJECT_DIR}/.env"
LOG_DIR="${PROJECT_DIR}/logs"
mkdir -p "${LOG_DIR}" "${PROJECT_DIR}/backups-antes-deploy"
LOG_FILE="${LOG_DIR}/cd-deploy.log"
log() { printf '%s [%s] %s\n' "$(date -Is)" "${DEPLOY_ENV}" "$*" | tee -a "${LOG_FILE}"; }

cd "${PROJECT_DIR}"
exec 9>.cd-deploy.lock
flock -n 9 || { log "otro deploy en curso"; exit 1; }
git fetch origin "${BRANCH}" --quiet
git archive --format=tar "origin/${BRANCH}" "${COMPOSE_FILE}" scripts/ | tar -x -C "${PROJECT_DIR}"
chmod +x scripts/*.sh
docker manifest inspect "${IMAGE}:${tag}" >/dev/null

backup="${PROJECT_DIR}/backups-antes-deploy/.env-$(date +%Y%m%d-%H%M%S).bak"
cp -a "${ENV_FILE}" "${backup}"
chmod 600 "${backup}"
awk -v t="${tag}" '
  /^ADMIN_IMAGE_TAG=/ { seen=1; print "ADMIN_IMAGE_TAG=" t; next }
  { print }
  END { if (!seen) print "ADMIN_IMAGE_TAG=" t }
' "${ENV_FILE}" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

compose=(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}")
rollback() {
  cp -a "${backup}" "${ENV_FILE}"; chmod 600 "${ENV_FILE}"
  "${compose[@]}" up -d --no-deps frontend >/dev/null 2>&1 || true
  sleep 10
}
check() {
  local url="$1"
  for _ in $(seq 1 24); do curl -fsS --max-time 5 "${url}" | grep -qx OK && return 0; sleep 5; done
  return 1
}
check_runtime_config() {
  curl -fsS --max-time 5 "${LOCAL_CONFIG}" \
    | jq -e --arg expected "${EXPECTED_API_URL}" 'type == "object" and .apiUrl == $expected' >/dev/null
}

"${compose[@]}" pull frontend
"${compose[@]}" up -d --no-deps frontend >>"${LOG_FILE}" 2>&1
if ! check "${LOCAL_HEALTH}" || ! check "${PUBLIC_HEALTH}" || ! check_runtime_config; then
  printf '%s' "${target}" > .failed-sha; chmod 600 .failed-sha
  rollback
  log "ESTADO=3 health o API runtime incorrecta; rollback de imagen solicitado"
  exit 3
fi
printf '%s' "${target}" > .deployed-sha; chmod 600 .deployed-sha
rm -f .failed-sha
log "ESTADO=0 DEPLOY OK sha=${target} tag=${tag}"
