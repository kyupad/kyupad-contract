MAKEFLAGS += --silent

# Include .env file if present
ifneq (,$(wildcard ./.env))
	include .env
  	export
endif

ido/build:
	./scripts/map-programid-to-env.sh
	anchor build -p kyupad_ido
	./scripts/map-programid-to-idl.sh

ido/deploy: ido/build
	anchor deploy -p kyupad_ido

ido/deploy/devnet: ido/build
	anchor deploy -p kyupad_ido --provider.cluster ${DEV_RPC_ENDPOINT}

ido/deploy/mainnet: ido/build
	anchor deploy -p kyupad_ido --provider.cluster ${MAIN_RPC_ENDPOINT}

ido/test: ido/build ido/deploy
	anchor run test-ido

ido/test/devnet: ido/build ido/deploy/devnet
	anchor run test-ido

nft/build:
	anchor build -p kyupad_smart_contract

run/test-node:
	rm -rf test-ledger
	solana-test-validator -r

reset:
	rm -rf target test-ledger
