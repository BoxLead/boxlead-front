#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

check() {
  docker buildx bake -f docker-bake.hcl check
}

unit() {
  docker buildx bake -f docker-bake.hcl unit
}

e2e() {
  local shard=${1:-1} total=${2:-1}
  local name="boxlead-front-e2e-${shard}-of-${total}-$$"
  docker buildx bake -f docker-bake.hcl e2e
  rm -rf blob-report test-results
  local status=0
  docker run --name "$name" --ipc=host boxlead-front-e2e:ci npx playwright test --shard="${shard}/${total}" || status=$?
  docker cp "$name:/app/blob-report" blob-report || true
  docker cp "$name:/app/test-results" test-results 2>/dev/null || true
  docker rm "$name" > /dev/null
  return "$status"
}

report() {
  docker buildx bake -f docker-bake.hcl report
  rm -rf playwright-report
  mkdir -p playwright-report
  docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI=1 -e PLAYWRIGHT_HTML_OPEN=never \
    -e PLAYWRIGHT_JSON_OUTPUT_NAME=playwright-report/results.json \
    -v "$PWD/all-blob-reports:/app/all-blob-reports" -v "$PWD/playwright-report:/app/playwright-report" \
    boxlead-front-deps:ci npx playwright merge-reports --reporter=github,html,json ./all-blob-reports
  retried
}

retried() {
  local summary
  summary=$(jq -r '
    .stats as $stats
    | [.. | objects | select(has("specs")) | .file as $file | .specs[] | . as $spec | .tests[]
       | select(.status == "flaky" or .status == "unexpected")
       | "- \(.status) [\(.projectName)] \($file):\($spec.line) \($spec.title)"] as $rows
    | "End-to-end \($stats.expected) passed, \($stats.flaky) passed on retry, \($stats.unexpected) failed, \($stats.skipped) skipped",
      $rows[]
  ' playwright-report/results.json)
  echo "$summary"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then echo "$summary" >> "$GITHUB_STEP_SUMMARY"; fi
}

all() {
  check
  unit
  e2e 1 1
}

case "${1:-all}" in
  check) check ;;
  unit) unit ;;
  e2e) e2e "${2:-1}" "${3:-1}" ;;
  report) report ;;
  all) all ;;
  *) echo "usage: scripts/ci.sh [check|unit|e2e SHARD TOTAL|report|all]" >&2; exit 2 ;;
esac
