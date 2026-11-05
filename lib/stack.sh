# Shared by prove.sh, demo.sh and scripts/stack-check.sh. Source it after setting the AIRLOCK_* ports.
SWITCH_TAG="switch-v0.31.0"
SWITCH_VERSION="0.31.0"
UPSTREAM_SHA256="cba238878078cf3d77fd9e136ef432f1ce5fd1bfe597acd172b9faa6720f0121"
UPSTREAM_URL="https://raw.githubusercontent.com/sandbox-quantum/switch/$SWITCH_TAG/deploy/local/standalone-docker-compose.yml"
STACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_RUN_DIR="${STACK_RUN_DIR:-$STACK_ROOT/.run}"
STACK_UPSTREAM="$STACK_RUN_DIR/upstream-compose.yml"

stack_random_hex() {
  head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
}

stack_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

# Downloads Switch's Compose file rather than committing it, and refuses any other bytes.
stack_fetch_upstream() {
  mkdir -p "$STACK_RUN_DIR"
  if [ -f "$STACK_UPSTREAM" ] && [ "$(stack_sha256 "$STACK_UPSTREAM")" = "$UPSTREAM_SHA256" ]; then
    return 0
  fi
  curl -fsSL -o "$STACK_UPSTREAM" "$UPSTREAM_URL" || { echo "Could not download $UPSTREAM_URL" >&2; return 1; }
  if [ "$(stack_sha256 "$STACK_UPSTREAM")" != "$UPSTREAM_SHA256" ]; then
    echo "The downloaded Compose file does not match the pinned hash." >&2
    rm -f "$STACK_UPSTREAM"
    return 1
  fi
}

# Throwaway secrets, one set per project, git-ignored and mode 600.
stack_write_env() {
  local project="$1" dir="$STACK_RUN_DIR/$1"
  mkdir -p "$dir"
  STACK_ENV="$dir/.env"
  STACK_PROJECT="$project"
  [ -f "$STACK_ENV" ] && return 0
  ( umask 077; cat > "$STACK_ENV" <<ENV
SWITCH_VERSION=$SWITCH_VERSION
API_HOST_PORT=$AIRLOCK_API_PORT
GATEWAY_HOST_PORT=$AIRLOCK_GATEWAY_PORT
MATTERMOST_HOST_PORT=$AIRLOCK_MATTERMOST_PORT
POSTGRES_HOST_PORT=$AIRLOCK_POSTGRES_PORT
AIRLOCK_LEDGER_PORT=$AIRLOCK_LEDGER_PORT
DB_OWNER_USER=postgres
DB_OWNER_PASSWORD=$(stack_random_hex 24)
DB_USER=switch_app
DB_PASSWORD=$(stack_random_hex 24)
DB_NAME=switch
AGENT_REGISTRATION_TOKEN=$(stack_random_hex 24)
SECRET_KEYS=k1:$(stack_random_hex 32)
GATEWAY_ADMIN_EMAIL=admin@switch.local
GATEWAY_ADMIN_PASSWORD=$(stack_random_hex 16)
FRONTEND_BASE_URL=http://localhost:$AIRLOCK_GATEWAY_PORT
MATTERMOST_ADMIN_USER=admin
MATTERMOST_ADMIN_PASSWORD=Mm-$(stack_random_hex 12)!
MATTERMOST_TEAM_NAME=switch
MATTERMOST_USER=user
MATTERMOST_USER_PASSWORD=Mm-$(stack_random_hex 12)!
TELEMETRY_ENABLED=false
THIRD_PARTY_AVATARS_ENABLED=false
BANK_TOKEN=$(stack_random_hex 24)
ENV
  )
}

stack_compose() {
  docker compose -p "$STACK_PROJECT" --project-directory "$STACK_ROOT" --env-file "$STACK_ENV" \
    --profile collab --profile gateway \
    -f "$STACK_UPSTREAM" -f "$STACK_ROOT/deploy/compose.airlock.yaml" ${STACK_EXTRA_ARGS[@]+"${STACK_EXTRA_ARGS[@]}"} "$@"
}

# Downloads can drop on a flaky link, and finished layers stay cached, so trying again gets there.
stack_pull() {
  local attempt
  for attempt in 1 2 3 4 5; do
    if COMPOSE_PARALLEL_LIMIT=2 stack_compose pull --ignore-buildable --quiet; then
      return 0
    fi
    echo "Pulling the images failed on attempt $attempt of 5." >&2
    sleep "$((attempt * ${STACK_PULL_DELAY_S:-5}))"
  done
  echo "Could not pull the images. Check the network and run this again." >&2
  return 1
}

# Says which variable to set rather than letting Compose fail on a busy port.
stack_check_ports() {
  local pair name port
  for pair in "AIRLOCK_API_PORT=$AIRLOCK_API_PORT" "AIRLOCK_GATEWAY_PORT=$AIRLOCK_GATEWAY_PORT" \
              "AIRLOCK_MATTERMOST_PORT=$AIRLOCK_MATTERMOST_PORT" "AIRLOCK_POSTGRES_PORT=$AIRLOCK_POSTGRES_PORT" \
              "AIRLOCK_LEDGER_PORT=$AIRLOCK_LEDGER_PORT"; do
    name="${pair%%=*}"
    port="${pair##*=}"
    if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
      echo "Port $port is already in use. Set $name to a free port and run this again." >&2
      return 1
    fi
  done
}

stack_require_docker() {
  if ! docker compose version >/dev/null 2>&1; then
    echo "This needs Docker with the Compose plugin." >&2
    return 1
  fi
}
