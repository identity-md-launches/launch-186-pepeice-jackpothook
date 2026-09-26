# Local implementation evidence

Recorded 2026-09-26. These are contributor checks, not protected service approval, deployment
attestation or an independent release audit. No transactions were broadcast and no live-chain
fork rehearsal was run. The task forbids modifying `.git/`, so no commit was created locally;
the source-producing service can bind these ordinary files to its artifact commit.

Toolchain: Forge 1.7.1 (`4072e48705af9d93e3c0f6e29e93b5e9a40caed8`), Solidity 0.8.26,
Cancun, optimizer 200, `via_ir=false`, metadata hash disabled. The existing vendored dependencies
and configuration were sufficient; no dependencies were installed or changed.

| Command/check | Result |
| --- | --- |
| `forge build --offline` | Passed |
| `forge test --offline` | 34 passed, 0 failed, 0 skipped |
| `forge test --offline --fuzz-runs 1000` | 34 passed, 0 failed, 0 skipped; each of three fuzz tests ran 1,000 cases |
| `forge fmt --check` | Passed |
| `python3 tools/check_release.py` | Manifest, constructor ABIs, ABI exports and runtime checks passed |
| Supplied protected token/hook check logic, run locally | 9 passed, 0 failed, 0 skipped |

The protected inputs were copied to temporary `test/scratch/` scaffolding. Only their imports
were redirected to local HookFlags constants and a standard OpenZeppelin mock ERC20 because those
test-support files are not included with the supplied reads. Check bodies were unchanged. Creation
code came from the built artifacts, with the literal Sepolia manager ABI argument appended to the
hook. Per-process test parameters set flags 136 and token decimals 18; no `vm.setEnv` was used.
Those temporary files are not part of the delivered suite. This run does not claim a protected
verification receipt or a live-manager lifecycle result.

The starting implementation already supplied both contracts, the manifest, security documentation
and matching ABI exports. This pass checked them against the specification and retained their
behavior. It added four regression tests: every one of the 100 draw outcomes in each fee currency;
unfunded swap rollback including AMM price, pot and ticket state; unfunded tank-purchase rollback;
and expiry after rejected jackpot settlement, followed by a successful payout to another player.
The complete outcome-table test checks payout events, actual recipient balances, remaining pots,
claim backing and refusal of a second draw for all 200 tickets.

The extended conservation run exercised 40,000 mixed action steps. After each step, actual prizes
received plus remaining pots equalled total fee/tank funding in each currency, and manager claims
backed the pots. Real local-manager tests also cover partial-fill rejection, the first buy/sell from
one-sided liquidity, pool isolation, payment failure rollback, retry and reentrancy.

## Local inspection and remaining release responsibilities

Local inspection traced the vendored v4 self-callback suppression, inner/outer deltas, claims,
ticket timing, expiry, payouts, manager authorization and reentrancy. Manifest checks confirmed
the constructor ABIs, literal Sepolia manager, two permissions, token metadata, pool parameters
and ABI parity. No implementation repair was needed for the tested behavior.

This session did not perform an independent contributor review. Any earlier review narrative in
the starting repository is not evidence of approval of this contribution. Independent review of
the exact contracts and launch.json, signed artifact linkage, admission and router rehearsal remain
separate service steps. Known Sepolia randomness, settlement-order and recipient limitations are
recorded in SECURITY.md.

## File fingerprints

SHA-256 hashes identify the delivered source, manifest and ABIs without claiming signed linkage.

| File | SHA-256 |
| --- | --- |
| `src/PepeIce.sol` | `7033922ac61bc80a423f202d529ec5c7a4d63ba3ea264284fa92f4776e0a1d0b` |
| `src/JackpotHook.sol` | `f3ee6c4977695115a6098fd1a3886a33c2bea9fd3d8aae5e608165d27d14e08d` |
| `launch.json` | `93fd5cc1bf89a6014c152c424f85af10eca044f32aea73fc6f553504159b76d5` |
| `docs/abi/PepeIce.json` | `9578fcb499b4ba5fac51462a67a2654d9f803e0ea3af9bdb19130ff695808542` |
| `docs/abi/JackpotHook.json` | `305a7b7639a467d35f7a58977e3cd5bfec5401c88e3b46a35a10d49e46ea2fe4` |
| `test/JackpotBoundaries.t.sol` | `116f8ef24488d5bc2833267da2dd13419b46addc5da1a1ea4b7704512f99d738` |
| `test/JackpotAdversarial.t.sol` | `1083d4a9d83c1e43bd0278875bafbd42ab8c79ea38007717879ecac6889b9266` |

Compiled runtime sizes: PepeIce 1,723 bytes; JackpotHook 7,780 bytes, both below EIP-170's limit.
