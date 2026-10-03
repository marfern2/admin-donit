#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-prod}"
IMAGE=ghcr.io/marfern2/admin-donit
case "${DEPLOY_ENV}" in
  prod)
    PROJECT_DIR=/srv/docker/admin-donit; COMPOSE_FILE=compose.yaml
    LOCAL_HEALTH=http://127.0.0.1:8081/health
    PUBLIC_HEALTH=https://admin-donit.marfern.dev/health
    LOCAL_CONFIG=http://127.0.0.1:8081/config/runtime-config.json
    EXPECTED_API_URL=https://donit-api.marfern.dev
    ;;
  dev)
    PROJECT_DIR=/srv/docker/admin-donit-dev; COMPOSE_FILE=compose.dev.yaml
    LOCAL_HEALTH=http://127.0.0.1:8083/health
    PUBLIC_HEALTH=https://admin-dev.marfern.dev/health
    LOCAL_CONFIG=http://127.0.0.1:8083/config/runtime-config.json
    EXPECTED_API_URL=https://donit-api-dev.marfern.dev
    ;;
  *) echo "DEPLOY_ENV debe ser dev o prod" >&2; exit 2 ;;
esac
# Solo el harness local establece CD_PROJECT_DIR; systemd usa la ruta fija anterior.
PROJECT_DIR="${CD_PROJECT_DIR:-${PROJECT_DIR}}"
target="${1:-}"
[[ "${target}" =~ ^[0-9a-f]{40}$ ]] || { echo 'TARGET_SHA inválido' >&2; exit 2; }

cd "${PROJECT_DIR}"
LOG_DIR="${PROJECT_DIR}/logs"
mkdir -p "${LOG_DIR}" "${PROJECT_DIR}/backups-antes-deploy"
LOG_FILE="${LOG_DIR}/cd-deploy.log"
log() { printf '%s [%s] %s\n' "$(date -Is)" "${DEPLOY_ENV}" "$*" | tee -a "${LOG_FILE}"; }

# El padre mantiene el lock y el directorio temporal mientras ejecuta el
# cd-deploy.sh extraído del commit seleccionado. No ejecutamos el checkout.
if [[ "${CD_DEPLOY_STAGE:-}" != '' ]]; then
  target_stage="${CD_DEPLOY_STAGE}"
  previous_stage="${CD_PREVIOUS_STAGE:-}"
  previous="${CD_PREVIOUS_SHA:-}"
else
  exec 9>.cd-deploy.lock
  flock -n 9 || { log 'otro deploy en curso'; exit 1; }

  git fetch --quiet origin "${target}"
  [[ "$(git cat-file -t "${target}" 2>/dev/null)" == commit ]] || {
    log "TARGET_SHA no es un commit: ${target}"; exit 2;
  }

  previous="$(cat .deployed-sha 2>/dev/null || true)"
  if [[ -n "${previous}" ]]; then
    [[ "${previous}" =~ ^[0-9a-f]{40}$ ]] || { log 'PREVIOUS_SHA inválido'; exit 2; }
    if ! git cat-file -e "${previous}^{commit}" 2>/dev/null; then
      git fetch --quiet origin "${previous}"
    fi
    [[ "$(git cat-file -t "${previous}" 2>/dev/null)" == commit ]] || {
      log "PREVIOUS_SHA no es un commit: ${previous}"; exit 2;
    }
  fi

  stage_root="$(mktemp -d)"
  trap 'rm -rf -- "${stage_root}"' EXIT
  stage_artifacts() {
    local sha="$1" destination="$2" file
    mkdir -p "${destination}"
    git archive --format=tar "${sha}" "${COMPOSE_FILE}" \
      scripts/cd-poll.sh scripts/cd-deploy.sh | tar -xf - -C "${destination}"
    for file in "${COMPOSE_FILE}" scripts/cd-poll.sh scripts/cd-deploy.sh; do
      [[ -f "${destination}/${file}" && ! -L "${destination}/${file}" ]] || {
        log "Falta artefacto regular ${file} en ${sha}"; return 1;
      }
    done
  }
  target_stage="${stage_root}/target"
  stage_artifacts "${target}" "${target_stage}"
  previous_stage=''
  if [[ -n "${previous}" ]]; then
    previous_stage="${stage_root}/previous"
    stage_artifacts "${previous}" "${previous_stage}"
    docker manifest inspect "${IMAGE}:${previous}" >/dev/null
  fi
  docker manifest inspect "${IMAGE}:${target}" >/dev/null
  child_pid=''
  on_signal() {
    trap - INT TERM
    if [[ -n "${child_pid}" ]]; then
      kill -TERM "${child_pid}" 2>/dev/null || true
      wait "${child_pid}" || true
    fi
    exit 130
  }
  trap on_signal INT TERM
  CD_DEPLOY_STAGE="${target_stage}" CD_PREVIOUS_STAGE="${previous_stage}" \
    CD_PREVIOUS_SHA="${previous}" bash "${target_stage}/scripts/cd-deploy.sh" "${target}" &
  child_pid=$!
  wait "${child_pid}"
  exit $?
fi

ENV_FILE="${PROJECT_DIR}/.env"
[[ -f "${ENV_FILE}" ]] || { log '.env ausente'; exit 1; }
# También valida el handoff interno: un stage suministrado desde fuera no puede
# cambiar los bytes asociados al SHA ni convertir un blob en objetivo.
[[ "$(git cat-file -t "${target}" 2>/dev/null)" == commit ]] || exit 2
for file in "${COMPOSE_FILE}" scripts/cd-poll.sh scripts/cd-deploy.sh; do
  [[ -f "${target_stage}/${file}" && ! -L "${target_stage}/${file}" ]] || exit 2
  [[ "$(git hash-object "${target_stage}/${file}")" == "$(git rev-parse "${target}:${file}")" ]] || exit 2
