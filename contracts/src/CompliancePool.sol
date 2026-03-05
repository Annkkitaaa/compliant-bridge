// SPDX-License-Identifier: MIT
// Chainlink Integration: ComplianceGateway (isCompliantWithTier) gates every interaction
// Purpose: Compliance-gated constant-product AMM. Only wallets with sufficient tier
//          (as verified by the Chainlink-powered ComplianceGateway) may swap, add, or
//          remove liquidity. Non-compliant calls emit ComplianceBlocked and revert.
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ── Minimal gateway interface (only the 2 tier-functions needed) ───────────
interface IPoolGateway {
    function isCompliantWithTier(address subject, uint8 requiredTier) external view returns (bool);
    function getComplianceTier(address subject) external view returns (uint8);
}

/// @notice Constant-product AMM (x*y=k) gated by Chainlink compliance attestations.
///         Supports two ERC-20 tokens (tokenA / tokenB) and issues LP shares.
contract CompliancePool is ERC20 {
    // ── Immutable config ─────────────────────────────────────────────────
    address public immutable gateway;
    address public immutable tokenA;
    address public immutable tokenB;
    uint8   public immutable requiredTier;
    string  public poolName;

    // ── Pool state ───────────────────────────────────────────────────────
    uint256 public reserveA;
    uint256 public reserveB;

    /// @dev First-deposit LP shares donated to address(1) to prevent griefing.
    uint256 public constant MINIMUM_LIQUIDITY = 1_000;
    uint256 public constant FEE_NUMERATOR     = 997;  // 0.3% fee
    uint256 public constant FEE_DENOMINATOR   = 1_000;

    // ── Events ───────────────────────────────────────────────────────────
    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 lpShares
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 lpShares
    );

    event Swapped(
        address indexed trader,
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut
    );

    event ComplianceBlocked(
        address indexed user,
        uint8   userTier,
        uint8   requiredTier,
        string  action
    );

    // ── Errors ───────────────────────────────────────────────────────────
    error NotCompliant();
    error ZeroAmount();
    error InsufficientLiquidity();
    error InvalidToken();
    error SlippageExceeded();
    error InsufficientLPBalance();

    // ── Compliance modifier ───────────────────────────────────────────────
    modifier onlyCompliant(string memory action) {
        if (!IPoolGateway(gateway).isCompliantWithTier(msg.sender, requiredTier)) {
            uint8 userTier = IPoolGateway(gateway).getComplianceTier(msg.sender);
            emit ComplianceBlocked(msg.sender, userTier, requiredTier, action);
            revert NotCompliant();
        }
        _;
    }

    constructor(
        address gateway_,
        address tokenA_,
        address tokenB_,
        uint8   requiredTier_,
        string memory poolName_
    ) ERC20(
        string(abi.encodePacked("CLP-LP-", poolName_)),
        string(abi.encodePacked("CLP", poolName_))
    ) {
        gateway      = gateway_;
        tokenA       = tokenA_;
        tokenB       = tokenB_;
        requiredTier = requiredTier_;
        poolName     = poolName_;
    }

    // ── Liquidity ────────────────────────────────────────────────────────

    /// @notice Add liquidity. First depositor sets the ratio; subsequent deposits
    ///         must match the current ratio (within integer rounding).
    /// @param amountADesired  Max tokenA to deposit.
    /// @param amountBDesired  Max tokenB to deposit.
    /// @param amountAMin      Slippage guard for tokenA.
    /// @param amountBMin      Slippage guard for tokenB.
    function addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external onlyCompliant("addLiquidity") returns (uint256 lpShares) {
        if (amountADesired == 0 || amountBDesired == 0) revert ZeroAmount();

        uint256 amountA;
        uint256 amountB;
        uint256 supply = totalSupply();

        if (supply == 0) {
            // First deposit — accept as-is
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            // Maintain ratio
            uint256 amountBOptimal = amountADesired * reserveB / reserveA;
            if (amountBOptimal <= amountBDesired) {
                if (amountBOptimal < amountBMin) revert SlippageExceeded();
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = amountBDesired * reserveA / reserveB;
                if (amountAOptimal < amountAMin) revert SlippageExceeded();
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        if (supply == 0) {
            lpShares = _sqrt(amountA * amountB) - MINIMUM_LIQUIDITY;
            _mint(address(1), MINIMUM_LIQUIDITY); // permanently locked
        } else {
            uint256 sharesA = amountA * supply / reserveA;
            uint256 sharesB = amountB * supply / reserveB;
            lpShares = sharesA < sharesB ? sharesA : sharesB;
        }

        if (lpShares == 0) revert InsufficientLiquidity();

        _mint(msg.sender, lpShares);
        reserveA += amountA;
        reserveB += amountB;

        emit LiquidityAdded(msg.sender, amountA, amountB, lpShares);
    }

    /// @notice Remove liquidity proportionally.
    /// @param lpAmount  LP tokens to burn.
    function removeLiquidity(uint256 lpAmount)
        external
        onlyCompliant("removeLiquidity")
        returns (uint256 amountA, uint256 amountB)
    {
        if (lpAmount == 0) revert ZeroAmount();
        if (balanceOf(msg.sender) < lpAmount) revert InsufficientLPBalance();

        uint256 supply = totalSupply();
        amountA = lpAmount * reserveA / supply;
        amountB = lpAmount * reserveB / supply;

        if (amountA == 0 || amountB == 0) revert InsufficientLiquidity();

        _burn(msg.sender, lpAmount);
        reserveA -= amountA;
        reserveB -= amountB;

        IERC20(tokenA).transfer(msg.sender, amountA);
        IERC20(tokenB).transfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, lpAmount);
    }

    // ── Swap ─────────────────────────────────────────────────────────────

    /// @notice Swap exact input for minimum output (0.3% fee retained in pool).
    /// @param tokenIn   Must be tokenA or tokenB.
    /// @param amountIn  Exact amount of tokenIn to send.
    /// @param amountOutMin  Slippage guard.
    function swap(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin
    ) external onlyCompliant("swap") returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();
        if (tokenIn != tokenA && tokenIn != tokenB) revert InvalidToken();

        bool aToB = tokenIn == tokenA;
        (uint256 rIn, uint256 rOut, address tokenOut) = aToB
            ? (reserveA, reserveB, tokenB)
            : (reserveB, reserveA, tokenA);

        amountOut = getAmountOut(amountIn, rIn, rOut);
        if (amountOut < amountOutMin) revert SlippageExceeded();
        if (amountOut >= rOut) revert InsufficientLiquidity();

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);

        if (aToB) {
            reserveA += amountIn;
            reserveB -= amountOut;
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
        }

        emit Swapped(msg.sender, tokenIn, amountIn, amountOut);
    }

    // ── View helpers ──────────────────────────────────────────────────────

    /// @notice Constant-product output with 0.3% fee.
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        if (amountIn == 0) revert ZeroAmount();
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        return amountInWithFee * reserveOut / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }

    function getLPBalance(address user) external view returns (uint256) {
        return balanceOf(user);
    }

    function canInteract(address user) external view returns (bool) {
        return IPoolGateway(gateway).isCompliantWithTier(user, requiredTier);
    }

    function getPoolInfo() external view returns (
        address gateway_,
        address tokenA_,
        address tokenB_,
        uint8   requiredTier_,
        uint256 reserveA_,
        uint256 reserveB_,
        uint256 totalSupply_
    ) {
        return (gateway, tokenA, tokenB, requiredTier, reserveA, reserveB, totalSupply());
    }

    // ── Internal ────────────────────────────────────────────────────────

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
