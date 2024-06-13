import {AnchorProvider, BN, getProvider, IdlTypes, Program, setProvider, workspace,} from '@coral-xyz/anchor';
import {KyupadSmartContract} from '../target/types/kyupad_smart_contract';
import {
    AddressLookupTableProgram,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
} from '@solana/web3.js';
import {
    getMerkleTreeSize,
    getMetadataArgsSerializer,
    MetadataArgsArgs,
    MPL_BUBBLEGUM_PROGRAM_ID,
    SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    SPL_NOOP_PROGRAM_ID,
    TokenProgramVersion,
    TokenStandard,
} from '@metaplex-foundation/mpl-bubblegum';
import {generateWhiteList, sleep} from './utils';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import {expect} from "chai";
import {ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {DataV2Args, getDataV2Serializer} from "@metaplex-foundation/mpl-token-metadata";
import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";
import {publicKey} from "@metaplex-foundation/umi";

dotenv.config();

type PoolConfigArgs = IdlTypes<KyupadSmartContract>['poolConfigArgs'];
type InitCollectionConfigArgs =
    IdlTypes<KyupadSmartContract>['initCollectionConfigArgs'];
type UpdatePoolConfigArgs =
    IdlTypes<KyupadSmartContract>['updatePoolConfigArgs'];

describe('kyupad-smart-contract', () => {
    // Configure the client to use the local cluster.
    setProvider(AnchorProvider.env());

    const connection = getProvider().connection;

    const program = workspace.KyupadSmartContract as Program<KyupadSmartContract>;

    const anchorProvider = program.provider as AnchorProvider;

    const upgradableAuthority = Keypair.fromSecretKey(
        bs58.decode(
            process.env.PRIVATE_KEY!
        )
    );

    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
        'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    );

    const [collectionAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('update_authority')],
        program.programId
    );

    const destination = new PublicKey(
        '5aMGztMuSVPAp4nm6vrkU25BAho6gGxpWHnnaKZfiUHP'
    );

    const [bgumSigner] = PublicKey.findProgramAddressSync(
        [Buffer.from('collection_cpi', 'utf8')],
        new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID.toString())
    );

    xit('Init admin', async () => {
        const adminPubkey = Keypair.generate().publicKey

        const BPF_LOADER_PROGRAM = new PublicKey(
            'BPFLoaderUpgradeab1e11111111111111111111111'
        );

        const [kyupadProgramData] = PublicKey.findProgramAddressSync(
            [program.programId.toBuffer()],
            BPF_LOADER_PROGRAM
        );

        const initAdminIns = await program.methods
            .initAdmin(adminPubkey)
            .accounts({
                signer: upgradableAuthority.publicKey,
                kyupadProgramData: kyupadProgramData,
            })
            .instruction();

        const tx = new Transaction().add(initAdminIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        const sig = await connection.sendTransaction(tx, [upgradableAuthority]);

        console.log('Init admin: ', sig)

        await sleep(2000);

        const [adminPda] = PublicKey.findProgramAddressSync([Buffer.from('admin'), adminPubkey.toBuffer()], program.programId)
        const adminPdaData = await program.account.admin.fetch(adminPda)

        expect(adminPdaData.adminKey.toString()).to.eq(adminPubkey.toString())
    });

    xit('Create collection', async () => {
        const mint = Keypair.generate();

        const ata = getAssociatedTokenAddressSync(
            mint.publicKey,
            collectionAuthority,
            true
        );

        const [metadataAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata', 'utf8'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.publicKey.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        );

        const [masterEditionAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata', 'utf8'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.publicKey.toBuffer(),
                Buffer.from('edition', 'utf8'),
            ],
            TOKEN_METADATA_PROGRAM_ID
        );

        const metadata: DataV2Args = {
            name: 'KyuPad',
            symbol: ' ',
            uri: 'https://pbs.twimg.com/profile_images/1769690947384750081/d02M-XJA_400x400.jpg',
            sellerFeeBasisPoints: 100,
            creators: null,
            collection: null,
            uses: null,
        };

        const serialize = getDataV2Serializer();
        const data = serialize.serialize(metadata);

        const space = getMerkleTreeSize(14, 64);

        const treeKeypair = Keypair.generate();

        const [treeConfig, _bump] = PublicKey.findProgramAddressSync(
            [treeKeypair.publicKey.toBuffer()],
            new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY')
        );

        const createTreeAccountIx = SystemProgram.createAccount({
            fromPubkey: upgradableAuthority.publicKey,
            newAccountPubkey: treeKeypair.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(space),
            space: space,
            programId: new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'),
        });

        const createTreeConfigIx = await program.methods
            .createTreeConfig(14, 64, true, space)
            .accounts({
                creator: upgradableAuthority.publicKey,
                merkleTree: treeKeypair.publicKey,
                treeConfig: treeConfig,
                mplBubbleGumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
                compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                logWrapper: SPL_NOOP_PROGRAM_ID,
            })
            .instruction();

        let tx = new Transaction().add(createTreeAccountIx).add(createTreeConfigIx);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        const sig = await connection.sendTransaction(
            tx,
            [upgradableAuthority, treeKeypair],
            {maxRetries: 20, skipPreflight: true}
        );
        console.log('Your transaction create merkle tree', sig);

        const createCollectionIns = await program.methods
            .createCollection(Buffer.from(data))
            .accounts({
                creator: upgradableAuthority.publicKey,
                collectionTokenAccount: ata,
                metadata: metadataAccount,
                masterEdition: masterEditionAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                mint: mint.publicKey,
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .signers([mint])
            .instruction();

        const tx1 = new Transaction().add(createCollectionIns);

        tx1.feePayer = upgradableAuthority.publicKey;
        tx1.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx1.partialSign(upgradableAuthority);

        const sig1 = await connection.sendTransaction(
            tx1,
            [upgradableAuthority, mint],
            {maxRetries: 20, skipPreflight: true}
        );

        console.log('Your transaction create collection', sig1);
    });

    const prepareCollection = async () => {
        const mint = Keypair.generate();

        const ata = getAssociatedTokenAddressSync(
            mint.publicKey,
            collectionAuthority,
            true
        );

        const [metadataAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata', 'utf8'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.publicKey.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        );

        const [masterEditionAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata', 'utf8'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.publicKey.toBuffer(),
                Buffer.from('edition', 'utf8'),
            ],
            TOKEN_METADATA_PROGRAM_ID
        );

        const metadata: DataV2Args = {
            name: 'KyuPad',
            symbol: 'KPC',
            uri: 'https://pbs.twimg.com/profile_images/1769690947384750081/d02M-XJA_400x400.jpg',
            sellerFeeBasisPoints: 100,
            creators: null,
            collection: null,
            uses: null,
        };

        const serialize = getDataV2Serializer();
        const data = serialize.serialize(metadata);

        const space = getMerkleTreeSize(14, 64);

        const treeKeypair = Keypair.generate();

        const [treeConfig, _bump] = PublicKey.findProgramAddressSync(
            [treeKeypair.publicKey.toBuffer()],
            new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY')
        );

        const createTreeAccountIx = SystemProgram.createAccount({
            fromPubkey: upgradableAuthority.publicKey,
            newAccountPubkey: treeKeypair.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(space),
            space: space,
            programId: new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'),
        });

        const createTreeConfigIx = await program.methods
            .createTreeConfig(14, 64, true, space)
            .accounts({
                creator: upgradableAuthority.publicKey,
                merkleTree: treeKeypair.publicKey,
                treeConfig: treeConfig,
                mplBubbleGumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
                compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                logWrapper: SPL_NOOP_PROGRAM_ID,
            })
            .instruction();

        let tx = new Transaction().add(createTreeAccountIx).add(createTreeConfigIx);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        const sig = await connection.sendTransaction(
            tx,
            [upgradableAuthority, treeKeypair],
            {maxRetries: 20, skipPreflight: true}
        );
        console.log('Your transaction create merkle tree', sig);

        const createCollectionIns = await program.methods
            .createCollection(Buffer.from(data))
            .accounts({
                creator: upgradableAuthority.publicKey,
                collectionTokenAccount: ata,
                metadata: metadataAccount,
                masterEdition: masterEditionAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                mint: mint.publicKey,
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .signers([mint])
            .instruction();

        const tx1 = new Transaction().add(createCollectionIns);

        tx1.feePayer = upgradableAuthority.publicKey;
        tx1.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx1.partialSign(upgradableAuthority);

        const sig1 = await connection.sendTransaction(
            tx1,
            [upgradableAuthority, mint],
            {maxRetries: 20, skipPreflight: true}
        );

        console.log('Your transaction create collection', sig1);


        const [treeAuthority] = PublicKey.findProgramAddressSync(
            [treeKeypair.publicKey.toBuffer()],
            new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID.toString())
        );

        const [collectionMetadata] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.publicKey.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        );

        const [collectionMasterEditionAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata', 'utf8'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.publicKey.toBuffer(),
                Buffer.from('edition', 'utf8'),
            ],
            TOKEN_METADATA_PROGRAM_ID
        );

        const [poolsPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('pools'), mint.publicKey.toBuffer(),],
            program.programId
        );

        return {
            collectionMint: mint.publicKey,
            poolsPDA,
            treeAddress: treeKeypair.publicKey,
            treeAuthority,
            collectionMetadata,
            collectionMasterEditionAccount,
        }
    }

    xit('init_collection_config', async () => {
        const numberOfPools = 4;

        const {
            collectionMint,
            poolsPDA,
            treeAddress,
            treeAuthority,
            collectionMetadata,
            collectionMasterEditionAccount
        } = await prepareCollection()

        const creator = upgradableAuthority.publicKey;

        const [adminPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('admin'), creator.toBuffer()],
            program.programId
        );

        const data: InitCollectionConfigArgs = {
            maxMintOfWallet: 2,
        };

        const initCollectionConfigIns = await program.methods
            .initCollectionConfig(data)
            .accounts({
                creator: creator,
                collectionMint: collectionMint,
            })
            .instruction();

        // Init lookup table adđress
        const slot = await anchorProvider.connection.getSlot();

        // Add 2 instruction to create lookupTableAddress and saved lookupTableAddress
        const [createLookupTableIns, lookupTableAddress] =
            AddressLookupTableProgram.createLookupTable({
                authority: creator,
                payer: creator,
                recentSlot: slot,
            });

        const extendInstruction = AddressLookupTableProgram.extendLookupTable({
            payer: creator,
            authority: creator,
            lookupTable: lookupTableAddress,
            addresses: [
                new PublicKey(SPL_ACCOUNT_COMPRESSION_PROGRAM_ID.toString()),
                new PublicKey(SPL_NOOP_PROGRAM_ID.toString()),
                new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID.toString()),
                bgumSigner,
                TOKEN_METADATA_PROGRAM_ID,
                poolsPDA,
                treeAddress,
                treeAuthority,
                collectionMetadata,
                collectionMasterEditionAccount,
                collectionMint,
            ],
        });

        const tx = new Transaction()
            .add(initCollectionConfigIns)
            .add(createLookupTableIns)
            .add(extendInstruction);

        const sig = await anchorProvider.sendAndConfirm(tx, [], {
            skipPreflight: true,
        });

        console.log('Init collection config: ', sig);

        for (let i = 0; i < numberOfPools; i++) {
            let arrayWallet: string[] = [];
            if (i == numberOfPools - 1) {
                arrayWallet = whiteList;
            } else {
                arrayWallet = generateWhiteList(10);
            }

            const leafNode = arrayWallet.map((addr) => keccak256(addr));
            const merkleTree = new MerkleTree(leafNode, keccak256, {
                sortPairs: true,
            });

            const merkle_root = merkleTree.getRoot();

            const groupConfigArgs: PoolConfigArgs = {
                id: i.toString(),
                startDate: new BN(Math.floor(Date.now() / 1000)),
                endDate: new BN(Math.floor(Date.now() / 1000) + 3000),
                merkleRoot: merkle_root,
                totalMintPerWallet: 1,
                payment: 0.01,
                poolSupply: 10000,
                exclusionPools: null,
            };

            if (i == numberOfPools - 1) {
                groupConfigArgs.exclusionPools = ['0', '1', '2'];
            }

            const [poolMinted] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('pool_minted'),
                    poolsPDA.toBuffer(),
                    Buffer.from(i.toString()),
                ],
                program.programId
            );

            const txAddPoolConfig = await program.methods
                .addPoolConfig(groupConfigArgs)
                .accounts({
                    creator: creator,
                    collectionMint: collectionMint,
                    destination: destination,
                })
                .rpc({
                    skipPreflight: true,
                });

            console.log('Add pool config: ', txAddPoolConfig);
        }
    });

    const prepareConfig = async () => {
        const numberOfPools = 4;

        const {
            collectionMint,
            poolsPDA,
            treeAddress,
            treeAuthority,
            collectionMetadata,
            collectionMasterEditionAccount
        } = await prepareCollection()

        const creator = upgradableAuthority.publicKey;

        const [adminPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('admin'), creator.toBuffer()],
            program.programId
        );

        const data: InitCollectionConfigArgs = {
            maxMintOfWallet: 2,
        };

        const initCollectionConfigIns = await program.methods
            .initCollectionConfig(data)
            .accounts({
                creator: creator,
                collectionMint: collectionMint,
            })
            .instruction();

        // Init lookup table adđress
        const slot = await anchorProvider.connection.getSlot();

        // Add 2 instruction to create lookupTableAddress and saved lookupTableAddress
        const [createLookupTableIns, lookupTableAddress] =
            AddressLookupTableProgram.createLookupTable({
                authority: creator,
                payer: creator,
                recentSlot: slot,
            });

        const extendInstruction = AddressLookupTableProgram.extendLookupTable({
            payer: creator,
            authority: creator,
            lookupTable: lookupTableAddress,
            addresses: [
                new PublicKey(SPL_ACCOUNT_COMPRESSION_PROGRAM_ID.toString()),
                new PublicKey(SPL_NOOP_PROGRAM_ID.toString()),
                new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID.toString()),
                bgumSigner,
                TOKEN_METADATA_PROGRAM_ID,
                poolsPDA,
                treeAddress,
                treeAuthority,
                collectionMetadata,
                collectionMasterEditionAccount,
                collectionMint,
            ],
        });

        const tx = new Transaction()
            .add(initCollectionConfigIns)


        const sig = await anchorProvider.sendAndConfirm(tx, [], {
            skipPreflight: true,
        });

        console.log('Init collection config: ', sig);

        const createLookupTableTx = new Transaction().add(createLookupTableIns)
            .add(extendInstruction);


        const createLookupTableSig = await anchorProvider.sendAndConfirm(createLookupTableTx, [], {
            skipPreflight: true,
        });

        console.log('Create lookup table: ', createLookupTableSig);

        for (let i = 0; i < numberOfPools; i++) {
            let arrayWallet: string[] = [];
            if (i == numberOfPools - 1) {
                arrayWallet = whiteList;
            } else {
                arrayWallet = generateWhiteList(10);
            }

            const leafNode = arrayWallet.map((addr) => keccak256(addr));
            const merkleTree = new MerkleTree(leafNode, keccak256, {
                sortPairs: true,
            });

            const merkle_root = merkleTree.getRoot();

            const groupConfigArgs: PoolConfigArgs = {
                id: i.toString(),
                startDate: new BN(Math.floor(Date.now() / 1000)),
                endDate: new BN(Math.floor(Date.now() / 1000) + 3000),
                merkleRoot: merkle_root,
                totalMintPerWallet: 1,
                payment: 0.01,
                poolSupply: 10000,
                exclusionPools: null,
            };

            if (i == numberOfPools - 1) {
                groupConfigArgs.exclusionPools = ['0', '1', '2'];
            }

            const txAddPoolConfig = await program.methods
                .addPoolConfig(groupConfigArgs)
                .accounts({
                    creator: creator,
                    collectionMint: collectionMint,
                    destination: destination,
                })
                .rpc({
                    skipPreflight: true,
                });

            console.log('Add pool config: ', txAddPoolConfig);
        }

        return {
            collectionMint,
            poolsPDA,
            treeAddress,
            treeAuthority,
            collectionMetadata,
            collectionMasterEditionAccount,
            lookupTableAddress,
            numberOfPools
        }
    }

    xit('mint cNFT', async () => {
        const {
            collectionMint,
            poolsPDA,
            treeAddress,
            treeAuthority,
            collectionMetadata,
            collectionMasterEditionAccount,
            lookupTableAddress,
            numberOfPools
        } = await prepareConfig()

        const minter = upgradableAuthority.publicKey

        // Add your test here.
        const leafNode = whiteList.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {sortPairs: true});


        const getProof = merkleTree.getProof(keccak256(whiteList[whiteList.indexOf(minter.toString())]));

        const merkle_proof = getProof.map((item) => Array.from(item.data));

        // Mint a compressed NFT
        const nftArgs: MetadataArgsArgs = {
            name: 'Compression Test',
            symbol: 'COMP',
            uri: 'https://arweave.net/gfO_TkYttQls70pTmhrdMDz9pfMUXX8hZkaoIivQjGs',
            creators: [], //
            editionNonce: 253,
            tokenProgramVersion: TokenProgramVersion.Original,
            tokenStandard: TokenStandard.NonFungible,
            uses: null,
            primarySaleHappened: false,
            sellerFeeBasisPoints: 0, //
            isMutable: false,
            collection: {
                verified: true,
                key: publicKey(collectionMint.toString()),
            },
        };

        const serializer = getMetadataArgsSerializer();

        const data = serializer.serialize(nftArgs);

        const MPL_BUBBLEGUM_PROGRAM_ID = new PublicKey(
            'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
        );

        const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
            'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
        );

        const pool_id = String(numberOfPools - 1);

        const [poolMinted] = PublicKey.findProgramAddressSync(
            [Buffer.from('pool_minted'), poolsPDA.toBuffer(), Buffer.from(pool_id)],
            program.programId
        );


        const [mintCounter] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('mint_counter'),
                Buffer.from(pool_id),
                minter.toBuffer(),
                poolsPDA.toBuffer(),
            ],
            program.programId
        );

        const pools_config_data: any[] = (
            await program.account.pools.fetch(poolsPDA)
        ).poolsConfig;

        const remainingAccounts = [
            {
                pubkey: mintCounter,
                isWritable: true,
                isSigner: false,
            },
        ];

        pools_config_data.forEach((pool_config) => {
            if (pool_config.id === pool_id) {
                if (pool_config.exclusionPools) {
                    pool_config.exclusionPools.forEach((pool_id_exl: string) => {
                        const [poolMintedPDA] = PublicKey.findProgramAddressSync(
                            [
                                Buffer.from('mint_counter'),
                                Buffer.from(pool_id_exl),
                                minter.toBuffer(),
                                poolsPDA.toBuffer(),
                            ],
                            program.programId
                        );

                        remainingAccounts.push({
                            pubkey: poolMintedPDA,
                            isWritable: false,
                            isSigner: false,
                        });
                    });
                }
            }
        });

        // get the table from the cluster
        const lookupTableAccount = (
            await anchorProvider.connection.getAddressLookupTable(lookupTableAddress)
        ).value;

        const mintCnftIns = await program.methods
            .mintCnft(merkle_proof, pool_id, Buffer.from(data))
            .accounts({
                minter: minter,
                destination: destination,
                poolMinted: poolMinted,
                merkleTree: treeAddress,
                treeAuthority,
                compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                logWrapper: SPL_NOOP_PROGRAM_ID,
                collectionAuthority: collectionAuthority,
                collectionAuthorityRecordPda: MPL_BUBBLEGUM_PROGRAM_ID,
                collectionMint: collectionMint,
                collectionMetadata: collectionMetadata,
                editionAccount: collectionMasterEditionAccount,
                bubblegumSigner: bgumSigner,
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            })
            .remainingAccounts(remainingAccounts)
            .instruction()

        // construct a v0 compatible transaction `Message`
        const messageV0 = new TransactionMessage({
            payerKey: minter,
            recentBlockhash: (await anchorProvider.connection.getLatestBlockhash())
                .blockhash,
            instructions: [mintCnftIns], // note this is an array of instructions
        }).compileToV0Message([lookupTableAccount]);

        const transactionV0 = new VersionedTransaction(messageV0);

        const sig = await anchorProvider.sendAndConfirm(transactionV0, [], {
            skipPreflight: true,
        });

        console.log('Mint cNFT: ', sig);
    });

    it('airdrop', async () => {
        const {
            collectionMint,
            treeAddress,
            treeAuthority,
            collectionMetadata,
            collectionMasterEditionAccount,
            lookupTableAddress,
        } = await prepareConfig()

        // Mint a compressed NFT
        const nftArgs: MetadataArgsArgs = {
            name: 'Compression Test',
            symbol: 'COMP',
            uri: 'https://arweave.net/gfO_TkYttQls70pTmhrdMDz9pfMUXX8hZkaoIivQjGs',
            creators: [], //
            editionNonce: 253,
            tokenProgramVersion: TokenProgramVersion.Original,
            tokenStandard: TokenStandard.NonFungible,
            uses: null,
            primarySaleHappened: false,
            sellerFeeBasisPoints: 0, //
            isMutable: false,
            collection: {
                verified: true,
                key: publicKey(collectionMint.toString()),
            },
        };

        const serializer = getMetadataArgsSerializer();

        const data = serializer.serialize(nftArgs);

        const length = 3
        const airdropInsArray: TransactionInstruction[] = []

        for (let i = 0; i < length; i++) {
            const airdropIns = await program.methods.airdrop(Buffer.from(data)).accounts({
                admin: upgradableAuthority.publicKey,
                minter: Keypair.generate().publicKey,
                merkleTree: treeAddress,
                treeAuthority,
                compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                logWrapper: SPL_NOOP_PROGRAM_ID,
                collectionAuthority: collectionAuthority,
                collectionAuthorityRecordPda: MPL_BUBBLEGUM_PROGRAM_ID,
                collectionMint: collectionMint,
                collectionMetadata: collectionMetadata,
                editionAccount: collectionMasterEditionAccount,
                bubblegumSigner: bgumSigner,
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,

            }).instruction()

            airdropInsArray.push(airdropIns)
        }

        // get the table from the cluster
        const lookupTableAccount = (
            await anchorProvider.connection.getAddressLookupTable(lookupTableAddress)
        ).value;

        // construct a v0 compatible transaction `Message`
        const messageV0 = new TransactionMessage({
            payerKey: upgradableAuthority.publicKey,
            recentBlockhash: (await anchorProvider.connection.getLatestBlockhash())
                .blockhash,
            instructions: airdropInsArray, // note this is an array of instructions
        }).compileToV0Message([lookupTableAccount]);
        const transactionV0 = new VersionedTransaction(messageV0);
        const sig = await anchorProvider.sendAndConfirm(transactionV0, []);

        console.log('Airdrop: ', sig)
    })
});

const whiteList = [
    'BKvnc194znZseFCN74wLSFAe1p55m4uzPkHxt1uHHw2s',
    '4dhkDcSPosrhXS9ySoaFVcVzbDFJCH7titzkJQpnUKX2',
    'CVPSR4RbxnHsUSo9PGjVRQJYWvNZADXExe54YMMuvRt9',
    '5aMGztMuSVPAp4nm6vrkU25BAho6gGxpWHnnaKZfiUHP',
    '7Xhh9UuTmy7g1n4gs4DLP3AV7KzGPJRm897cijJhKuhd',
    'CSEgkPVv75HXeG3AWL2Jsm9naTGYioU8TZipDSmgYzmz',
    'DrBh1v9AVDp2CpZkXT87ATK74QynHJAJ2Pf6wXq2DZ5u',
    'Fxu7o9k8BKKAJyD94UfESH9sMrEFtoXtRRbQiiUFD1pv'
];
