// imd-deployment.json follows IMD's version 1 schema, which refuses keys it does not define.
// Anything else the release needs is derived here instead of being shipped in that file.
export const MANIFEST_KEYS = ['version', 'launchId', 'chainId', 'sourceCommit', 'attestationHash', 'contracts', 'assets', 'network'];

// The launch policy's pool: native ETH against ICE, fee 3000, tick spacing 60 (see launch.json).
export const POOL = { pairedCurrency: '0x0000000000000000000000000000000000000000', fee: 3000, tickSpacing: 60 };

// EIP-3085 parameters for wallet_addEthereumChain, built from the deployment's network block.
export function walletAddChain(network) {
  return { chainId: `0x${network.chainId.toString(16)}`, chainName: network.name, rpcUrls: network.rpcUrls,
    nativeCurrency: network.nativeCurrency, blockExplorerUrls: [network.explorer] };
}
