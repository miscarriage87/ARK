#!/usr/bin/env bash
#
# Deploys a git branch to the Plesk host (Strato) with backup, migration, build and Passenger restart.
#
# Configuration comes from environment variables or from .codex-deploy/deploy.env (gitignored):
#   DEPLOY_HOST        e.g. 203.0.113.10
#   DEPLOY_USER        Plesk system user of the subscription
#   DEPLOY_KEY         path to the private SSH key authorised for DEPLOY_USER
#   DEPLOY_BASE        subscription root, e.g. /var/www/vhosts/example.com
#   DEPLOY_NODE_BIN    Plesk node binary dir, e.g. /opt/plesk/node/22/bin
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

STAMP=$(date +%Y%m%d%H%M%S)
RELEASE="$BASE/releases/ark-$STAMP"
BACKUP="$BASE/deploy-backups/$STAMP"

cd "$BASE"
mkdir -p "$BASE/releases" "$BACKUP"

echo "--> Backing up .env and database to $BACKUP"
cp -p httpdocs/.env "$BACKUP/.env"
if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 httpdocs/prisma/dev.db ".backup '$BACKUP/dev.db'"
else
    cp -p httpdocs/prisma/dev.db "$BACKUP/dev.db"
fi
chmod 600 "$BACKUP/dev.db" "$BACKUP/.env"

echo "--> Cloning $BRANCH"
git clone --branch "$BRANCH" --depth 1 "$REPO" "$RELEASE"
COMMIT=$(git -C "$RELEASE" rev-parse --short HEAD)

echo "--> Syncing release $COMMIT into httpdocs (keeping .env, node_modules, .next, tmp, database)"
rsync -a --delete \
    --exclude='.env' \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='tmp' \
    --exclude='prisma/dev.db' \
    --exclude='prisma/dev.db-journal' \
    --exclude='prisma/dev.db-wal' \
    "$RELEASE/" "$BASE/httpdocs/"

cd "$BASE/httpdocs"
export PATH="$NODE_BIN:$PATH"
echo "--> node $(node -v), npm $(npm -v)"
npm ci --no-audit --no-fund
npm run db:migrate
npm run build

mkdir -p tmp
touch tmp/restart.txt
echo "--> Passenger restart requested"

echo "--> Pruning old releases (keeping $KEEP_RELEASES)"
ls -1dt "$BASE"/releases/ark-* 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf

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
