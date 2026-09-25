# Pepe’s Sepolia arcade

The release preserves the MIT `prototype/index.html` artwork, platform game, animation and `bgm.mp3`. Vite, React, TypeScript, wagmi, RainbowKit and viem supply the wallet shell. The game’s JavaScript lives in `public/game.html`; its same-origin bridge delegates all value operations to `src/engine.ts`. Music starts muted and can be enabled with the original control or M. Reduced-motion users start with the animation paused.

## Build and preview

Use Node 22 or later. From `web/`:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
npm run check:export
npm run preview
```

Open the preview URL printed by Vite. Production files are written to repository-root `dist/`. Publish that directory as static files without rebuilding; retain its relative paths. The site works under a gateway subdirectory, with no application server or route rewrites. To develop, run `node scripts/prepare.mjs` once, then `npm run dev`.

Install browser tooling and run the production interaction suite:

```sh
npx playwright install chromium
npm run test:browser
```

`PLAYWRIGHT_BROWSERS_PATH` may point outside the checkout. The worker used `/tmp/pepe-browsers`. Tests serve the actual export at both `/` and `/ipfs/test/`, use mocked RPC and injected wallet responses, and never submit real transactions. Their screenshots and machine-readable report go to `docs/frontend/`; transient Playwright artifacts go to `/tmp/pepe-playwright-results`.

Optional read-only live checks:

```sh
npm run check:chain
npx tsx scripts/check-quotes.ts
```

The read-only production browser check is `PLAYWRIGHT_BROWSERS_PATH=/tmp/pepe-browsers node scripts/check-browser-live.mjs`. `python3 scripts/check-bundle.py` measures a complete-history Git bundle in disposable `test/scratch/` scaffolding. The managed checkout’s `.git` is read-only; collection/commit must be performed by the control plane.

These write evidence to `docs/frontend/`. They use only the handoff’s public RPCs and never request a signing key or send a transaction.

## Configuration and integrity

`deployment/handoff.json` and `deployment/network.json` preserve the supplied pinned inputs for reproducible builds after `.imd/reads/` is removed. They are build inputs, not imported address maps in the app.

`prepare.mjs` obtains each raw ABI array with `git show <sourceCommit>:docs/abi/<name>.json`. It checks Keccak-256 of recursively key-sorted canonical JSON against the handoff, preserving array order. The pinned commit must remain available in Git. No contract source or protected build file is modified.

**The browser loads only `./imd-deployment.json` for deployment addresses, chain, pool, RPCs and ABI paths**, then fetches and verifies those ABIs. No deployment addresses are compiled into the application. The manifest includes the complete contract set and exact identity fields, the unchanged `network` object, plus `walletAddChain` and the attested `pool` parameters. Router, Quoter, StateView, PoolManager and Permit2 come from its network block. The small interface ABIs for Uniswap’s public interfaces are in `src/protocol.ts`; the deployed game contract ABIs come exclusively from the manifest.

After Vite finishes, `manifest.mjs` inventories and hashes every export file except the manifest. Run the whole build after any export change. `check:export` independently checks the handoff, network, pool, ABI hashes, asset coverage, SHA-256 values and size limits. Do not edit `dist/` manually.

Before enabling transactions, the app checks RPC chain ID, nonempty code at both contracts and all six configured Uniswap addresses, the hook’s PoolManager binding, token decimals and pool initialization. RPC fallback uses the three public URLs in order. A pool with zero *current* liquidity can still trade into a one-sided position; each quote and router simulation determines whether the requested move is executable.

Injected browser wallets need no WalletConnect project ID. wagmi manages connection and account/network events; RainbowKit provides the account dialog and wallet UI theme. No WalletConnect relay or private/public project credential is configured. On an unknown chain, Switch requests the supplied `wallet_addEthereumChain` parameters and retries switching. No private credentials belong in this repository.

## Value flows

- Fridge: 100 ICE → ETH, or a selected 0.001/0.005/0.01 ETH → ICE. An in-game fridge collision prepares the same quote/review flow. The scene’s flipped default is 0.001 ETH.
- Throne: 0.001/0.005/0.01 ETH → ICE; five local free climb bursts follow a confirmed matching ticket event.
- Quotes: `quoteExactInputSingle` via `eth_call`, with the player ABI-encoded in hookData. The user selects slippage, with a 30-second quote lifetime. Minimum output uses integer rounding down; the router deadline is five minutes.
- ICE input: separate exact-amount ERC-20 approval to Permit2, then exact-amount Permit2 approval to the supplied router with a 30-minute expiry. Requote after each approval. ETH input needs no approval.
- Router: `execute(0x10, [abi.encode(0x060c0f, params)], deadline)`, with exact-input swap, settle-all and take-all. Simulate every write before the wallet prompt and recheck the provider’s chain/account after simulation.
- Tank: approve the hook for `pees × ICE_PER_PEE`, then `fillTank`. Matching `TankFilled` receipt events credit local pees once. The UI accepts 1–1000 pees. No simulated wallet token debits or credits exist.
- Tickets: recover recent `TicketIssued` logs, read `ticket`, wait until B+2, fetch B+1’s block hash, and compute the exact Solidity ABI-encoded Keccak roll. Only 77 or multiples of 20 can trigger draw. Fresh winning tickets request a separate wallet signature automatically; an explicit claim button retries rejected draws. Losing tickets never submit draw. Verify `Drawn` before reporting a payout. No winning amount is promised from a cached pot.
- Local game: fridge prizes and climb prizes are points. Pees and paid climb fuel consume the local tank; free bursts are consumed first. State is separated by launch ID and wallet. Pending receipts are restored on reconnect and credited once only after matching events. Clearing browser storage loses local game credit; it never changes chain balances. This local state is not an on-chain entitlement or secure anti-cheat ledger.

## Scope and validation

See `../docs/FRONTEND_VALIDATION.md` for actual results, the Vercel guideline review and limitations. This assignment does not redeploy contracts, sign real transactions, publish the site or claim control-plane checks have run.

`web/.gitignore` is the only ignore-file path changed, explicitly budgeted by the assignment. Nested node_modules, npm/Vite caches, test output and TypeScript caches are excluded. Dependencies and browser binaries are not vendored. Font Latin subsets are local for offline asset serving, with OFL notices in `public/font-licenses.txt` and `docs/frontend/font-licenses/`. The source prototype and music retain the repository’s MIT license.

`python3 scripts/adapt-game.py` reproduces the adapted scene from the preserved prototype; normal builds use the committed `public/game.html`. `python3 scripts/fonts.py` optionally refetches the prototype’s font families; normal builds do not contact Google Fonts.
