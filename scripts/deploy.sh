#!/usr/bin/env bash
#
# Deploys a git branch to the Plesk host (Strato) using a releases/shared layout:
#
#   $DEPLOY_BASE/ark-shared/.env        secrets + PORT/HOSTNAME/DATABASE_URL (never in git)
#   $DEPLOY_BASE/ark-shared/prod.db     SQLite database (absolute DATABASE_URL points here)
#   $DEPLOY_BASE/ark-shared/*.sh        start.sh / watchdog.sh / restart.sh / pregenerate.sh
#   $DEPLOY_BASE/ark-releases/ark-<ts>  one directory per release (clone + node_modules + .next)
#   $DEPLOY_BASE/ark-current            symlink to the active release, run by watchdog.sh (cron)
#
# Apache proxies the domain to 127.0.0.1:$PORT; cron restarts the app if it is not listening.
#
# Configuration comes from environment variables or from .codex-deploy/deploy.env (gitignored):
#   DEPLOY_HOST        e.g. 203.0.113.10
#   DEPLOY_USER        Plesk system user of the subscription
#   DEPLOY_KEY         path to the private SSH key authorised for DEPLOY_USER
#   DEPLOY_BASE        subscription home, e.g. /var/www/vhosts/example.com
#   DEPLOY_NODE_BIN    Plesk node binary dir, e.g. /opt/plesk/node/24/bin
#   DEPLOY_REPO        git clone URL of this repository
#   DEPLOY_URL         public URL used for the health check (optional)
#   DEPLOY_KNOWN_HOSTS known_hosts file to use (optional, defaults to ~/.ssh/known_hosts)
#
# Usage: scripts/deploy.sh [branch]   (default: main)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$REPO_DIR/.codex-deploy/deploy.env" ]]; then
    # shellcheck disable=SC1091
    source "$REPO_DIR/.codex-deploy/deploy.env"
fi

BRANCH="${1:-main}"
: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${DEPLOY_KEY:?DEPLOY_KEY is required}"
: "${DEPLOY_BASE:?DEPLOY_BASE is required}"
: "${DEPLOY_NODE_BIN:?DEPLOY_NODE_BIN is required}"
: "${DEPLOY_REPO:?DEPLOY_REPO is required}"
DEPLOY_URL="${DEPLOY_URL:-}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"

SSH_OPTS=(-i "$DEPLOY_KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20)
if [[ -n "${DEPLOY_KNOWN_HOSTS:-}" ]]; then
    SSH_OPTS+=(-o "UserKnownHostsFile=$DEPLOY_KNOWN_HOSTS" -o StrictHostKeyChecking=accept-new)
fi

echo "==> Deploying branch '$BRANCH' to $DEPLOY_USER@$DEPLOY_HOST ($DEPLOY_BASE)"

ssh "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" \
    "BRANCH='$BRANCH' BASE='$DEPLOY_BASE' NODE_BIN='$DEPLOY_NODE_BIN' REPO='$DEPLOY_REPO' KEEP_RELEASES='$KEEP_RELEASES' bash -s" <<'REMOTE'
set -euo pipefail

SHARED="$BASE/ark-shared"
STAMP=$(date +%Y%m%d%H%M%S)
RELEASE="$BASE/ark-releases/ark-$STAMP"
BACKUP="$SHARED/backups/$STAMP"

[[ -f "$SHARED/.env" ]] || { echo "Missing $SHARED/.env (secrets, PORT, DATABASE_URL)" >&2; exit 1; }
[[ -x "$SHARED/restart.sh" ]] || { echo "Missing $SHARED/restart.sh (see CLAUDE.md, Deployment)" >&2; exit 1; }

mkdir -p "$BACKUP" "$BASE/ark-releases"

echo "--> Backing up .env and database to $BACKUP"
cp -p "$SHARED/.env" "$BACKUP/.env"
if [[ -f "$SHARED/prod.db" ]]; then
    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 "$SHARED/prod.db" ".backup '$BACKUP/prod.db'"
    else
        cp -p "$SHARED/prod.db" "$BACKUP/prod.db"
    fi
    chmod 600 "$BACKUP/prod.db"
fi
chmod 600 "$BACKUP/.env"

echo "--> Cloning $BRANCH"
git clone --branch "$BRANCH" --depth 1 "$REPO" "$RELEASE"
COMMIT=$(git -C "$RELEASE" rev-parse --short HEAD)
ln -sfn "$SHARED/.env" "$RELEASE/.env"

cd "$RELEASE"
export PATH="$NODE_BIN:$PATH"
echo "--> node $(node -v), npm $(npm -v), commit $COMMIT"
npm ci --no-audit --no-fund
npm run db:migrate
npm run build

echo "--> Activating release and restarting the app"
ln -sfn "$RELEASE" "$BASE/ark-current"
"$SHARED/restart.sh"

PORT=$(sed -n 's/^PORT=//p' "$SHARED/.env" | tr -d '"')
PORT=${PORT:-3001}
for attempt in $(seq 1 15); do
    if ss -ltn 2>/dev/null | grep -q ":$PORT "; then
        echo "--> App listening on port $PORT"
        break
    fi
    sleep 2
    if [[ "$attempt" == 15 ]]; then
        echo "App did not start, see $SHARED/logs/app.log" >&2
        tail -n 30 "$SHARED/logs/app.log" >&2 || true
        exit 1
    fi
done

echo "--> Pruning old releases (keeping $KEEP_RELEASES)"
ls -1dt "$BASE"/ark-releases/ark-* 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf

printf 'deployed_commit=%s\nrelease=%s\nbackup=%s\n' "$COMMIT" "$RELEASE" "$BACKUP"
REMOTE

if [[ -n "$DEPLOY_URL" ]]; then
    echo "==> Health check $DEPLOY_URL"
    for attempt in 1 2 3 4 5 6; do
        status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$DEPLOY_URL" || true)
        if [[ "$status" == "200" ]]; then
            echo "    OK (HTTP 200)"
            exit 0
        fi
        echo "    attempt $attempt: HTTP $status, retrying..."
        sleep 10
    done
    echo "Health check failed" >&2
    exit 1
fi
