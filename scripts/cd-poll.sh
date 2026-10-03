#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-prod}"
IMAGE="ghcr.io/marfern2/admin-donit"
case "${DEPLOY_ENV}" in
  prod) PROJECT_DIR=/srv/docker/admin-donit; BRANCH=master ;;
  dev) PROJECT_DIR=/srv/docker/admin-donit-dev; BRANCH=develop ;;
  *) echo "DEPLOY_ENV debe ser dev o prod" >&2; exit 2 ;;
esac

PROJECT_DIR="${CD_PROJECT_DIR:-${PROJECT_DIR}}"
cd "${PROJECT_DIR}"
deployed="$(cat .deployed-sha 2>/dev/null || true)"
failed="$(cat .failed-sha 2>/dev/null || true)"
target="$(git ls-remote origin "refs/heads/${BRANCH}" 2>/dev/null | awk '{print $1}')"
[[ "${target}" =~ ^[0-9a-f]{40}$ ]] || { echo "No se pudo leer origin/${BRANCH}" >&2; exit 1; }
[[ "${target}" == "${deployed}" || "${target}" == "${failed}" ]] && exit 0
tag="${target}"
docker manifest inspect "${IMAGE}:${tag}" >/dev/null 2>&1 || exit 0
exec env DEPLOY_ENV="${DEPLOY_ENV}" ./scripts/cd-deploy.sh "${target}"
