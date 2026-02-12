# Cross-Chain Deployment & Setup Guide

Deploy and configure the Compliant Bridge across Sepolia (source) and Arbitrum Sepolia or Base Sepolia (destination).

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Deployer wallet with testnet ETH on both chains
- Testnet LINK tokens for CCIP fees (or use native ETH)
- RPC URLs for both chains (e.g., from Alchemy or Infura)

## 1. Environment Setup

```bash
cd contracts
cp .env.example .env
```

Fill in your `.env`:
- `PRIVATE_KEY` - your deployer wallet private key
- `SEPOLIA_RPC_URL` - Sepolia RPC endpoint
- `ARB_SEPOLIA_RPC_URL` - Arbitrum Sepolia RPC endpoint
- CCIP router and LINK addresses are pre-filled with official values

## 2. Get Testnet Tokens

### Sepolia ETH
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

### Arbitrum Sepolia ETH
- Bridge from Sepolia using the [Arbitrum Bridge](https://bridge.arbitrum.io/)
- Or use the [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)

### LINK Tokens (for CCIP fees)
- [Chainlink Faucet](https://faucets.chain.link/) - get LINK on Sepolia
- You need ~5 LINK per chain for CCIP fees
- Alternative: leave `LINK_TOKEN` empty to pay fees in native ETH

## 3. Deploy Contracts

### Step 1: Deploy on Sepolia (source chain)

```bash
make deploy-sepolia
```

This deploys:
- ComplianceGateway
- ComplianceToken (CBT)
- RegulatorView
- **AttestationSender** (source-only)
- AttestationInvalidator

Copy the output addresses into `.env` under the `SRC_*` variables.

### Step 2: Deploy on Arbitrum Sepolia (destination chain)

```bash
make deploy-arb-sepolia
```

This deploys:
- ComplianceGateway
- ComplianceToken (CBT)
- RegulatorView
- **AttestationReceiver** (destination-only)
- AttestationInvalidator

Copy the output addresses into `.env` under the `DST_*` variables.

## 4. Configure Cross-Chain Trust

After deploying on both chains and filling in all addresses in `.env`:

```bash
make configure-ccip
```

This runs two transactions:

**On Sepolia:**
- Authorizes the compliance bot on the sender
- Funds the sender and invalidator with LINK/ETH for CCIP fees

**On Arbitrum Sepolia:**
- Allowlists Sepolia's chain selector on the receiver
- Allowlists the sender contract address as a trusted source
- Allowlists the invalidator contract address as a trusted source

## 5. Test the Cross-Chain Flow

### Send an attestation from Sepolia

```bash
make test-crosschain-send
```

This will:
1. Submit a compliance attestation on Sepolia
2. Send it cross-chain via CCIP to Arbitrum Sepolia
3. Print the CCIP message ID

### Wait for CCIP delivery

CCIP delivery typically takes **5-20 minutes** on testnets. Monitor at:
https://ccip.chain.link

Search by the message ID printed in the previous step.

### Verify delivery on Arbitrum Sepolia

```bash
make test-crosschain-verify
```

This reads the destination gateway and confirms the attestation arrived with correct data.

## Architecture Overview

```
Sepolia (Source)                    Arbitrum Sepolia (Destination)
┌─────────────────────┐            ┌─────────────────────────┐
│ ComplianceGateway    │            │ ComplianceGateway       │
│ ComplianceToken      │            │ ComplianceToken         │
│ RegulatorView        │            │ RegulatorView           │
│ AttestationSender ───┼── CCIP ──►│ AttestationReceiver     │
│ AttestationInvalidator├── CCIP ──►│ AttestationInvalidator  │
└─────────────────────┘            └─────────────────────────┘
```

**AttestationSender** encodes attestation data into a CCIP message and sends it to the destination chain's **AttestationReceiver**, which decodes it and stores it in the local **ComplianceGateway**.

**AttestationInvalidator** revokes locally and broadcasts revocation messages to all configured destination chains simultaneously.

## Troubleshooting

### "InsufficientFee" error
The sender/invalidator contract doesn't have enough LINK or ETH to pay CCIP fees. Fund it:
```bash
# Send LINK to the sender contract
cast send $LINK_TOKEN_SEPOLIA "transfer(address,uint256)" $SENDER_ADDRESS 5000000000000000000 \
  --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY
```
Or send native ETH:
```bash
cast send $SENDER_ADDRESS --value 0.1ether \
  --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY
```

### "SourceChainNotAllowed" or "SenderNotAllowed"
The receiver hasn't allowlisted the source. Re-run:
```bash
make configure-ccip-dest
```

### "OnlyAuthorized" on sender
The calling address isn't authorized. Authorize it:
```bash
cast send $SENDER_ADDRESS "setAuthorizedSender(address,bool)" $YOUR_ADDRESS true \
  --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY
```

### CCIP message stuck / not delivering
- Check message status at https://ccip.chain.link
- Testnet CCIP can be slow (up to 30 min in congestion)
- Ensure the destination chain receiver contract is correctly deployed
- Verify the chain selector matches (these are NOT the same as chain IDs)

### "InvalidRouter" error
The caller of `ccipReceive` is not the CCIP router. This should only happen in testing. On live networks, only the router can call this function.

### Attestation shows as not compliant on destination
- Check `validUntil` - the attestation may have expired
- Check `isRevoked` - it may have been revoked
- Ensure `receiveRemoteAttestation` was called (check events on the receiver)

## CCIP Reference

| Network | Chain ID | CCIP Selector | Router |
|---------|----------|---------------|--------|
| Sepolia | 11155111 | 16015286601757825753 | 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59 |
| Arb Sepolia | 421614 | 3478487238524512106 | 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165 |
| Base Sepolia | 84532 | 10344971235874465080 | 0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93 |

Full list: https://docs.chain.link/ccip/supported-networks
