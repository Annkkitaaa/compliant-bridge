-include .env

.PHONY: build test deploy-sepolia setup-testdata verify clean

# Build & Test
build:
	forge build

test:
	forge test -vvv

test-gas:
	forge test --gas-report

# Deploy to Sepolia
deploy-sepolia:
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url sepolia \
		--broadcast \
		--verify \
		-vvvv
	@echo ""
	@echo ">>> Copy the deployed addresses into your .env file <<<"

# Setup test attestations (run after deploy, after setting GATEWAY_ADDRESS in .env)
setup-testdata:
	forge script script/SetupTestData.s.sol:SetupTestData \
		--rpc-url sepolia \
		--broadcast \
		-vvvv

# Verify contracts on Etherscan (if --verify flag didn't work during deploy)
verify:
	forge verify-contract $(GATEWAY_ADDRESS) src/ComplianceGateway.sol:ComplianceGateway \
		--chain sepolia \
		--etherscan-api-key $(ETHERSCAN_API_KEY)
	forge verify-contract $(TOKEN_ADDRESS) src/ComplianceToken.sol:ComplianceToken \
		--chain sepolia \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--constructor-args $$(cast abi-encode "constructor(string,string,address)" "Compliant Bridge Token" "CBT" $(GATEWAY_ADDRESS))
	forge verify-contract $(REGULATOR_VIEW_ADDRESS) src/RegulatorView.sol:RegulatorView \
		--chain sepolia \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--constructor-args $$(cast abi-encode "constructor(address)" $(GATEWAY_ADDRESS))

# Deploy to local Anvil for testing
deploy-local:
	anvil &
	sleep 2
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url http://127.0.0.1:8545 \
		--broadcast \
		--private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
		-vvvv

clean:
	forge clean
