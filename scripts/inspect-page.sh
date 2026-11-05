#!/usr/bin/env bash
# Runs design-taste-frontend's inspector on the page. Screenshots land in .taste-skill/inspect/.
set -euo pipefail
cd "$(dirname "$0")/.."
SKILL="${DESIGN_SKILL:-/home/airlock-build/skills/design-taste-frontend}"
docker build -q -t airlock-inspect:local -f scripts/inspect.Dockerfile scripts >/dev/null
docker run --rm -v "$PWD:/work" -v "$SKILL:/skill:ro" -w /work airlock-inspect:local \
  node /skill/scripts/inspect.mjs site/index.html
