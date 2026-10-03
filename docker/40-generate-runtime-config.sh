#!/bin/sh
set -eu

: "${DONIT_API_URL:?DONIT_API_URL es obligatoria}"

if [ -n "${DONIT_EXPECTED_API_URL:-}" ] && [ "${DONIT_API_URL}" != "${DONIT_EXPECTED_API_URL}" ]; then
  echo "DONIT_API_URL no coincide con la API esperada para este entorno" >&2
  exit 1
fi

if ! printf '%s' "${DONIT_API_URL}" \
  | grep -Eq '^https://[A-Za-z0-9._:-]+(/[^[:space:]"\\]*)?$|^http://(localhost|127\.0\.0\.1|10\.0\.2\.2)(:[0-9]+)?(/[^[:space:]"\\]*)?$'; then
  echo "DONIT_API_URL no es una URL HTTPS valida (HTTP solo se admite en local)" >&2
  exit 1
fi

config_dir=/usr/share/nginx/html/config
config_tmp="${config_dir}/runtime-config.json.tmp"
config_file="${config_dir}/runtime-config.json"

mkdir -p "${config_dir}"
printf '{\n  "apiUrl": "%s"\n}\n' "${DONIT_API_URL%/}" > "${config_tmp}"
chmod 644 "${config_tmp}"
mv "${config_tmp}" "${config_file}"
