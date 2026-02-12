-include .env

.PHONY: build test deploy-sepolia deploy-arb-sepolia deploy-base-sepolia \
        configure-ccip-sepolia configure-ccip-dest configure-ccip \
        test-crosschain deploy-all setup-testdata verify clean

# ── Build & Test ──────────────────────────────────────────────────────

build:
	forge build

test:
	forge test -vvv

test-gas:
	forge test --gas-report

# ── Deploy ────────────────────────────────────────────────────────────

deploy-sepolia:
	CCIP_ROUTER=$(CCIP_ROUTER_SEPOLIA) LINK_TOKEN=$(LINK_TOKEN_SEPOLIA) \
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--broadcast \
		--verify \
		-vvvv
	@echo ""
	@echo ">>> Copy deployed addresses into .env (SRC_GATEWAY_ADDRESS, etc.) <<<"

deploy-arb-sepolia:
	CCIP_ROUTER=$(CCIP_ROUTER_ARB_SEPOLIA) LINK_TOKEN=$(LINK_TOKEN_ARB_SEPOLIA) \
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--broadcast \
		--verify \
		-vvvv
	@echo ""
	@echo ">>> Copy deployed addresses into .env (DST_GATEWAY_ADDRESS, etc.) <<<"

deploy-base-sepolia:
	CCIP_ROUTER=$(CCIP_ROUTER_BASE_SEPOLIA) LINK_TOKEN=$(LINK_TOKEN_BASE_SEPOLIA) \
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url $(BASE_SEPOLIA_RPC_URL) \
		--broadcast \
		--verify \
		-vvvv
	@echo ""
	@echo ">>> Copy deployed addresses into .env (DST_GATEWAY_ADDRESS, etc.) <<<"

# ── Configure CCIP ───────────────────────────────────────────────────

configure-ccip-sepolia:
	forge script script/ConfigureCCIP.s.sol:ConfigureCCIP \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--broadcast \
		-vvvv

configure-ccip-dest:
	forge script script/ConfigureCCIP.s.sol:ConfigureCCIP \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--broadcast \
		-vvvv

configure-ccip: configure-ccip-sepolia configure-ccip-dest

# ── Cross-chain Test Flow ────────────────────────────────────────────

test-crosschain-send:
	PHASE=1 forge script script/TestCrossChain.s.sol:TestCrossChain \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--broadcast \
		-vvvv

test-crosschain-verify:
	PHASE=2 forge script script/TestCrossChain.s.sol:TestCrossChain \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		-vvvv

test-crosschain: test-crosschain-send
	@echo ""
	@echo ">>> CCIP message sent. Wait 5-20 min, then run: make test-crosschain-verify <<<"

# ── Full Pipeline ────────────────────────────────────────────────────

deploy-all: deploy-sepolia
	@echo ""
	@echo ">>> Sepolia deployed. Now update .env with addresses and run: <<<"
	@echo ">>>   make deploy-arb-sepolia <<<"
	@echo ">>>   make configure-ccip     <<<"

# ── Setup Test Data (legacy, source chain only) ─────────────────────

setup-testdata:
	forge script script/SetupTestData.s.sol:SetupTestData \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--broadcast \
		-vvvv

# ── Verify Contracts ─────────────────────────────────────────────────

verify:
	forge verify-contract $(SRC_GATEWAY_ADDRESS) src/ComplianceGateway.sol:ComplianceGateway \
		--chain sepolia \
		--etherscan-api-key $(ETHERSCAN_API_KEY)
	forge verify-contract $(TOKEN_ADDRESS) src/ComplianceToken.sol:ComplianceToken \
		--chain sepolia \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--constructor-args $$(cast abi-encode "constructor(string,string,address)" "Compliant Bridge Token" "CBT" $(SRC_GATEWAY_ADDRESS))

# ── Deploy to Local Anvil ────────────────────────────────────────────

deploy-local:
	anvil &
	sleep 2
	CCIP_ROUTER=0x0000000000000000000000000000000000000001 \
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url http://127.0.0.1:8545 \
		--broadcast \
		--private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
		-vvvv

clean:
	forge clean
