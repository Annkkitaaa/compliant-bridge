// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Simple mintable ERC-20 for testnet use (IUSD / tTREAS).
/// Anyone can call faucet() to get test tokens.
contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Mint any amount to any address (owner / tests).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Free faucet — mints 10 000 tokens to caller.
    function faucet() external {
        _mint(msg.sender, 10_000 * (10 ** _decimals));
    }
}
