#!/usr/bin/env bash
# Stands up a fresh stack, proves the facts the design took from source, and tears it down.
set -uo pipefail
cd "$(dirname "$0")/.."

export AIRLOCK_API_PORT="${AIRLOCK_API_PORT:-28100}"
export AIRLOCK_GATEWAY_PORT="${AIRLOCK_GATEWAY_PORT:-23200}"
export AIRLOCK_MATTERMOST_PORT="${AIRLOCK_MATTERMOST_PORT:-28165}"
export AIRLOCK_POSTGRES_PORT="${AIRLOCK_POSTGRES_PORT:-25632}"
export AIRLOCK_LEDGER_PORT="${AIRLOCK_LEDGER_PORT:-28190}"
export AIRLOCK_OWNERS=two EJECT_GRACE_MS=10000 HIJACK_SET=full HIJACK_PACE_MS=0 READER_MODE=fixture

. lib/stack.sh
stack_require_docker || exit 2
stack_fetch_upstream || exit 2
rm -rf .run/airlock-check
stack_write_env airlock-check
stack_compose down -v --remove-orphans >/dev/null 2>&1
stack_check_ports || exit 2

stack_pull || exit 2
if ! stack_compose up -d --build; then
  stack_compose ps -a
  stack_compose logs --tail=60
  stack_compose down -v --remove-orphans >/dev/null 2>&1
  exit 2
fi
stack_compose --profile proof run --rm -T proof-runner \
  node --disable-warning=ExperimentalWarning src/proof/stack-check.ts
code=$?
if [ "$code" != 0 ]; then
  stack_compose ps -a
  stack_compose logs --tail=60
fi
stack_compose down -v --remove-orphans >/dev/null 2>&1
rm -rf .run/airlock-check
exit "$code"
