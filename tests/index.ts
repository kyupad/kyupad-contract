// import * as anchor from '@coral-xyz/anchor';
// import { Program } from '@coral-xyz/anchor';
// import {
//   KyupadSmartContract,
//   IDL,
// } from '../target/types/kyupad_smart_contract';

// import {
//   PublicKey,
//   Connection,
//   Keypair,
//   Transaction,
//   SystemProgram,
// } from '@solana/web3.js';

// import dotenv from 'dotenv';
// import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
// import {
//   ASSOCIATED_TOKEN_PROGRAM_ID,
//   TOKEN_PROGRAM_ID,
//   getAssociatedTokenAddressSync,
// } from '@solana/spl-token';
// import {
//   CreatorArgs,
//   DataV2Args,
//   getDataV2Serializer,
// } from '@metaplex-foundation/mpl-token-metadata';
// import { PublicKey as PublicKeyUmi } from '@metaplex-foundation/umi';
// import {
//   MPL_BUBBLEGUM_PROGRAM_ID,
//   SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
//   SPL_NOOP_PROGRAM_ID,
//   getMerkleTreeSize,
// } from '@metaplex-foundation/mpl-bubblegum';
// import { creatorAddress } from './utils';
// dotenv.config();

// const test = async () => {
//   const programId = new PublicKey(
//     '7xxCydutAXo4eicZXAN3JZmFCGg2dLqesGkrd8jAobxZ'
//   );

//   const connection = new Connection(
//     'https://dian-3cz7n2-fast-mainnet.helius-rpc.com',
//     'confirmed'
//   );

//   const program = new Program<KyupadSmartContract>(IDL, programId, {
//     connection,
//   });

//   const minter = Keypair.fromSecretKey(
//     bs58.decode(process.env.SEVER_PRIVATE_KEY)
//   );

//   console.log('Minter', minter.publicKey.toString());

//   const adminPubkey = new PublicKey(
//     'Fxu7o9k8BKKAJyD94UfESH9sMrEFtoXtRRbQiiUFD1pv'
//   );

//   const [adminPda] = PublicKey.findProgramAddressSync(
//     [Buffer.from('admin'), adminPubkey.toBuffer()],
//     program.programId
//   );

//   const BPF_LOADER_PROGRAM = new PublicKey(
//     'BPFLoaderUpgradeab1e11111111111111111111111'
//   );

//   const [kyupadProgramData] = PublicKey.findProgramAddressSync(
//     [program.programId.toBuffer()],
//     BPF_LOADER_PROGRAM
//   );

//   const initAdminIns = await program.methods
//     .initAdmin(adminPubkey)
//     .accounts({
//       signer: minter.publicKey,
//       adminPda: adminPda,
//       kyupadProgramData: kyupadProgramData,
//       bpfLoaderUpgradeable: BPF_LOADER_PROGRAM,
//     })
//     .instruction();

//   const tx = new Transaction().add(initAdminIns);

//   tx.feePayer = minter.publicKey;
//   tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
//   tx.sign(minter);

//   const sig = await connection.sendTransaction(tx, [minter], {
//     skipPreflight: true,
//     maxRetries: 5,
//   });
//   console.log('Init admin', sig);

//   const hehe = await connection.confirmTransaction(sig, 'confirmed');
//   console.log('Hehe', hehe);
// };

// const createCollection = async () => {
//   const deployer = Keypair.fromSecretKey(
//     bs58.decode(process.env.SEVER_PRIVATE_KEY)
//   );

//   const programId = new PublicKey(
//     '7xxCydutAXo4eicZXAN3JZmFCGg2dLqesGkrd8jAobxZ'
//   );

//   const connection = new Connection(
//     'https://adrianne-23frb2-fast-mainnet.helius-rpc.com',
//     'confirmed'
//   );

//   const program = new Program<KyupadSmartContract>(IDL, programId, {
//     connection,
//   });

//   const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
//     'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
//   );

//   const [collectionAuthority] = PublicKey.findProgramAddressSync(
//     [Buffer.from('update_authority')],
//     program.programId
//   );

//   const mint = Keypair.generate();

