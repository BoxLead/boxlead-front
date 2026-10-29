#!/usr/bin/env bash
set -euo pipefail

workflow=${1:?usage: scripts/wait-for-ci.sh WORKFLOW_FILE SHA EVENT}
sha=${2:?usage: scripts/wait-for-ci.sh WORKFLOW_FILE SHA EVENT}
event=${3:?usage: scripts/wait-for-ci.sh WORKFLOW_FILE SHA EVENT}
url="${GITHUB_API_URL:-https://api.github.com}/repos/${GITHUB_REPOSITORY:?}/actions/workflows/${workflow}/runs?head_sha=${sha}&event=${event}&per_page=1"

for _ in $(seq 1 180); do
  state=$(curl -fsS -H "Authorization: Bearer ${GITHUB_TOKEN:?}" -H "Accept: application/vnd.github+json" "$url" \
    | jq -r '.workflow_runs[0] | if . == null then "missing" else "\(.status) \(.conclusion)" end')
  case "$state" in
    "completed success")
      echo "${workflow} passed for ${sha}"
      exit 0
      ;;
    completed*)
      echo "::error::${workflow} finished with ${state#completed } for ${sha}"
      exit 1
      ;;
  esac
  sleep 10
done

echo "::error::${workflow} did not finish in 30 minutes for ${sha}"
exit 1
