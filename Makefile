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

ido/solana/deploy:
	anchor build -p kyupad_ido
	./scripts/map-programid-from-env.sh
	solana program deploy ./target/deploy/kyupad_ido.so --program-id ${IDO_PROGRAM_ID}

ido/solana/build:
	anchor build -p kyupad_ido
	./scripts/map-programid-from-env.sh

mint/solana/build:
	anchor build -p kyupad_smart_contract
	./scripts/map-programid-from-env.sh