#!/usr/bin/env bash
# Runs the desk for the demo and leaves it up. One person plays both the clerk and the controller.
set -uo pipefail
cd "$(dirname "$0")"

export AIRLOCK_API_PORT="${AIRLOCK_API_PORT:-27000}"
export AIRLOCK_GATEWAY_PORT="${AIRLOCK_GATEWAY_PORT:-23100}"
export AIRLOCK_MATTERMOST_PORT="${AIRLOCK_MATTERMOST_PORT:-27065}"
export AIRLOCK_POSTGRES_PORT="${AIRLOCK_POSTGRES_PORT:-25532}"
export AIRLOCK_LEDGER_PORT="${AIRLOCK_LEDGER_PORT:-27090}"
export AIRLOCK_OWNERS=two
export EJECT_GRACE_MS="${EJECT_GRACE_MS:-15000}"
export HIJACK_SET="${HIJACK_SET:-demo}"
export HIJACK_PACE_MS="${HIJACK_PACE_MS:-2500}"

. lib/stack.sh

MODEL_ENV=".run/airlock-demo/model.env"

prepare() {
  stack_require_docker || exit 2
  stack_fetch_upstream || exit 2
  stack_write_env airlock-demo
}

# Commands on a running desk must see the same Compose files it was started with.
use_model_files() {
  if [ -f "$MODEL_ENV" ]; then STACK_EXTRA_ARGS=(-f "$STACK_ROOT/deploy/compose.model.yaml"); fi
}

logins() {
  stack_compose --profile proof run --rm -T --no-deps proof-runner \
    node --disable-warning=ExperimentalWarning src/proof/print-logins.ts
}

case "${1:-}" in
  up)
    if [ "${2:-}" = "--model" ]; then
      if [ ! -f "$MODEL_ENV" ]; then
        echo "Create $MODEL_ENV first, holding CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY." >&2
        exit 2
      fi
      export READER_MODE=model READER_TARGET=reader-model READER_IMAGE=airlock-reader-model:local
      STACK_EXTRA_ARGS=(-f "$STACK_ROOT/deploy/compose.model.yaml")
    fi
    prepare
    stack_compose ps --status running 2>/dev/null | grep -q switch || stack_check_ports || exit 2
    stack_pull || exit 2
    stack_compose up -d --build || exit 2
    echo
    echo "Mattermost:  http://localhost:$AIRLOCK_MATTERMOST_PORT  (team: switch, channels: ap-intake, ap-release)"
    echo "Ledger:      http://localhost:$AIRLOCK_LEDGER_PORT"
    echo "Logins (one person plays both, in two browser profiles):"
    logins
    ;;
  logins)
    prepare
    logins
    ;;
  logs)
    prepare
    use_model_files
    stack_compose logs reader
    ;;
  down)
    prepare
    use_model_files
    stack_compose --profile proof down -v --remove-orphans
    rm -f .run/airlock-demo/.env
    ;;
  *)
    echo "Usage: ./demo.sh up [--model] | logins | logs | down" >&2
    exit 2
    ;;
esac
