// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice CCIP chain selectors for supported testnets and mainnets.
/// @dev These are the official Chainlink CCIP chain selectors.
///      See: https://docs.chain.link/ccip/supported-networks
library ChainSelectors {
    // Testnets
    uint64 internal constant SEPOLIA = 16015286601757825753;
    uint64 internal constant ARBITRUM_SEPOLIA = 3478487238524512106;
    uint64 internal constant BASE_SEPOLIA = 10344971235874465080;
    uint64 internal constant OPTIMISM_SEPOLIA = 5224473277236331295;

    // Mainnets
    uint64 internal constant ETHEREUM = 5009297550715157269;
    uint64 internal constant ARBITRUM = 4949039107694359620;
    uint64 internal constant BASE = 15971525489660198786;
    uint64 internal constant OPTIMISM = 3734403246176062136;
}
