#!/usr/bin/env bash
set -Eeuo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf -- "${tmp}"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
mkdir -p "${tmp}/bin" "${tmp}/source"

git init -q --bare "${tmp}/remote.git"
git -C "${tmp}/source" init -q
git -C "${tmp}/source" config user.name 'CD test'
git -C "${tmp}/source" config user.email cd-test@example.invalid
git -C "${tmp}/source" switch -q -c develop
mkdir -p "${tmp}/source/scripts" "${tmp}/source/src/environments"
cp "${repo}/scripts/cd-poll.sh" "${repo}/scripts/cd-deploy.sh" "${tmp}/source/scripts/"
printf 'name: test-a\n' > "${tmp}/source/compose.dev.yaml"
printf 'name: test-prod\n' > "${tmp}/source/compose.yaml"
printf 'original\n' > "${tmp}/source/src/environments/environment.staging.ts"
git -C "${tmp}/source" add .
git -C "${tmp}/source" commit -qm A
a="$(git -C "${tmp}/source" rev-parse HEAD)"
git --git-dir="${tmp}/remote.git" fetch -q "${tmp}/source" develop:refs/heads/develop

printf 'name: test-b\n' > "${tmp}/source/compose.dev.yaml"
printf '# script B\n' >> "${tmp}/source/scripts/cd-poll.sh"
printf '# script B\n' >> "${tmp}/source/scripts/cd-deploy.sh"
git -C "${tmp}/source" add .
git -C "${tmp}/source" commit -qm B
b="$(git -C "${tmp}/source" rev-parse HEAD)"

git clone -q -b develop "${tmp}/remote.git" "${tmp}/server" 2>/dev/null
mkdir -p "${tmp}/server/logs" "${tmp}/server/src/environments"
printf 'local edits, byte-for-byte\n' > "${tmp}/server/src/environments/environment.staging.ts"
cp "${tmp}/server/src/environments/environment.staging.ts" "${tmp}/untouched"
printf 'old log\n' > "${tmp}/server/logs/keep.log"
printf 'DONIT_API_URL=https://donit-api-dev.marfern.dev\nSECRET=keep-me\nADMIN_IMAGE_TAG=legacy\n' > "${tmp}/server/.env"
printf 'old operational file\n' > "${tmp}/server/compose.dev.yaml"
printf '# old poller\n' >> "${tmp}/server/scripts/cd-poll.sh"
printf '# old deploy\n' >> "${tmp}/server/scripts/cd-deploy.sh"

cat > "${tmp}/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -Eeuo pipefail
if [[ "$1 $2" == 'manifest inspect' ]]; then
  if [[ "${ADVANCE_ON_MANIFEST:-}" == 1 && ! -e "${TEST_ROOT}/advanced" ]]; then
    git --git-dir="${TEST_ROOT}/remote.git" fetch -q "${TEST_ROOT}/source" develop:refs/heads/develop
    touch "${TEST_ROOT}/advanced"
  fi
  exit 0
fi
[[ "$1" == compose ]] || exit 1
tag="$(sed -n 's/^ADMIN_IMAGE_TAG=//p' "${CD_PROJECT_DIR}/.env")"
printf 'ghcr.io/marfern2/admin-donit:%s | %s\n' "${tag}" "$*" >> "${TEST_ROOT}/docker.calls"
if [[ "$*" == *' config --format json' ]]; then
  printf '{"services":{"frontend":{"image":"ghcr.io/marfern2/admin-donit:%s"}}}\n' "${MOCK_IMAGE_TAG:-${tag}}"
fi
MOCK
cat > "${tmp}/bin/curl" <<'MOCK'
#!/usr/bin/env bash
set -Eeuo pipefail
url="${*: -1}"
tag="$(sed -n 's/^ADMIN_IMAGE_TAG=//p' "${CD_PROJECT_DIR}/.env")"
if [[ "${FAIL_SHA:-}" == "${tag}" ]]; then
  printf 'BAD\n'
elif [[ "${url}" == */config/runtime-config.json ]]; then
  expected=https://donit-api-dev.marfern.dev
  [[ "${DEPLOY_ENV}" == prod ]] && expected=https://donit-api.marfern.dev
  printf '{"apiUrl":"%s"}\n' "${MOCK_API_URL:-${expected}}"
else
  printf 'OK\n'
fi
MOCK
cat > "${tmp}/bin/sleep" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK
chmod 755 "${tmp}/bin/"*
export PATH="${tmp}/bin:${PATH}" TEST_ROOT="${tmp}" CD_PROJECT_DIR="${tmp}/server" DEPLOY_ENV=dev

assert_sha_artifacts() {
  local sha="$1" file
  for file in compose.dev.yaml scripts/cd-poll.sh scripts/cd-deploy.sh; do
    git -C "${tmp}/source" show "${sha}:${file}" > "${tmp}/expected"
    cmp "${tmp}/expected" "${tmp}/server/${file}"
  done
}
assert_persistent() {
  cmp "${tmp}/untouched" "${tmp}/server/src/environments/environment.staging.ts"
  [[ "$(cat "${tmp}/server/logs/keep.log")" == 'old log' ]]
  grep -qx 'SECRET=keep-me' "${tmp}/server/.env"
  grep -qx 'DONIT_API_URL=https://donit-api-dev.marfern.dev' "${tmp}/server/.env"
}

