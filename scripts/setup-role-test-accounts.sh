#!/usr/bin/env bash
set -euo pipefail

# Deliberately separate from startup/migrations: never reset real users on each boot.
if [[ "${CCADRO_ENABLE_TEST_ACCOUNTS:-false}" != true ]]; then
  echo 'Set CCADRO_ENABLE_TEST_ACCOUNTS=true explicitly for a local development/test database.' >&2
  exit 1
fi
case "${CCADRO_ENV:-}" in
  development|test) ;;
  *) echo 'CCADRO_ENV must be development or test. Refusing weak test credentials.' >&2; exit 1 ;;
esac

project_root="$(cd "$(dirname "$0")/.." && pwd)"
docker exec -i "${CCADRO_TEST_DB_CONTAINER:-ccadro-postgres}" \
  psql -X --set=ON_ERROR_STOP=1 --set=demo_accounts=local-test-only \
  -U "${POSTGRES_USER:-ccadro}" -d "${POSTGRES_DB:-ccadro}" \
  < "$project_root/backend/db/demo/seed_role_test_accounts.sql"
