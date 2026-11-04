#!/usr/bin/env bash
# Prepares a shared Linux host for the Invoice Airlock build: one locked-down OS user whose
# model agents get their own rootless Docker and nothing else on the machine.
#
# Run it yourself, as root, after reading it. No model agent runs this file.
#
#   setup-build-user.sh preflight   Read-only report. Changes nothing.
#   setup-build-user.sh install [--design-skill-src DIR]
#                                   Creates the user and its limits, then runs verify.
#   setup-build-user.sh verify      Checks the limits hold. Only pulls two small test images.
#   setup-build-user.sh smoke       Runs the pinned Switch stack as the user, reports, tears it down.
#   setup-build-user.sh uninstall   Removes everything install added, except the apt packages.
#
# What the user gets: its own home, rootless Docker, outbound internet, loopback ports
# 23000-29999, and the DNS stub. What it does not get: sudo, the docker group, the main
# Docker daemon, other users' homes, any other loopback port, or private network ranges.
#
# Not covered, so check the report verify prints: world-readable files, world-connectable
# Unix sockets, other users' process arguments, and disk use.
set -euo pipefail

BUILD_USER="airlock-build"
OWN_PORTS="23000:29999"
MEM_HIGH="2700M"
MEM_MAX="3G"
SWAP_MAX="1G"
KIT_URL="https://github.com/bitnormie01/build-system"
KIT_COMMIT="230bbc8"
SWITCH_TAG="switch-v0.31.0"
SWITCH_VERSION="0.31.0"

FW_BIN="/usr/local/sbin/airlock-build-firewall"
FW_UNIT="/etc/systemd/system/airlock-build-firewall.service"
AA_PROFILE="/etc/apparmor.d/airlock-rootlesskit"
STATE_DIR="/var/lib/airlock-build-setup"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/$(basename "${BASH_SOURCE[0]}")"
HOME_DIR="/home/$BUILD_USER"
FAILED=0

cd /

say()  { printf '\n== %s\n' "$*"; }
note() { printf '  note  %s\n' "$*"; }
ok()   { printf '  PASS  %s\n' "$*"; }
bad()  { printf '  FAIL  %s\n' "$*"; FAILED=1; }

need_root() { [ "$(id -u)" = 0 ] || { echo "Run this as root." >&2; exit 2; }; }
need_user() { id -u "$BUILD_USER" >/dev/null 2>&1 || { echo "$BUILD_USER does not exist. Run install first." >&2; exit 2; }; }

as_build() {
  local uid
  uid="$(id -u "$BUILD_USER")"
  sudo -u "$BUILD_USER" -H env \
    XDG_RUNTIME_DIR="/run/user/$uid" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" \
    DOCKER_HOST="unix:///run/user/$uid/docker.sock" \
    PATH="$HOME_DIR/.local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
    "$@"
}

snapshot() {
  mkdir -p "$1"
  ss -ltnH | awk '{print $4}' | sort -u > "$1/listeners"
  systemctl list-units --type=service --state=running --no-legend --plain | awk '{print $1}' | sort > "$1/services"
  : > "$1/starts"
  while read -r unit; do
    printf '%s %s\n' "$unit" "$(systemctl show -p ActiveEnterTimestampMonotonic --value "$unit")" >> "$1/starts"
  done < "$1/services"
}

compare_snapshots() {
  say "Existing services, before and after"
  local restarted
  restarted="$(join "$1/starts" "$2/starts" | awk '$2 != $3 {print $1}')"
  if [ -n "$restarted" ]; then
    bad "these services restarted during install: $restarted"
  else
    ok "no running service restarted"
  fi
  local stopped
  stopped="$(comm -23 "$1/services" "$2/services")"
  if [ -n "$stopped" ]; then bad "these services stopped during install: $stopped"; else ok "no running service stopped"; fi
  note "new listeners: $(comm -13 "$1/listeners" "$2/listeners" | tr '\n' ' ')"
  note "listeners gone: $(comm -23 "$1/listeners" "$2/listeners" | tr '\n' ' ')"
}

