import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import {
  KyupadSmartContract,
  IDL,
} from '../target/types/kyupad_smart_contract';
import { MerkleTree } from 'merkletreejs';
import {
  AccountMeta,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  AddressLookupTableProgram,
  Connection,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  mintTo,
  tokenGroupUpdateGroupAuthority,
  getOrCreateAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { setCollectionSize } from '@metaplex-foundation/mpl-token-metadata';
import {
  DataV2,
  DataV2Args,
  Metadata,
  MetadataAccountData,
  getDataV2Serializer,
  verifyCollectionV1,
} from '@metaplex-foundation/mpl-token-metadata';

import * as borsh from 'borsh';
import keccak256 from 'keccak256';
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  TokenProgramVersion,
  TokenStandard,
  getMetadataArgsSerializer,
  MetadataArgsArgs,
  MetadataArgs,
  CreateTreeConfigInstructionDataArgs,
  getCreateTreeConfigInstructionDataSerializer,
  getMerkleTreeSize,
  MPL_BUBBLEGUM_PROGRAM_ID,
  mintToCollectionV1,
} from '@metaplex-foundation/mpl-bubblegum';

import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { generateWhiteList, sleep } from './utils';
import { BN, min } from 'bn.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import {
  Context,
  createNullContext,
  isSigner,
  publicKey,
} from '@metaplex-foundation/umi';
dotenv.config();

type PoolConfigArgs = anchor.IdlTypes<KyupadSmartContract>['PoolConfigArgs'];
type InitCollectionConfigArgs =
  anchor.IdlTypes<KyupadSmartContract>['InitCollectionConfigArgs'];
type UpdatePoolConfigArgs =
  anchor.IdlTypes<KyupadSmartContract>['UpdatePoolConfigArgs'];

describe('kyupad-smart-contract', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const programId = new PublicKey(
    'GJZghSMo1HGLmQGhUUU7a7RSL1VbabwmBiYBbqiJ86sP'
  );

  const connection = new Connection(
    'https://kathlin-5yytwf-fast-devnet.helius-rpc.com',
    'confirmed'
  );

  const program = new Program<KyupadSmartContract>(IDL, programId, {
    connection,
  });

  const upgradableAuthority = Keypair.fromSecretKey(
    bs58.decode(process.env.PRIVATE_KEY!)
  );

  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
  );

  const collectionMint = new PublicKey(
    'GxqkJ9TcG7qzfRE61LZe53DJRgLapdaLNW4BqNNBauHH'
  );

  const treeAddress = new PublicKey(
    '45hUwqhpMwLvpBkhaTekvKiEzcPE2SePeLK3K2qpaYFE'
  );

  const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
    [treeAddress.toBuffer()],
    new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID.toString())
  );

  const [collectionMetadata] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      collectionMint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  const [collectionMasterEditionAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata', 'utf8'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      collectionMint.toBuffer(),
      Buffer.from('edition', 'utf8'),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  const [poolsPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('pools'), collectionMint.toBuffer()],
    program.programId
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
    const adminPubkey = new PublicKey(
      '5ifW9hTbfGQCtutGcmaV35Rw4h6ZVS8Yi3y1gXuL6BZn'
    );

    const [adminPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin'), adminPubkey.toBuffer()],
      program.programId
    );

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
        adminPda: adminPda,
        kyupadProgramData: kyupadProgramData,
      })
      .instruction();

    const tx = new Transaction().add(initAdminIns);

    tx.feePayer = upgradableAuthority.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    tx.partialSign(upgradableAuthority);

    const sig = await connection.sendTransaction(tx, [upgradableAuthority], {
      maxRetries: 20,
      skipPreflight: true,
    });

    await sleep(2000);

    console.log('Init admin', sig);
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

    const [adminPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()],
      program.programId
    );

    const createTreeConfigIx = await program.methods
      .createTreeConfig(14, 64, true, space)
      .accounts({
        creator: upgradableAuthority.publicKey,
        adminPda: adminPda,
        merkleTree: treeKeypair.publicKey,
        treeConfig: treeConfig,
        mplBubbleGumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        updateAuthority: collectionAuthority,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    let tx = new Transaction().add(createTreeAccountIx).add(createTreeConfigIx);

    tx.feePayer = upgradableAuthority.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    tx.partialSign(upgradableAuthority);

    const sig = await connection.sendTransaction(
      tx,
      [upgradableAuthority, treeKeypair],
      { maxRetries: 20, skipPreflight: true }
    );
    console.log('Your transaction create merkle tree', sig);

    const createCollectionIns = await program.methods
      .createCollection(Buffer.from(data))
      .accounts({
        creator: upgradableAuthority.publicKey,
        adminPda: adminPda,
        collectionTokenAccount: ata,
        metadata: metadataAccount,
        masterEdition: masterEditionAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        mint: mint.publicKey,
        updateAuthority: collectionAuthority,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
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
      { maxRetries: 20, skipPreflight: true }
    );

    console.log('Your transaction create collection', sig1);
  });

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
