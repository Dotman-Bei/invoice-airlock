#!/usr/bin/env bash
# Replays every attack on a fresh stack and checks the outcome from the room transcripts and the ledger.
# Needs Docker, bash and curl. No model key. Exit 0: contained. Exit 1: an attack succeeded or a control
# failed. Exit 2: no verdict, never a pass.
set -uo pipefail
cd "$(dirname "$0")"

SINGLE_OWNER=0
KEEP=0
for arg in "$@"; do
  case "$arg" in
    --single-owner) SINGLE_OWNER=1 ;;
    --keep) KEEP=1 ;;
    *) echo "Usage: ./prove.sh [--single-owner] [--keep]" >&2; exit 2 ;;
  esac
done

export AIRLOCK_API_PORT="${AIRLOCK_API_PORT:-28000}"
export AIRLOCK_GATEWAY_PORT="${AIRLOCK_GATEWAY_PORT:-23000}"
export AIRLOCK_MATTERMOST_PORT="${AIRLOCK_MATTERMOST_PORT:-28065}"
export AIRLOCK_POSTGRES_PORT="${AIRLOCK_POSTGRES_PORT:-25432}"
export AIRLOCK_LEDGER_PORT="${AIRLOCK_LEDGER_PORT:-28090}"
export AIRLOCK_OWNERS=two
[ "$SINGLE_OWNER" = 1 ] && export AIRLOCK_OWNERS=single
export EJECT_GRACE_MS=10000 HIJACK_SET=full HIJACK_PACE_MS=0 READER_MODE=fixture

. lib/stack.sh
. lib/verdict.sh
stack_require_docker || exit 2
stack_fetch_upstream || exit 2
rm -rf .run/airlock-proof
stack_write_env airlock-proof
stack_compose down -v --remove-orphans >/dev/null 2>&1
stack_check_ports || exit 2

teardown() {
  if [ "$KEEP" = 1 ]; then
    echo "Stack left running because of --keep. Remove it with: docker compose -p airlock-proof down -v"
  else
    stack_compose down -v --remove-orphans >/dev/null 2>&1
  fi
}

trap 'teardown; exit 2' INT TERM

echo "Starting a fresh stack. The first run pulls Switch's images, so give it a few minutes."
stack_pull || exit 2
if ! stack_compose up -d --build; then
  stack_compose ps -a
  stack_compose logs --tail=40
  teardown
  exit 2
fi

mkdir -p proof-output
rm -f proof-output/run.log proof-output/report.md proof-output/report.json
stack_compose --profile proof run --rm -T proof-runner 2>&1 | tee proof-output/run.log
runner_code=${PIPESTATUS[0]}

sed -n '/^AIRLOCK-REPORT-MD-BEGIN$/,/^AIRLOCK-REPORT-MD-END$/p' proof-output/run.log | sed '1d;$d' > proof-output/report.md
sed -n 's/^AIRLOCK-REPORT-JSON //p' proof-output/run.log > proof-output/report.json

# A crash must never read as a verdict, so only a complete report with the same code counts.
code="$(verdict_code "$runner_code" proof-output/report.md proof-output/report.json)"
if [ "$code" = 2 ]; then
  echo "No complete report, so there is no verdict. The runner exited $runner_code." >&2
  stack_compose ps -a
  stack_compose logs --tail=40
fi

if [ "$SINGLE_OWNER" = 1 ] && [ "$code" = 1 ] && verdict_names_breach attack-3 proof-output/report.md; then
  echo
  echo "This control run gave reader and treasury the same owner, so attack 3 succeeded and the run failed."
  echo "That failure is the expected result. It shows the owner boundary is what holds."
fi
teardown
exit "$code"
