"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const mpl_bubblegum_1 = require("@metaplex-foundation/mpl-bubblegum");
const web3_js_2 = require("@solana/web3.js");
const utils_1 = require("./utils");
const bs58_1 = __importDefault(require("bs58"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
describe('kyupad-smart-contract', () => {
    // Configure the client to use the local cluster.
    (0, anchor_1.setProvider)(anchor_1.AnchorProvider.env());
    const connection = (0, anchor_1.getProvider)().connection;
    const program = anchor_1.workspace.KyupadSmartContract;
    const upgradableAuthority = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode('54nzB48avij9raLKLYUVyPvD6HnbiYT1hKFqvJ26NXGorx8kLvWanorjX13cQWSV8nRCA9xVV5MdZGXrLZEGspAv'));
    const TOKEN_METADATA_PROGRAM_ID = new web3_js_2.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    const collectionMint = new web3_js_2.PublicKey('GxqkJ9TcG7qzfRE61LZe53DJRgLapdaLNW4BqNNBauHH');
    const treeAddress = new web3_js_2.PublicKey('45hUwqhpMwLvpBkhaTekvKiEzcPE2SePeLK3K2qpaYFE');
    const [treeAuthority, _bump] = web3_js_2.PublicKey.findProgramAddressSync([treeAddress.toBuffer()], new web3_js_2.PublicKey(mpl_bubblegum_1.MPL_BUBBLEGUM_PROGRAM_ID.toString()));
    const [collectionMetadata] = web3_js_2.PublicKey.findProgramAddressSync([
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
    ], TOKEN_METADATA_PROGRAM_ID);
    const [collectionMasterEditionAccount] = web3_js_2.PublicKey.findProgramAddressSync([
        Buffer.from('metadata', 'utf8'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
        Buffer.from('edition', 'utf8'),
    ], TOKEN_METADATA_PROGRAM_ID);
    const [poolsPDA] = web3_js_2.PublicKey.findProgramAddressSync([Buffer.from('pools'), collectionMint.toBuffer()], program.programId);
    const [collectionAuthority] = web3_js_2.PublicKey.findProgramAddressSync([Buffer.from('update_authority')], program.programId);
    const destination = new web3_js_2.PublicKey('5aMGztMuSVPAp4nm6vrkU25BAho6gGxpWHnnaKZfiUHP');
    const [bgumSigner] = web3_js_2.PublicKey.findProgramAddressSync([Buffer.from('collection_cpi', 'utf8')], new web3_js_2.PublicKey(mpl_bubblegum_1.MPL_BUBBLEGUM_PROGRAM_ID.toString()));
    xit('Init admin', () => __awaiter(void 0, void 0, void 0, function* () {
        const adminPubkey = new web3_js_2.PublicKey('CY92ruXbHmeaNiGqaZ9mXnXFPTjgfq2pHDuoM5VgWY1V');
        const BPF_LOADER_PROGRAM = new web3_js_2.PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
        const [kyupadProgramData] = web3_js_2.PublicKey.findProgramAddressSync([program.programId.toBuffer()], BPF_LOADER_PROGRAM);
        const initAdminIns = yield program.methods
            .initAdmin(adminPubkey)
            .accounts({
            signer: upgradableAuthority.publicKey,
            kyupadProgramData: kyupadProgramData,
        })
            .instruction();
        const tx = new web3_js_1.Transaction().add(initAdminIns);
        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
        tx.partialSign(upgradableAuthority);
        const sig = yield connection.sendTransaction(tx, [upgradableAuthority], {
            maxRetries: 20,
            skipPreflight: true,
        });
        yield (0, utils_1.sleep)(2000);
        console.log('Init admin', sig);
    }));
    //   xit('Create collection', async () => {
    //     const mint = Keypair.generate();
    //     const ata = getAssociatedTokenAddressSync(
    //       mint.publicKey,
    //       collectionAuthority,
    //       true
    //     );
    //     const [metadataAccount] = PublicKey.findProgramAddressSync(
    //       [
    //         Buffer.from('metadata', 'utf8'),
    //         TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    //         mint.publicKey.toBuffer(),
    //       ],
    //       TOKEN_METADATA_PROGRAM_ID
    //     );
    //     const [masterEditionAccount] = PublicKey.findProgramAddressSync(
    //       [
    //         Buffer.from('metadata', 'utf8'),
    //         TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    //         mint.publicKey.toBuffer(),
    //         Buffer.from('edition', 'utf8'),
    //       ],
    //       TOKEN_METADATA_PROGRAM_ID
    //     );
    //     const metadata: DataV2Args = {
    //       name: 'KyuPad',
    //       symbol: ' ',
    //       uri: 'https://pbs.twimg.com/profile_images/1769690947384750081/d02M-XJA_400x400.jpg',
    //       sellerFeeBasisPoints: 100,
    //       creators: null,
    //       collection: null,
    //       uses: null,
    //     };
    //     const serialize = getDataV2Serializer();
    //     const data = serialize.serialize(metadata);
    //     const space = getMerkleTreeSize(14, 64);
    //     const treeKeypair = Keypair.generate();
    //     const [treeConfig, _bump] = PublicKey.findProgramAddressSync(
    //       [treeKeypair.publicKey.toBuffer()],
    //       new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY')
    //     );
    //     const createTreeAccountIx = SystemProgram.createAccount({
    //       fromPubkey: upgradableAuthority.publicKey,
    //       newAccountPubkey: treeKeypair.publicKey,
    //       lamports: await connection.getMinimumBalanceForRentExemption(space),
    //       space: space,
    //       programId: new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'),
    //     });
    //     const [adminPda] = PublicKey.findProgramAddressSync(
    //       [Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()],
    //       program.programId
    //     );
    //     const createTreeConfigIx = await program.methods
    //       .createTreeConfig(14, 64, true, space)
    //       .accounts({
    //         creator: upgradableAuthority.publicKey,
    //         adminPda: adminPda,
    //         merkleTree: treeKeypair.publicKey,
    //         treeConfig: treeConfig,
    //         mplBubbleGumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
    //         compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    //         logWrapper: SPL_NOOP_PROGRAM_ID,
    //         updateAuthority: collectionAuthority,
    //         systemProgram: SystemProgram.programId,
    //       })
    //       .instruction();
    //     let tx = new Transaction().add(createTreeAccountIx).add(createTreeConfigIx);
    //     tx.feePayer = upgradableAuthority.publicKey;
    //     tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    //     tx.partialSign(upgradableAuthority);
    //     const sig = await connection.sendTransaction(
    //       tx,
    //       [upgradableAuthority, treeKeypair],
    //       { maxRetries: 20, skipPreflight: true }
    //     );
    //     console.log('Your transaction create merkle tree', sig);
    //     const createCollectionIns = await program.methods
    //       .createCollection(Buffer.from(data))
    //       .accounts({
    //         creator: upgradableAuthority.publicKey,
    //         adminPda: adminPda,
    //         collectionTokenAccount: ata,
    //         metadata: metadataAccount,
    //         masterEdition: masterEditionAccount,
    //         tokenProgram: TOKEN_PROGRAM_ID,
    //         mint: mint.publicKey,
    //         updateAuthority: collectionAuthority,
    //         tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //         systemProgram: SystemProgram.programId,
    //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    //       })
    //       .signers([mint])
    //       .instruction();
    //     const tx1 = new Transaction().add(createCollectionIns);
    //     tx1.feePayer = upgradableAuthority.publicKey;
    //     tx1.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    //     tx1.partialSign(upgradableAuthority);
    //     const sig1 = await connection.sendTransaction(
    //       tx1,
    //       [upgradableAuthority, mint],
    //       { maxRetries: 20, skipPreflight: true }
    //     );
    //     console.log('Your transaction create collection', sig1);
    //   });
    // it('init_collection_config', async () => {
    //   const numberOfPools = 4;
    //   const [adminPda] = PublicKey.findProgramAddressSync(
    //     [Buffer.from('admin'), minter.toBuffer()],
    //     program.programId
    //   );
    //   const data: InitCollectionConfigArgs = {
    //     maxMintOfWallet: 2,
    //   };
    //   const initCollectionConfigIns = await program.methods
    //     .initCollectionConfig(data)
    //     .accounts({
    //       creator: minter,
    //       collectionMint: collectionMint,
    //       pools: poolsPDA,
    //       adminPda: adminPda,
    //     })
    //     .instruction();
    //   // Init lookup table adđress
    //   const slot = await anchorProvider.connection.getSlot();
    //   // Add 2 instruction to create lookupTableAddress and saved lookupTableAddress
    //   const [createLookupTableIns, lookupTableAddress] =
    //     AddressLookupTableProgram.createLookupTable({
    //       authority: minter,
    //       payer: minter,
    //       recentSlot: slot,
    //     });
    //   const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    //     payer: minter,
    //     authority: minter,
    //     lookupTable: lookupTableAddress,
    //     addresses: [
    //       new PublicKey(SPL_ACCOUNT_COMPRESSION_PROGRAM_ID.toString()),
    //       new PublicKey(SPL_NOOP_PROGRAM_ID.toString()),
    //       new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID.toString()),
    //       bgumSigner,
    //       TOKEN_METADATA_PROGRAM_ID,
    //       poolsPDA,
    //       treeAddress,
    //       treeAuthority,
    //       collectionMetadata,
    //       collectionMasterEditionAccount,
    //       collectionMint,
    //     ],
    //   });
    //   const tx = new Transaction()
    //     .add(initCollectionConfigIns)
    //     .add(createLookupTableIns)
    //     .add(extendInstruction);
    //   const sig = await anchorProvider.sendAndConfirm(tx, [], {
    //     skipPreflight: true,
    //   });
    //   console.log('Init collection config: ', sig);
    //   for (let i = 0; i < numberOfPools; i++) {
    //     let arrayWallet: string[] = [];
    //     if (i == numberOfPools - 1) {
    //       arrayWallet = whiteList;
    //     } else {
    //       arrayWallet = generateWhiteList(10);
    //     }
    //     const leafNode = arrayWallet.map((addr) => keccak256(addr));
    //     const merkleTree = new MerkleTree(leafNode, keccak256, {
    //       sortPairs: true,
    //     });
    //     const merkle_root = merkleTree.getRoot();
    //     const groupConfigArgs: PoolConfigArgs = {
    //       id: i.toString(),
    //       startDate: new BN(Math.floor(Date.now() / 1000)),
    //       endDate: new BN(Math.floor(Date.now() / 1000) + 3000),
    //       merkleRoot: merkle_root,
    //       totalMintPerWallet: 1,
    //       payment: 0.01,
    //       poolSupply: 10000,
    //       exclusionPools: null,
    //     };
    //     if (i == numberOfPools - 1) {
    //       groupConfigArgs.exclusionPools = ['0', '1', '2'];
    //     }
    //     const [poolMinted] = PublicKey.findProgramAddressSync(
    //       [
    //         Buffer.from('pool_minted'),
    //         poolsPDA.toBuffer(),
    //         Buffer.from(i.toString()),
    //       ],
    //       program.programId
    //     );
    //     const txAddPoolConfig = await program.methods
    //       .addPoolConfig(groupConfigArgs)
    //       .accounts({
    //         creator: minter,
    //         collectionMint: collectionMint,
    //         pools: poolsPDA,
    //         poolMinted: poolMinted,
    //         adminPda: adminPda,
    //         destination: destination,
    //       })
    //       .rpc({
    //         skipPreflight: true,
    //       });
    //     console.log('Add pool config: ', txAddPoolConfig);
    //   }
    // });
    // it('update_pool_config', async () => {
    //   const [adminPda] = PublicKey.findProgramAddressSync(
    //     [Buffer.from('admin'), minter.toBuffer()],
    //     program.programId
    //   );
    //   let arrayWallet = generateWhiteList(20);
    //   arrayWallet.push(minter.toString());
    //   const leafNode = arrayWallet.map((addr) => keccak256(addr));
    //   const merkleTree = new MerkleTree(leafNode, keccak256, {
    //     sortPairs: true,
    //   });
    //   const args: UpdatePoolConfigArgs = {
    //     poolId: '2',
    //     merkleRoot: merkleTree.getRoot(),
    //     totalPoolSupply: null,
    //   };
    //   const tx = await program.methods
    //     .updatePoolConfig(args)
    //     .accounts({
    //       signer: minter,
    //       adminPda: adminPda,
    //       collectionMint: collectionMint,
    //       pools: poolsPDA,
    //     })
    //     .rpc({
    //       skipPreflight: true,
    //     });
    //   console.log('Update pool config: ', tx);
    // });
    // it('mint cNFT', async () => {
    //   // Add your test here.
    //   const leafNode = whiteList.map((addr) => keccak256(addr));
    //   const merkleTree = new MerkleTree(leafNode, keccak256, { sortPairs: true });
    //   const getProof = merkleTree.getProof(keccak256(whiteList[3]));
    //   const merkle_proof = getProof.map((item) => Array.from(item.data));
    //   // Mint a compressed NFT
    //   const nftArgs: MetadataArgsArgs = {
    //     name: 'Compression Test',
    //     symbol: 'COMP',
    //     uri: 'https://arweave.net/gfO_TkYttQls70pTmhrdMDz9pfMUXX8hZkaoIivQjGs',
    //     creators: [], //
    //     editionNonce: 253,
    //     tokenProgramVersion: TokenProgramVersion.Original,
    //     tokenStandard: TokenStandard.NonFungible,
    //     uses: null,
    //     primarySaleHappened: false,
    //     sellerFeeBasisPoints: 0, //
    //     isMutable: false,
    //     collection: {
    //       verified: true,
    //       key: publicKey(collectionMint.toString()),
    //     },
    //   };
    //   const serializer = getMetadataArgsSerializer();
    //   const data = serializer.serialize(nftArgs);
    //   const MPL_BUBBLEGUM_PROGRAM_ID = new PublicKey(
    //     'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
    //   );
    //   const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    //     'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    //   );
    //   const pool_id = '3';
    //   const [poolMinted] = PublicKey.findProgramAddressSync(
    //     [Buffer.from('pool_minted'), poolsPDA.toBuffer(), Buffer.from(pool_id)],
    //     program.programId
    //   );
    //   const [mintCounter] = PublicKey.findProgramAddressSync(
    //     [
    //       Buffer.from('mint_counter'),
    //       Buffer.from(pool_id),
    //       minter.toBuffer(),
    //       poolsPDA.toBuffer(),
    //     ],
    //     program.programId
    //   );
    //   const pools_config_data: any[] = (
    //     await program.account.pools.fetch(poolsPDA)
    //   ).poolsConfig;
    //   console.log(pools_config_data);
    //   const remainingAccounts = [
    //     {
    //       pubkey: mintCounter,
    //       isWritable: true,
    //       isSigner: false,
    //     },
    //   ];
    //   pools_config_data.forEach((pool_config) => {
    //     if (pool_config.id === pool_id) {
    //       if (pool_config.exclusionPools) {
    //         pool_config.exclusionPools.forEach((pool_id_exl: string) => {
    //           const [poolMintedPDA] = PublicKey.findProgramAddressSync(
    //             [
    //               Buffer.from('mint_counter'),
    //               Buffer.from(pool_id_exl),
    //               minter.toBuffer(),
    //               poolsPDA.toBuffer(),
    //             ],
    //             program.programId
    //           );
    //           remainingAccounts.push({
    //             pubkey: poolMintedPDA,
    //             isWritable: false,
    //             isSigner: false,
    //           });
    //         });
    //       }
    //     }
    //   });
    //   const [mintCounterCollection] = PublicKey.findProgramAddressSync(
    //     [
    //       Buffer.from('mint_counter_collection'),
    //       minter.toBuffer(),
    //       collectionMint.toBuffer(),
    //     ],
    //     program.programId
    //   );
    //   const lookupTableAddress = new PublicKey(
    //     '7E9QK9cgbQLr4LGTek3NpxNCcbdbkNCR3oT3JCwK5yHa'
    //   );
    //   // get the table from the cluster
    //   const lookupTableAccount = (
    //     await anchorProvider.connection.getAddressLookupTable(lookupTableAddress)
    //   ).value;
    //   const mintCnftIns = await program.methods
    //     .mintCnft(merkle_proof, pool_id, Buffer.from(data))
    //     .accounts({
    //       minter: minter,
    //       pools: poolsPDA,
    //       mintCounterCollection: mintCounterCollection,
    //       destination: destination,
    //       poolMinted: poolMinted,
    //       merkleTree: treeAddress,
    //       treeAuthority,
    //       compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    //       logWrapper: SPL_NOOP_PROGRAM_ID,
    //       collectionAuthority: collectionAuthority,
    //       collectionAuthorityRecordPda: MPL_BUBBLEGUM_PROGRAM_ID,
    //       collectionMint: collectionMint,
    //       collectionMetadata: collectionMetadata,
    //       editionAccount: collectionMasterEditionAccount,
    //       bubblegumSigner: bgumSigner,
    //       tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //     })
    //     .remainingAccounts(remainingAccounts)
    //     .instruction();
    //   // construct a v0 compatible transaction `Message`
    //   const messageV0 = new TransactionMessage({
    //     payerKey: minter,
    //     recentBlockhash: (await anchorProvider.connection.getLatestBlockhash())
    //       .blockhash,
    //     instructions: [mintCnftIns], // note this is an array of instructions
    //   }).compileToV0Message([lookupTableAccount]);
    //   const transactionV0 = new VersionedTransaction(messageV0);
    //   const sig = await anchorProvider.sendAndConfirm(transactionV0, [], {
    //     skipPreflight: true,
    //   });
    //   console.log('Mint cNFT: ', sig);
    // });
    // it('update_pool_config and try to mint', async () => {
    //   const [adminPda] = PublicKey.findProgramAddressSync(
    //     [Buffer.from('admin'), minter.toBuffer()],
    //     program.programId
    //   );
    //   let arrayWallet = generateWhiteList(20);
    //   arrayWallet.push(minter.toString());
    //   const leafNode = arrayWallet.map((addr) => keccak256(addr));
    //   const merkleTree = new MerkleTree(leafNode, keccak256, {
    //     sortPairs: true,
    //   });
    //   const pool_id = '0';
    //   const args: UpdatePoolConfigArgs = {
    //     poolId: pool_id,
    //     merkleRoot: merkleTree.getRoot(),
    //     totalPoolSupply: null,
    //   };
    //   const tx = await program.methods
    //     .updatePoolConfig(args)
    //     .accounts({
    //       signer: minter,
    //       adminPda: adminPda,
    //       collectionMint: collectionMint,
    //       pools: poolsPDA,
    //     })
    //     .rpc({
    //       skipPreflight: true,
    //     });
    //   console.log('Update pool config: ', tx);
    //   const getProof = merkleTree.getProof(keccak256(minter.toString()));
    //   const merkle_proof = getProof.map((item) => Array.from(item.data));
    //   // Mint a compressed NFT
    //   const nftArgs: MetadataArgsArgs = {
    //     name: 'Compression Test',
    //     symbol: 'COMP',
    //     uri: 'https://arweave.net/gfO_TkYttQls70pTmhrdMDz9pfMUXX8hZkaoIivQjGs',
    //     creators: [],
    //     editionNonce: 253,
    //     tokenProgramVersion: TokenProgramVersion.Original,
    //     tokenStandard: TokenStandard.NonFungible,
    //     uses: null,
    //     primarySaleHappened: false,
    //     sellerFeeBasisPoints: 0,
    //     isMutable: false,
    //     collection: {
    //       verified: false,
    //       key: publicKey(collectionMint.toString()),
    //     },
    //   };
    //   const serializer = getMetadataArgsSerializer();
    //   const data = serializer.serialize(nftArgs);
    //   const MPL_BUBBLEGUM_PROGRAM_ID = new PublicKey(
    //     'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
    //   );
    //   const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    //     'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    //   );
    //   const [poolMinted] = PublicKey.findProgramAddressSync(
    //     [Buffer.from('pool_minted'), poolsPDA.toBuffer(), Buffer.from(pool_id)],
    //     program.programId
    //   );
    //   const [mintCounter] = PublicKey.findProgramAddressSync(
    //     [
    //       Buffer.from('mint_counter'),
    //       Buffer.from(pool_id),
    //       minter.toBuffer(),
    //       poolsPDA.toBuffer(),
    //     ],
    //     program.programId
    //   );
    //   const pools_config_data: any[] = (
    //     await program.account.pools.fetch(poolsPDA)
    //   ).poolsConfig;
    //   const remainingAccounts = [
    //     {
    //       pubkey: mintCounter,
    //       isWritable: true,
    //       isSigner: false,
    //     },
    //   ];
    //   pools_config_data.forEach((pool_config) => {
    //     if (pool_config.id === pool_id) {
    //       if (pool_config.exclusionPools) {
    //         pool_config.exclusionPools.forEach((pool_id_exl: string) => {
    //           const [poolMintedPDA] = PublicKey.findProgramAddressSync(
    //             [
    //               Buffer.from('mint_counter'),
    //               Buffer.from(pool_id_exl),
    //               minter.toBuffer(),
    //               poolsPDA.toBuffer(),
    //             ],
    //             program.programId
    //           );
    //           remainingAccounts.push({
    //             pubkey: poolMintedPDA,
    //             isWritable: false,
    //             isSigner: false,
    //           });
    //         });
    //       }
    //     }
    //   });
    //   const [mintCounterCollection] = PublicKey.findProgramAddressSync(
    //     [
    //       Buffer.from('mint_counter_collection'),
    //       minter.toBuffer(),
    //       collectionMint.toBuffer(),
    //     ],
    //     program.programId
    //   );
    //   const lookupTableAddress = new PublicKey(
    //     '7E9QK9cgbQLr4LGTek3NpxNCcbdbkNCR3oT3JCwK5yHa'
    //   );
    //   // get the table from the cluster
    //   const lookupTableAccount = (
    //     await anchorProvider.connection.getAddressLookupTable(lookupTableAddress)
    //   ).value;
    //   const mintCnftIns = await program.methods
    //     .mintCnft(merkle_proof, pool_id, Buffer.from(data))
    //     .accounts({
    //       minter: minter,
    //       pools: poolsPDA,
    //       mintCounterCollection: mintCounterCollection,
    //       destination: destination,
    //       poolMinted: poolMinted,
    //       merkleTree: treeAddress,
    //       treeAuthority,
    //       compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    //       logWrapper: SPL_NOOP_PROGRAM_ID,
    //       collectionAuthority: collectionAuthority,
    //       collectionAuthorityRecordPda: MPL_BUBBLEGUM_PROGRAM_ID,
    //       collectionMint: collectionMint,
    //       collectionMetadata: collectionMetadata,
    //       editionAccount: collectionMasterEditionAccount,
    //       bubblegumSigner: bgumSigner,
    //       tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //     })
    //     .remainingAccounts(remainingAccounts)
    //     .instruction();
    //   // construct a v0 compatible transaction `Message`
    //   const messageV0 = new TransactionMessage({
    //     payerKey: minter,
    //     recentBlockhash: (await anchorProvider.connection.getLatestBlockhash())
    //       .blockhash,
    //     instructions: [mintCnftIns], // note this is an array of instructions
    //   }).compileToV0Message([lookupTableAccount]);
    //   const transactionV0 = new VersionedTransaction(messageV0);
    //   const sig = await anchorProvider.sendAndConfirm(transactionV0, [], {
    //     skipPreflight: true,
    //   });
    //   // const tx2 = await anchorProvider.wallet.signTransaction(transactionV0);
    //   // const sig = await anchorProvider.connection.sendTransaction(tx2, {
    //   //   skipPreflight: true,
    //   // });
    //   console.log('Mint cNFT: ', sig);
    // });
});
const whiteList = [
    'BKvnc194znZseFCN74wLSFAe1p55m4uzPkHxt1uHHw2s',
    '4dhkDcSPosrhXS9ySoaFVcVzbDFJCH7titzkJQpnUKX2',
    'CVPSR4RbxnHsUSo9PGjVRQJYWvNZADXExe54YMMuvRt9',
    '5aMGztMuSVPAp4nm6vrkU25BAho6gGxpWHnnaKZfiUHP',
    '7Xhh9UuTmy7g1n4gs4DLP3AV7KzGPJRm897cijJhKuhd',
    'CSEgkPVv75HXeG3AWL2Jsm9naTGYioU8TZipDSmgYzmz',
    'DrBh1v9AVDp2CpZkXT87ATK74QynHJAJ2Pf6wXq2DZ5u',
];
//# sourceMappingURL=mintNFT.js.map