done
if [[ -n "${previous}" ]]; then
  [[ "${previous}" =~ ^[0-9a-f]{40}$ ]] || exit 2
  [[ "$(git cat-file -t "${previous}" 2>/dev/null)" == commit ]] || exit 2
  for file in "${COMPOSE_FILE}" scripts/cd-poll.sh scripts/cd-deploy.sh; do
    [[ -f "${previous_stage}/${file}" && ! -L "${previous_stage}/${file}" ]] || exit 2
    [[ "$(git hash-object "${previous_stage}/${file}")" == "$(git rev-parse "${previous}:${file}")" ]] || exit 2
  done
fi

atomic_marker() {
  local path="$1" value="$2" tmp
  tmp="$(mktemp "${PROJECT_DIR}/${path}.XXXXXX")"
  printf '%s\n' "${value}" > "${tmp}"
  chmod 600 "${tmp}"
  mv -f -- "${tmp}" "${PROJECT_DIR}/${path}"
}
write_env_tag() {
  local sha="$1" source="$2" tmp
  tmp="$(mktemp "${PROJECT_DIR}/.env.XXXXXX")"
  awk -v t="${sha}" '
    /^ADMIN_IMAGE_TAG=/ { seen=1; print "ADMIN_IMAGE_TAG=" t; next }
    { print }
    END { if (!seen) print "ADMIN_IMAGE_TAG=" t }
  ' "${source}" > "${tmp}"
  chmod 600 "${tmp}"
  mv -f -- "${tmp}" "${ENV_FILE}"
}
sync_runtime() {
  local source="$1" file tmp mode
  [[ -d "${PROJECT_DIR}/scripts" && ! -L "${PROJECT_DIR}/scripts" ]] || return 1
  for file in "${COMPOSE_FILE}" scripts/cd-poll.sh scripts/cd-deploy.sh; do
    [[ -f "${source}/${file}" && ! -L "${source}/${file}" ]] || return 1
  done
  for file in "${COMPOSE_FILE}" scripts/cd-poll.sh scripts/cd-deploy.sh; do
    tmp="$(mktemp "${PROJECT_DIR}/${file}.XXXXXX")"
    cat -- "${source}/${file}" > "${tmp}"
    mode=644
    [[ "${file}" == scripts/* ]] && mode=755
    chmod "${mode}" "${tmp}"
    mv -f -- "${tmp}" "${PROJECT_DIR}/${file}"
  done
}
check() {
  local url="$1" attempt
  for ((attempt=0; attempt<12; attempt++)); do
    if curl -fsS --max-time 5 "${url}" 2>/dev/null | grep -qx OK; then return 0; fi
    sleep 5
  done
  return 1
}
check_runtime_config() {
  curl -fsS --max-time 5 "${LOCAL_CONFIG}" \
    | jq -e --arg expected "${EXPECTED_API_URL}" \
      'type == "object" and .apiUrl == $expected' >/dev/null
}
compose=(docker compose --project-directory "${PROJECT_DIR}" -f "${PROJECT_DIR}/${COMPOSE_FILE}" --env-file "${ENV_FILE}")
check_image() {
  local sha="$1"
  "${compose[@]}" config --format json | jq -e --arg expected "${IMAGE}:${sha}" \
    '.services.frontend.image == $expected' >/dev/null
}
backup="$(mktemp "${PROJECT_DIR}/backups-antes-deploy/.env-$(date +%Y%m%d-%H%M%S).XXXXXX.bak")"
cp -a -- "${ENV_FILE}" "${backup}"
chmod 600 "${backup}"

failure() {
  local code="$1" reason="$2" rollback_ok=1
  trap - ERR INT TERM
  set +e
  atomic_marker .failed-sha "${target}"
  if [[ -n "${previous}" ]]; then
    sync_runtime "${previous_stage}" || rollback_ok=0
    write_env_tag "${previous}" "${backup}" || rollback_ok=0
    check_image "${previous}" || rollback_ok=0
    "${compose[@]}" pull frontend >>"${LOG_FILE}" 2>&1 || rollback_ok=0
    "${compose[@]}" up -d --no-deps frontend >>"${LOG_FILE}" 2>&1 || rollback_ok=0
    if ((rollback_ok)) && check "${LOCAL_HEALTH}" && check "${PUBLIC_HEALTH}" && check_runtime_config; then
      atomic_marker .deployed-sha "${previous}"
      log "ESTADO=${code} ${reason}; rollback saludable sha=${previous}"
    else
      rm -f -- .deployed-sha
      log "ESTADO=${code} ${reason}; rollback no verificado, marcador anterior retirado"
    fi
  else
    log "ESTADO=${code} ${reason}; primer deploy sin PREVIOUS_SHA verificable, no hay rollback"
  fi
  exit "${code}"
}
trap 'failure "$?" "error inesperado"' ERR
trap 'failure 130 "interrumpido"' INT TERM

sync_runtime "${target_stage}"
rm -f -- .deployed-sha
write_env_tag "${target}" "${backup}"
check_image "${target}"
"${compose[@]}" pull frontend >>"${LOG_FILE}" 2>&1
"${compose[@]}" up -d --no-deps frontend >>"${LOG_FILE}" 2>&1
if ! check "${LOCAL_HEALTH}" || ! check "${PUBLIC_HEALTH}" || ! check_runtime_config; then
  failure 3 'health o API runtime incorrecta'
fi
atomic_marker .deployed-sha "${target}"
rm -f -- .failed-sha
log "ESTADO=0 DEPLOY OK sha=${target}"