cmd_preflight() {
  need_root
  say "Host"
  . /etc/os-release
  echo "  $PRETTY_NAME, kernel $(uname -r), $(uname -m)"
  free -h | sed 's/^/  /'
  df -h / | tail -1 | sed 's/^/  /'

  say "Tools install relies on"
  local tool
  for tool in docker iptables ip6tables sudo curl openssl git ssh-keygen rootlesskit dockerd-rootless-setuptool.sh; do
    if command -v "$tool" >/dev/null 2>&1; then ok "$tool"; else bad "$tool is missing"; fi
  done

  say "Packages install would add"
  local pkg
  for pkg in uidmap slirp4netns tmux; do
    if dpkg -s "$pkg" >/dev/null 2>&1; then note "$pkg is already installed"; else note "$pkg would be installed"; fi
  done

  say "AppArmor"
  note "kernel.apparmor_restrict_unprivileged_userns = $(sysctl -n kernel.apparmor_restrict_unprivileged_userns 2>/dev/null || echo unset)"
  if grep -qs rootlesskit /sys/kernel/security/apparmor/profiles; then
    note "a rootlesskit profile is already loaded, so install adds none"
  else
    note "no rootlesskit profile is loaded, so install adds $AA_PROFILE"
  fi

  say "Ports reserved for $BUILD_USER"
  local used
  used="$(ss -ltnH | awk '{print $4}' | sed -E 's/.*:([0-9]+)$/\1/' | sort -un | awk -F: '$1>=23000 && $1<=29999' | tr '\n' ' ')"
  if [ -n "$used" ]; then bad "already in use in 23000-29999: $used"; else ok "23000-29999 are free"; fi

  say "Host firewall and SSH"
  note "ufw: $(ufw status 2>/dev/null | head -1 || echo 'not installed')"
  note "sshd AllowUsers: $(sshd -T 2>/dev/null | awk '/^allowusers/{print $2}' | tr '\n' ' ')"
  note "sshd UsePAM: $(sshd -T 2>/dev/null | awk '/^usepam/{print $2}')"

  say "User"
  if id "$BUILD_USER" >/dev/null 2>&1; then note "$BUILD_USER already exists: $(id "$BUILD_USER")"; else note "$BUILD_USER does not exist yet"; fi

  [ "$FAILED" = 0 ] || exit 1
}

write_firewall() {
  local uid="$1"
  cat > "$FW_BIN" <<EOF
#!/usr/bin/env bash
# Limits what the $BUILD_USER user can reach on this host. Only that user's packets enter the chain.
set -euo pipefail
uid="$uid"
chain="AIRLOCK_BUILD_OUT"
up() {
  for ipt in iptables ip6tables; do
    "\$ipt" -w -N "\$chain" 2>/dev/null || "\$ipt" -w -F "\$chain"
    # Replies on connections someone else opened to this user's own ports.
    "\$ipt" -w -A "\$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  done
  # DNS: the local stub, plus its upstream servers in case they sit on a private range.
  for dst in 127.0.0.53 127.0.0.54; do
    iptables -w -A "\$chain" -o lo -d "\$dst" -p udp --dport 53 -j ACCEPT
    iptables -w -A "\$chain" -o lo -d "\$dst" -p tcp --dport 53 -j ACCEPT
  done
  for ns in \$(awk '/^nameserver/{print \$2}' /run/systemd/resolve/resolv.conf 2>/dev/null); do
    case "\$ns" in *:*) ipt=ip6tables ;; *) ipt=iptables ;; esac
    "\$ipt" -w -A "\$chain" -d "\$ns" -p udp --dport 53 -j ACCEPT
    "\$ipt" -w -A "\$chain" -d "\$ns" -p tcp --dport 53 -j ACCEPT
  done
  # Its own port range on loopback. Everything else that loops back on this host is refused,
  # which includes this host's public address and every other service's port.
  iptables  -w -A "\$chain" -o lo -d 127.0.0.0/8 -p tcp --dport $OWN_PORTS -j ACCEPT
  ip6tables -w -A "\$chain" -o lo -d ::1 -p tcp --dport $OWN_PORTS -j ACCEPT
  iptables  -w -A "\$chain" -o lo -j REJECT
  ip6tables -w -A "\$chain" -o lo -j REJECT
  # Private ranges: the main Docker daemon's container networks, the provider's LAN and metadata.
  for net in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 169.254.0.0/16 100.64.0.0/10; do
    iptables -w -A "\$chain" -d "\$net" -j REJECT
  done
  for net in fc00::/7 fe80::/10; do
    ip6tables -w -A "\$chain" -d "\$net" -j REJECT
  done
  for ipt in iptables ip6tables; do
    "\$ipt" -w -C OUTPUT -m owner --uid-owner "\$uid" -j "\$chain" 2>/dev/null \\
      || "\$ipt" -w -I OUTPUT 1 -m owner --uid-owner "\$uid" -j "\$chain"
  done
}
down() {
  for ipt in iptables ip6tables; do
    "\$ipt" -w -D OUTPUT -m owner --uid-owner "\$uid" -j "\$chain" 2>/dev/null || true
    "\$ipt" -w -F "\$chain" 2>/dev/null || true
    "\$ipt" -w -X "\$chain" 2>/dev/null || true
  done
}
"\$1"
EOF
  chmod 750 "$FW_BIN"
  cat > "$FW_UNIT" <<EOF
