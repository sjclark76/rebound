#!/usr/bin/env bash
# Sets a story's state: swaps the state label on the issue and mirrors it onto the
# Rebound project board's "Stage" column. Labels are the source of truth.
# Usage: scripts/story-state.sh <issue-number> <needs-spec|needs-design|ready|in-progress|in-review|done>
set -euo pipefail

# Make sure gh runs as the sjclark76 account (see .envrc).
if [ -z "${GH_TOKEN:-}" ]; then exec direnv exec "$(dirname "$0")/.." "$0" "$@"; fi

REPO=sjclark76/rebound
OWNER=sjclark76
PROJECT=3
ISSUE=${1:?issue number}
STATE=${2:?state}

case "$STATE" in
  needs-spec|needs-design) STAGE="Backlog" ;;
  ready) STAGE="Ready" ;;
  in-progress) STAGE="In progress" ;;
  in-review) STAGE="In review" ;;
  done) STAGE="Done" ;;
  *) echo "Unknown state: $STATE" >&2; exit 1 ;;
esac

# Labels: remove every state label, then add the new one (done = no label, issue closed by its PR).
for l in needs-spec needs-design ready in-progress in-review; do
  gh issue edit "$ISSUE" -R "$REPO" --remove-label "$l" >/dev/null 2>&1 || true
done
[ "$STATE" = "done" ] || gh issue edit "$ISSUE" -R "$REPO" --add-label "$STATE" >/dev/null

# Board: find the project, the Stage field and option, and the issue's item.
PROJECT_ID=$(gh project view "$PROJECT" --owner "$OWNER" --format json --jq .id)
FIELD=$(gh project field-list "$PROJECT" --owner "$OWNER" --format json --jq '.fields[]|select(.name=="Stage")')
FIELD_ID=$(jq -r .id <<<"$FIELD")
OPTION_ID=$(jq -r --arg s "$STAGE" '.options[]|select(.name==$s)|.id' <<<"$FIELD")
ITEM_ID=$(gh project item-list "$PROJECT" --owner "$OWNER" --limit 200 --format json \
  --jq ".items[]|select(.content.number==$ISSUE)|.id")
if [ -z "$ITEM_ID" ]; then
  ITEM_ID=$(gh project item-add "$PROJECT" --owner "$OWNER" --url "https://github.com/$REPO/issues/$ISSUE" --format json --jq .id)
fi
gh project item-edit --id "$ITEM_ID" --field-id "$FIELD_ID" --project-id "$PROJECT_ID" --single-select-option-id "$OPTION_ID" >/dev/null

echo "#$ISSUE -> $STATE (board: $STAGE)"
