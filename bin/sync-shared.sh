#!/usr/bin/env bash
# Script: Sync Shared Backend Code
# Purpose: Copy backend/_shared/common into every deployable Python service,
#          since each Lambda packages only its own folder.
# Usage: ./sync-shared.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" > /dev/null 2>&1 || exit 1; pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." > /dev/null 2>&1 || exit 1; pwd -P)"
SHARED_DIR="$PROJECT_ROOT/backend/_shared/common"

for svc in "$PROJECT_ROOT"/backend/*/; do
    name="$(basename "$svc")"
    [[ "$name" == _* || ! -f "$svc/requirements.txt" ]] && continue
    rm -rf "$svc/common"
    cp -r "$SHARED_DIR" "$svc/common"
    find "$svc/common" -name "__pycache__" -type d -prune -exec rm -rf {} +
    echo "INFO: Synced common -> backend/$name"
done