[Unit]
Description=Limit what the $BUILD_USER user can reach on this host
After=network-online.target systemd-resolved.service
Wants=network-online.target
Before=user@$uid.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=$FW_BIN up
ExecStop=$FW_BIN down

[Install]
WantedBy=multi-user.target
EOF
}

cmd_install() {
  need_root
  local design_src=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --design-skill-src) design_src="$2"; shift 2 ;;
      *) echo "Unknown option: $1" >&2; exit 2 ;;
    esac
  done

  cmd_preflight
  local run_dir="$STATE_DIR/$(date -u +%Y%m%dT%H%M%SZ)"
  snapshot "$run_dir/before"

  say "Packages"
  apt-get update -qq || note "apt-get update reported errors, going on"
  DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=l NEEDRESTART_SUSPEND=1 \
    apt-get install -y -qq --no-install-recommends uidmap slirp4netns tmux

  say "User"
  if ! id "$BUILD_USER" >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash --user-group --comment "Invoice Airlock build agents" "$BUILD_USER"
  fi
  # No password can ever match this, but SSH keys still work.
  usermod -p '*' "$BUILD_USER"
  chmod 700 "$HOME_DIR"
  local uid
  uid="$(id -u "$BUILD_USER")"
  if ! grep -q "^$BUILD_USER:" /etc/subuid || ! grep -q "^$BUILD_USER:" /etc/subgid; then
    local start
    start="$(cat /etc/subuid /etc/subgid | awk -F: 'BEGIN{m=100000}{e=$2+$3; if(e>m)m=e}END{print m}')"
    usermod --add-subuids "$start-$((start + 65535))" --add-subgids "$start-$((start + 65535))" "$BUILD_USER"
  fi
  note "uid $uid, subuid $(grep "^$BUILD_USER:" /etc/subuid)"

  say "Memory, CPU and IO limits on the user's slice"
  loginctl enable-linger "$BUILD_USER"
  local waited=0
  until [ -S "/run/user/$uid/bus" ]; do
    sleep 1; waited=$((waited + 1))
    [ "$waited" -lt 30 ] || { bad "the user's session bus did not appear"; exit 1; }
  done
  systemctl set-property "user-$uid.slice" \
    MemoryHigh="$MEM_HIGH" MemoryMax="$MEM_MAX" MemorySwapMax="$SWAP_MAX" CPUWeight=50 IOWeight=50 TasksMax=4096

  say "Firewall rules for this user only"
  write_firewall "$uid"
  systemctl daemon-reload
  systemctl enable --now airlock-build-firewall.service

  say "AppArmor profile for rootlesskit"
  if grep -qs rootlesskit /sys/kernel/security/apparmor/profiles; then
    note "already loaded, nothing added"
  else
    cat > "$AA_PROFILE" <<'EOF'
abi <abi/4.0>,
include <tunables/global>

