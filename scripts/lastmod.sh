#!/usr/bin/env sh
set -eu
git ls-files -z src public | while IFS= read -r -d '' file; do
  printf '%s\t%s\n' "$(git log -1 --format=%cI -- "$file")" "$file"
done
