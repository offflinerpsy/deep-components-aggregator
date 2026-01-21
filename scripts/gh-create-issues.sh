#!/usr/bin/env bash
set -euo pipefail

REPO="offflinerpsy/deep-components-aggregator"
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ISSUES_DIR="$BASE_DIR/docs/_artifacts/2026-01-21/issues"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install GitHub CLI first." >&2
  exit 1
fi

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "Not authenticated in gh. Run: gh auth login -h github.com" >&2
  exit 1
fi

if [ ! -d "$ISSUES_DIR" ]; then
  echo "Issues dir not found: $ISSUES_DIR" >&2
  exit 1
fi

create_issue() {
  local title="$1"
  local body_file="$2"

  if [ ! -f "$body_file" ]; then
    echo "Missing file: $body_file" >&2
    exit 1
  fi

  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body-file "$body_file" \
    >/dev/null

  echo "Created issue: $title"
}

create_issue "feat(catalog): 10 cached items + assistant + anti-spam" "$ISSUES_DIR/001-catalog-preview-assistant.md"
create_issue "chore(git): ignore SQLite WAL/SHM" "$ISSUES_DIR/002-chore-ignore-sqlite-wal-shm.md"

echo "Done."