# El poller elige A y el mock mueve develop a B durante el manifest inspect.
ADVANCE_ON_MANIFEST=1 "${repo}/scripts/cd-poll.sh"
[[ -e "${tmp}/advanced" ]]
[[ "$(cat "${tmp}/server/.deployed-sha")" == "${a}" ]]
[[ ! -e "${tmp}/server/.failed-sha" ]]
grep -q "ghcr.io/marfern2/admin-donit:${a}" "${tmp}/docker.calls"
assert_sha_artifacts "${a}"
assert_persistent

# B falla; imagen, Compose y scripts vuelven exactamente a A.
FAIL_SHA="${b}" "${repo}/scripts/cd-poll.sh" && { echo 'B debería fallar' >&2; exit 1; } || status=$?
[[ "${status}" == 3 ]]
[[ "$(cat "${tmp}/server/.deployed-sha")" == "${a}" ]]
[[ "$(cat "${tmp}/server/.failed-sha")" == "${b}" ]]
grep -qx "ADMIN_IMAGE_TAG=${a}" "${tmp}/server/.env"
assert_sha_artifacts "${a}"
assert_persistent

# SHA no válido, incluso uno que apunta a un blob, no despliega.
if "${repo}/scripts/cd-deploy.sh" '-bad'; then exit 1; fi
blob="$(git -C "${tmp}/server" rev-parse HEAD:compose.dev.yaml)"
if "${repo}/scripts/cd-deploy.sh" "${blob}"; then exit 1; fi

# Bootstrap fallido: no se inventa PREVIOUS_SHA ni se escribe .deployed-sha.
git clone -q -b develop "${tmp}/remote.git" "${tmp}/bootstrap" 2>/dev/null
printf 'DONIT_API_URL=https://donit-api-dev.marfern.dev\nSECRET=bootstrap\n' > "${tmp}/bootstrap/.env"
CD_PROJECT_DIR="${tmp}/bootstrap" FAIL_SHA="${b}" "${repo}/scripts/cd-deploy.sh" "${b}" && {
  echo 'Bootstrap debería fallar' >&2; exit 1;
} || status=$?
[[ "${status}" == 3 ]]
[[ ! -e "${tmp}/bootstrap/.deployed-sha" ]]
[[ "$(cat "${tmp}/bootstrap/.failed-sha")" == "${b}" ]]
grep -qx 'SECRET=bootstrap' "${tmp}/bootstrap/.env"

# Si el commit previo carece de los artefactos de rollback, aborta antes de
# modificar Compose, .env o los marcadores.
git init -q "${tmp}/legacy"
git -C "${tmp}/legacy" config user.name 'CD test'
git -C "${tmp}/legacy" config user.email cd-test@example.invalid
printf 'name: legacy\n' > "${tmp}/legacy/compose.dev.yaml"
git -C "${tmp}/legacy" add .
git -C "${tmp}/legacy" commit -qm legacy
legacy="$(git -C "${tmp}/legacy" rev-parse HEAD)"
git --git-dir="${tmp}/remote.git" fetch -q "${tmp}/legacy" HEAD:refs/heads/legacy
git clone -q -b develop "${tmp}/remote.git" "${tmp}/incomplete" 2>/dev/null
printf 'DONIT_API_URL=https://donit-api-dev.marfern.dev\nSECRET=untouched\n' > "${tmp}/incomplete/.env"
printf '%s\n' "${legacy}" > "${tmp}/incomplete/.deployed-sha"
cp "${tmp}/incomplete/.env" "${tmp}/expected-env"
cp "${tmp}/incomplete/compose.dev.yaml" "${tmp}/expected-compose"
if CD_PROJECT_DIR="${tmp}/incomplete" "${repo}/scripts/cd-deploy.sh" "${b}"; then
  echo 'Rollback incompleto debería impedir el deploy' >&2; exit 1
fi
cmp "${tmp}/expected-env" "${tmp}/incomplete/.env"
cmp "${tmp}/expected-compose" "${tmp}/incomplete/compose.dev.yaml"
[[ "$(cat "${tmp}/incomplete/.deployed-sha")" == "${legacy}" ]]
[[ ! -e "${tmp}/incomplete/.failed-sha" ]]

# La comprobación runtime de PROD exige su URL exacta, también en primer deploy.
git clone -q -b develop "${tmp}/remote.git" "${tmp}/prod" 2>/dev/null
printf 'DONIT_API_URL=https://donit-api.marfern.dev\nSECRET=prod\n' > "${tmp}/prod/.env"
if CD_PROJECT_DIR="${tmp}/prod" DEPLOY_ENV=prod \
  MOCK_API_URL=https://donit-api-dev.marfern.dev \
  "${repo}/scripts/cd-deploy.sh" "${b}"; then
  echo 'PROD debería rechazar la API DEV' >&2; exit 1
fi
[[ ! -e "${tmp}/prod/.deployed-sha" ]]
[[ "$(cat "${tmp}/prod/.failed-sha")" == "${b}" ]]
grep -qx 'SECRET=prod' "${tmp}/prod/.env"

# Compose debe resolver frontend al SHA seleccionado antes del pull.
git clone -q -b develop "${tmp}/remote.git" "${tmp}/wrong-image" 2>/dev/null
printf 'DONIT_API_URL=https://donit-api-dev.marfern.dev\n' > "${tmp}/wrong-image/.env"
if CD_PROJECT_DIR="${tmp}/wrong-image" MOCK_IMAGE_TAG="${a}" \
  "${repo}/scripts/cd-deploy.sh" "${b}"; then
  echo 'Compose con otro tag debería fallar' >&2; exit 1
fi
[[ ! -e "${tmp}/wrong-image/.deployed-sha" ]]
[[ "$(cat "${tmp}/wrong-image/.failed-sha")" == "${b}" ]]
printf 'CD tests OK\n'