/usr/bin/rootlesskit flags=(unconfined) {
  userns,
  include if exists <local/airlock-rootlesskit>
}
EOF
    apparmor_parser -r "$AA_PROFILE"
    ok "added $AA_PROFILE"
  fi

  say "Shell environment"
  as_build tee "$HOME_DIR/.airlock-env" >/dev/null <<'EOF'
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
export DOCKER_HOST="unix://$XDG_RUNTIME_DIR/docker.sock"
export PATH="$HOME/.local/bin:$PATH"
EOF
  local rc
  for rc in .profile .bashrc; do
    as_build touch "$HOME_DIR/$rc"
    if ! grep -q '.airlock-env' "$HOME_DIR/$rc"; then
      # First line of the file, because Ubuntu's .bashrc returns early for non-interactive shells.
      as_build bash -c '{ echo "[ -f \"\$HOME/.airlock-env\" ] && . \"\$HOME/.airlock-env\""; cat "$1"; } > "$1.tmp" && mv "$1.tmp" "$1"' _ "$HOME_DIR/$rc"
    fi
  done

  say "Rootless Docker"
  as_build mkdir -p "$HOME_DIR/.config/docker"
  as_build tee "$HOME_DIR/.config/docker/daemon.json" >/dev/null <<'EOF'
{ "log-driver": "local", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
  as_build dockerd-rootless-setuptool.sh install

  # Everything written inside the user's home from here on is written as the user. Agents will
  # control that directory, so root must not write there if this is ever re-run.
  say "SSH login and a deploy key for the project repo"
  as_build install -d -m 700 "$HOME_DIR/.ssh"
  if [ -f /root/.ssh/authorized_keys ]; then
    as_build tee "$HOME_DIR/.ssh/authorized_keys" >/dev/null < /root/.ssh/authorized_keys
    as_build chmod 600 "$HOME_DIR/.ssh/authorized_keys"
    note "copied root's authorized_keys, so the same keys can log in as $BUILD_USER"
  fi
  if [ ! -f "$HOME_DIR/.ssh/id_airlock_repo" ]; then
    as_build ssh-keygen -q -t ed25519 -N '' -C "$BUILD_USER@invoice-airlock" -f "$HOME_DIR/.ssh/id_airlock_repo"
  fi
  as_build tee "$HOME_DIR/.ssh/config" >/dev/null <<EOF
Host github-airlock
  HostName github.com
  User git
  IdentityFile $HOME_DIR/.ssh/id_airlock_repo
  IdentitiesOnly yes
EOF
  as_build bash -c 'ssh-keyscan -t ed25519 github.com 2>/dev/null > ~/.ssh/known_hosts'
  local github_fp
  github_fp="$(as_build ssh-keygen -lf "$HOME_DIR/.ssh/known_hosts" | awk '{print $2}')"
  if [ "$github_fp" = "SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU" ]; then
    ok "github.com host key matches its published fingerprint"
  else
    bad "github.com host key fingerprint is $github_fp, which is not the published one"
  fi
  local git_name git_email
  git_name="$(git -C "$SCRIPT_DIR" config user.name || true)"
  git_email="$(git -C "$SCRIPT_DIR" config user.email || true)"
  [ -z "$git_name" ]  || as_build git config --global user.name "$git_name"
  [ -z "$git_email" ] || as_build git config --global user.email "$git_email"

  say "Build kit and design skill"
  if [ ! -d "$HOME_DIR/build-system/.git" ]; then
    as_build git clone --quiet "$KIT_URL" "$HOME_DIR/build-system"
  fi
  as_build git -C "$HOME_DIR/build-system" checkout --quiet "$KIT_COMMIT"
  ok "kit at $KIT_COMMIT in $HOME_DIR/build-system"
  if [ -n "$design_src" ]; then
    as_build rm -rf "$HOME_DIR/skills/design-taste-frontend"
    as_build mkdir -p "$HOME_DIR/skills/design-taste-frontend"
    tar -C "$design_src" -cf - . | as_build tar -C "$HOME_DIR/skills/design-taste-frontend" --no-same-owner -xf -
    ok "design skill copied, SKILL.md sha256 $(as_build sha256sum "$HOME_DIR/skills/design-taste-frontend/SKILL.md" | cut -d' ' -f1)"
  else
    note "no --design-skill-src given, so the design skill was not copied"
  fi

  say "Node and Claude Code for the user"
  if as_build node --version >/dev/null 2>&1; then ok "node $(as_build node --version)"; else bad "node is not runnable by $BUILD_USER"; fi
  if ! as_build claude --version >/dev/null 2>&1; then
    note "claude is not runnable by $BUILD_USER, so running the official installer as that user"
    as_build bash -c 'curl -fsSL https://claude.ai/install.sh | bash'
  fi
  if as_build claude --version >/dev/null 2>&1; then ok "claude $(as_build claude --version)"; else bad "claude is still not runnable by $BUILD_USER"; fi

  snapshot "$run_dir/after"
  compare_snapshots "$run_dir/before" "$run_dir/after"

  cmd_verify_inner

  say "Your turn"
  cat <<EOF
  1. Add this public key to the project repo with write access (Settings, Deploy keys):
       $(cat "$HOME_DIR/.ssh/id_airlock_repo.pub")
  2. Run the smoke test:  bash $SCRIPT_DIR/setup-build-user.sh smoke
  3. Log in as the user and sign in to Claude Code yourself:
       ssh $BUILD_USER@<this host>
       claude auth login
  4. Clone the repo there:  git clone git@github-airlock:Dotman-Bei/invoice-airlock.git ~/invoice-airlock
  Run the orchestrator inside tmux in that session, so it survives your laptop closing.
EOF
  [ "$FAILED" = 0 ] || { echo; echo "Finished with failures. See the FAIL lines above."; exit 1; }
}

