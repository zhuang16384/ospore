#!/usr/bin/env bash
#
# Run the Playwright e2e suite against whichever display this shell has.
#
#   ./scripts/e2e.sh [playwright args...]
#
# Inside a desktop session there is already a compositing X display, so Electron
# uses it. In a headless shell (CI, an agent sandbox) there is not, so fall back
# to a virtual one — and drop WAYLAND_DISPLAY while doing so, because Electron
# would otherwise attempt a Wayland connection that cannot work under Xvfb and
# hang before producing a frame. CI=1 also makes the fixture pass --no-sandbox,
# which restricted environments need.
#
# Note: `--disable-gpu` is deliberately absent from the Electron args in
# e2e/fixtures/launch.ts. Without a GPU process Chromium stops producing frames
# under Xvfb, so requestAnimationFrame never ticks and Playwright's actionability
# check never satisfies — every click times out while the DOM looks fine.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PLAYWRIGHT="$REPO_ROOT/node_modules/.bin/playwright"
if [ ! -x "$PLAYWRIGHT" ]; then
  echo "[e2e] playwright is not installed — run pnpm install" >&2
  exit 1
fi

if [ -n "${DISPLAY:-}" ]; then
  exec "$PLAYWRIGHT" test "$@"
fi

if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "[e2e] no DISPLAY and no xvfb-run — cannot run e2e in this shell" >&2
  exit 1
fi

echo "[e2e] no DISPLAY: running under xvfb-run" >&2
exec env -u WAYLAND_DISPLAY CI=1 xvfb-run -a "$PLAYWRIGHT" test "$@"