//   const ata = getAssociatedTokenAddressSync(
//     mint.publicKey,
//     collectionAuthority,
//     true
//   );

//   const [metadataAccount] = PublicKey.findProgramAddressSync(
//     [
//       Buffer.from('metadata', 'utf8'),
//       TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//       mint.publicKey.toBuffer(),
//     ],
//     TOKEN_METADATA_PROGRAM_ID
//   );

//   const [masterEditionAccount] = PublicKey.findProgramAddressSync(
//     [
//       Buffer.from('metadata', 'utf8'),
//       TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//       mint.publicKey.toBuffer(),
//       Buffer.from('edition', 'utf8'),
//     ],
//     TOKEN_METADATA_PROGRAM_ID
//   );

//   // const metadata: DataV2Args = {
//   //   name: 'Kyupad NFT Pass Gen 1',
//   //   symbol: 'KNP',
//   //   uri: 'https://bucket.kyupad.xyz/public/metadata/collection/662bc4a5828707bd1c3c263e.json',
//   //   sellerFeeBasisPoints: 400,
//   //   creators: null,
//   //   collection: null,
//   //   uses: null,
//   // };

//   const metadata: DataV2Args = {
//     name: 'Kyupad NFT Pass Beta',
//     symbol: 'KPNBT',
//     uri: 'https://bucket.kyupad.xyz/public/metadata/collection/662bc4a5828707bd1c3c263e.json',
//     sellerFeeBasisPoints: 400,
//     creators: null,
//     collection: null,
//     uses: null,
//   };

//   const serialize = getDataV2Serializer();
//   const data = serialize.serialize(metadata);

//   const space = getMerkleTreeSize(14, 64);

//   const treeKeypair = Keypair.generate();

//   const [treeConfig, _bump] = PublicKey.findProgramAddressSync(
//     [treeKeypair.publicKey.toBuffer()],
//     new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY')
//   );

//   const createTreeAccountIx = SystemProgram.createAccount({
//     fromPubkey: deployer.publicKey,
//     newAccountPubkey: treeKeypair.publicKey,
//     lamports: await connection.getMinimumBalanceForRentExemption(space),
//     space: space,
//     programId: new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'),
//   });

//   const [adminPda] = PublicKey.findProgramAddressSync(
//     [Buffer.from('admin'), deployer.publicKey.toBuffer()],
//     program.programId
//   );

//   const createTreeConfigIx = await program.methods
//     .createTreeConfig(14, 64, true, space)
//     .accounts({
//       creator: deployer.publicKey,
//       adminPda: adminPda,
//       merkleTree: treeKeypair.publicKey,
//       treeConfig: treeConfig,
//       mplBubbleGumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
//       compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
//       logWrapper: SPL_NOOP_PROGRAM_ID,
//       updateAuthority: collectionAuthority,
//       systemProgram: SystemProgram.programId,
//     })
//     .instruction();

//   const createCollectionIns = await program.methods
//     .createCollection(Buffer.from(data))
//     .accounts({
//       creator: deployer.publicKey,
//       adminPda: adminPda,
//       collectionTokenAccount: ata,
//       metadata: metadataAccount,
//       masterEdition: masterEditionAccount,
//       tokenProgram: TOKEN_PROGRAM_ID,
//       mint: mint.publicKey,
//       updateAuthority: collectionAuthority,
//       tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
//       systemProgram: SystemProgram.programId,
//       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//     })
//     .signers([mint])
//     .instruction();

//   let tx = new Transaction()
//     .add(createTreeAccountIx)
//     .add(createTreeConfigIx)
//     .add(createCollectionIns);

//   tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
//   tx.feePayer = deployer.publicKey;

//   tx.partialSign(mint);
//   tx.partialSign(deployer);
//   tx.partialSign(treeKeypair);

//   const sig = await connection.sendTransaction(
//     tx,
//     [mint, deployer, treeKeypair],
//     {
//       skipPreflight: true,
//       maxRetries: 30,
//     }
//   );
//   console.log('Init collection and tree', sig);

//   const res = await connection.confirmTransaction(sig, 'confirmed');
//   console.log('Respone', res);
// };

// // test();

// createCollection();