cmd_verify_inner() {
  local uid
  uid="$(id -u "$BUILD_USER")"

  say "Identity"
  local groups
  groups="$(id -nG "$BUILD_USER")"
  case " $groups " in
    *" sudo "*|*" docker "*|*" adm "*|*" lxd "*) bad "$BUILD_USER is in a privileged group: $groups" ;;
    *) ok "groups are: $groups" ;;
  esac
  if as_build sudo -n true 2>/dev/null; then bad "$BUILD_USER can use sudo"; else ok "no sudo"; fi
  if as_build test -w /var/run/docker.sock; then bad "$BUILD_USER can write the main Docker socket"; else ok "no access to the main Docker socket"; fi
  local dir
  for dir in /root /home/*; do
    [ "$dir" = "$HOME_DIR" ] && continue
    if as_build ls "$dir" >/dev/null 2>&1; then bad "$BUILD_USER can list $dir"; else ok "cannot list $dir"; fi
  done

  say "Rootless Docker"
  if as_build docker info --format '{{.SecurityOptions}}' 2>/dev/null | grep -q rootless; then ok "the user's daemon is rootless"; else bad "the user's daemon is not rootless or not running"; fi
  if as_build docker run --rm hello-world >/dev/null 2>&1; then ok "a container runs"; else bad "hello-world did not run"; fi
  # The public address is the control: if it fails too, nc proved nothing about the host.
  if ! as_build docker run --rm busybox:1.36 nc -z -w 5 1.1.1.1 443 >/dev/null 2>&1; then
    bad "a container could not reach the internet, so the host loopback check is inconclusive"
  elif as_build docker run --rm busybox:1.36 nc -z -w 2 10.0.2.2 22 >/dev/null 2>&1; then
    bad "a container reached the host's loopback"
  else
    ok "containers reach the internet but not the host's loopback"
  fi

  say "Network, from the user's shell"
  local port reached=""
  for port in $(ss -ltnH | awk '{print $4}' | sed -E 's/.*:([0-9]+)$/\1/' | sort -un); do
    case "$port" in 53) continue ;; esac
    if [ "$port" -ge 23000 ] && [ "$port" -le 29999 ]; then continue; fi
    if as_build timeout 3 bash -c "exec 3<>/dev/tcp/127.0.0.1/$port" 2>/dev/null; then reached="$reached $port"; fi
    if as_build timeout 3 bash -c "exec 3<>/dev/tcp/::1/$port" 2>/dev/null; then reached="$reached [::1]:$port"; fi
  done
  if [ -n "$reached" ]; then bad "reached other services on loopback:$reached"; else ok "every other loopback listener is refused"; fi
  local public_ip
  public_ip="$(ip -4 route get 1.1.1.1 2>/dev/null | sed -nE 's/.* src ([0-9.]+).*/\1/p')"
  if [ -n "$public_ip" ] && as_build timeout 3 bash -c "exec 3<>/dev/tcp/$public_ip/22" 2>/dev/null; then
    bad "reached this host's own public address"
  else
    ok "this host's own public address is refused"
  fi
  if as_build timeout 3 bash -c "exec 3<>/dev/tcp/169.254.169.254/80" 2>/dev/null; then bad "reached the metadata address"; else ok "the metadata address is refused"; fi
  if as_build getent hosts github.com >/dev/null; then ok "DNS works"; else bad "DNS does not work"; fi
  local url
  for url in https://github.com https://ghcr.io/v2/ https://registry-1.docker.io/v2/ https://registry.npmjs.org/ https://raw.githubusercontent.com/ https://deb.debian.org/ https://api.anthropic.com/; do
    if as_build curl -sS -o /dev/null --max-time 15 "$url"; then ok "outbound to $url"; else bad "no outbound to $url"; fi
  done
  as_build timeout 4 python3 -m http.server 23999 --bind 127.0.0.1 --directory "$HOME_DIR/.config" >/dev/null 2>&1 &
  sleep 1
  if as_build curl -fsS -o /dev/null --max-time 2 http://127.0.0.1:23999/; then ok "its own port range works"; else bad "cannot reach its own port range"; fi
  wait || true

  say "Limits"
  systemctl show "user-$uid.slice" -p MemoryHigh -p MemoryMax -p MemorySwapMax -p CPUWeight -p TasksMax | sed 's/^/  /'

  say "Not covered by these limits. Review this list"
  note "Unix sockets this user can actually connect to:"
  find /run /tmp -xdev -type s -perm -o=w 2>/dev/null | sort -u \
    | while read -r f; do as_build test -w "$f" && printf '        %s\n' "$f"; done || true
  note "secret-looking files this user can actually read (paths only):"
  find /etc /opt /srv /var/www /var/lib /home /tmp -xdev -type f \
    \( -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' -o -name 'id_rsa' -o -name 'id_ed25519' \
       -o -iname '*secret*' -o -iname '*credential*' -o -iname '*token*' \) \
    ! -path '/etc/ssl/*' ! -path '*/node_modules/*' ! -path '/var/lib/docker/*' ! -path '/var/lib/containerd/*' \
    ! -path '/var/lib/dpkg/*' ! -path "$HOME_DIR/*" -perm -o=r 2>/dev/null | head -400 \
    | while read -r f; do as_build test -r "$f" && printf '        %s\n' "$f"; done || true
}

cmd_verify() {
  need_root
  need_user
  cmd_verify_inner
  [ "$FAILED" = 0 ] || exit 1
}

cmd_smoke() {
  need_root
  need_user
  local available_mib
  available_mib="$(free -m | awk '/^Mem:/{print $7}')"
  if [ "$available_mib" -lt 1500 ]; then
    echo "Only ${available_mib} MiB of memory is available. The stack needs about 600 MiB and this host has other services, so not starting." >&2
    exit 1
  fi
  say "Starting the pinned Switch stack as $BUILD_USER. The first run pulls its images, so give it a few minutes"
  as_build env SWITCH_TAG="$SWITCH_TAG" SWITCH_VERSION="$SWITCH_VERSION" bash -s <<'EOF'
set -euo pipefail
dir="$HOME/airlock-smoke"
rm -rf "$dir"; mkdir -p "$dir"; cd "$dir"
umask 077
rnd() { openssl rand -hex "$1"; }
curl -fsSL -o compose.yml "https://raw.githubusercontent.com/sandbox-quantum/switch/$SWITCH_TAG/deploy/local/standalone-docker-compose.yml"
cat > .env <<ENV
SWITCH_VERSION=$SWITCH_VERSION
API_HOST_PORT=28000
GATEWAY_HOST_PORT=23000
MATTERMOST_HOST_PORT=28065
POSTGRES_HOST_PORT=25432
DB_OWNER_USER=postgres
DB_OWNER_PASSWORD=$(rnd 24)
DB_USER=switch_app
DB_PASSWORD=$(rnd 24)
DB_NAME=switch
AGENT_REGISTRATION_TOKEN=$(rnd 24)
SECRET_KEYS=k1:$(rnd 32)
GATEWAY_ADMIN_EMAIL=admin@switch.local
GATEWAY_ADMIN_PASSWORD=$(rnd 16)
FRONTEND_BASE_URL=http://localhost:23000
MATTERMOST_ADMIN_USER=admin
MATTERMOST_ADMIN_PASSWORD=Mm-$(rnd 12)!
MATTERMOST_TEAM_NAME=switch
MATTERMOST_USER=user
MATTERMOST_USER_PASSWORD=Mm-$(rnd 12)!
TELEMETRY_ENABLED=false
THIRD_PARTY_AVATARS_ENABLED=false
ENV
cat > override.yml <<'YML'
services:
  mattermost:
    environment:
      MM_SERVICESETTINGS_COLLAPSEDTHREADS: disabled
YML
compose() { docker compose -p airlock-smoke --profile collab --profile gateway --env-file .env -f compose.yml -f override.yml "$@"; }
trap 'compose down -v --remove-orphans >/dev/null 2>&1 || true; cd /; rm -rf "$dir"' EXIT
compose up -d
wait_for() {
  local label="$1" url="$2" tries=0
  until curl -fsS -o /dev/null --max-time 3 "$url"; do
    tries=$((tries + 1))
    if [ "$tries" -ge 120 ]; then
      echo "  FAIL  $label did not answer at $url within 6 minutes"
      compose ps -a
      compose logs --tail=30
      exit 1
    fi
    sleep 3
  done
  echo "  PASS  $label answers at $url"
}
wait_for "Switch API" http://127.0.0.1:28000/health
wait_for "Mattermost" http://127.0.0.1:28065/api/v4/system/ping
wait_for "Gateway" http://127.0.0.1:23000/
sleep 20
compose ps -a
echo "  CollapsedThreads as Mattermost reports it: $(curl -fsS 'http://127.0.0.1:28065/api/v4/config/client?format=old' | grep -o '"CollapsedThreads":"[^"]*"' || echo 'not reported')"
echo "  Container memory:"
docker stats --no-stream --format '    {{.Name}} {{.MemUsage}}'
EOF
  say "Host memory after the test"
  free -h | sed 's/^/  /'
  ok "smoke test finished, stack and volumes removed. Images stay cached for the build"
}

cmd_uninstall() {
  need_root
  printf 'This deletes the %s user, its home and its Docker data. Type the user name to go on: ' "$BUILD_USER"
  local answer
  read -r answer
  [ "$answer" = "$BUILD_USER" ] || { echo "Nothing changed."; exit 1; }
  if id "$BUILD_USER" >/dev/null 2>&1; then
    local uid
    uid="$(id -u "$BUILD_USER")"
    as_build dockerd-rootless-setuptool.sh uninstall 2>/dev/null || true
    loginctl disable-linger "$BUILD_USER" || true
    loginctl terminate-user "$BUILD_USER" 2>/dev/null || true
    sleep 2
    pkill -u "$BUILD_USER" 2>/dev/null || true
    sleep 1
    userdel -r "$BUILD_USER" 2>/dev/null || true
    rm -rf "/etc/systemd/system.control/user-$uid.slice.d" "$HOME_DIR"
  fi
  systemctl disable --now airlock-build-firewall.service 2>/dev/null || true
  rm -f "$FW_UNIT" "$FW_BIN"
  if [ -f "$AA_PROFILE" ]; then
    apparmor_parser -R "$AA_PROFILE" 2>/dev/null || true
    rm -f "$AA_PROFILE"
  fi
  systemctl daemon-reload
  echo "Removed. The apt packages uidmap, slirp4netns and tmux stay installed."
}

case "${1:-}" in
  preflight) shift; cmd_preflight "$@" ;;
  install)   shift; cmd_install "$@" ;;
  verify)    shift; cmd_verify "$@" ;;
  smoke)     shift; cmd_smoke "$@" ;;
  uninstall) shift; cmd_uninstall "$@" ;;
  *) sed -n '2,12p' "$SCRIPT_PATH" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
