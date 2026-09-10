# AGENTS.md

Conventions for this repository.

## Language

**Code and comments are written in English** — comments, JSDoc, test names, and
user-facing UI strings. Chinese is for the documents in `docs/`, not for source.

## Docs

`docs/` is gitignored on purpose: the design documents are kept local. They are
still the source of truth for what Ospore is supposed to be — read them before
changing behaviour.

- `docs/product-vision-and-concepts.md` — why Ospore exists (WHY)
- `docs/requirements-v0.md` — what v0 must do (WHAT)
- `docs/architecture-v0.md` — how it is built (HOW)
- `docs/delivery.md` — how it ships (`~/env/ospore/run`)

## Checks

`pnpm typecheck && pnpm lint && pnpm test` before every commit.

`pnpm test` runs two lanes, split by file name:

- `*.test.ts(x)` — node, with per-file `@vitest-environment jsdom` opt-in.
- `*.browser.test.tsx` — real Chromium via `@vitest/browser-playwright`.

Push an assertion down to the cheapest lane that can see it. jsdom applies no
stylesheet, so computed size, layout and colour are invisible there — those go in
the browser lane, which costs about a second and does not need a build. Reach for
E2E only when the assertion genuinely needs the packaged app (protocol serving, an
iframe sandbox, a restart).

## E2E

E2E is **not** part of `pnpm test` — it is the slow, whole-app layer. It gates the
deploy instead: `scripts/deploy.sh` runs `pnpm e2e` before packaging anything, so
`pnpm deploy:local` fails on a red suite. `OSPORE_SKIP_E2E=1` bypasses the gate.

Run it by hand with `pnpm e2e`. `scripts/e2e.sh` picks the display: the session's
when there is one, `xvfb-run` with `CI=1` and no `WAYLAND_DISPLAY` when there is
not. E2E drives the **built** app (`build-output/out`), so `pree2e` rebuilds
first — never call `playwright test` directly.
