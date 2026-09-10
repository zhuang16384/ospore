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
E2E drives the **built** app (`build-output/out`), so always go through `pnpm e2e`
— its `pree2e` hook rebuilds first. That also needs a compositing display; on a
headless or restricted shell run `CI=1 xvfb-run -a pnpm e2e`
(`CI=1` adds `--no-sandbox`, which those environments require).
