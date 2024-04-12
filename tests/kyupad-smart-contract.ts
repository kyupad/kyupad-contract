import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { KyupadSmartContract } from '../target/types/kyupad_smart_contract';
import { MerkleTree } from 'merkletreejs';
import {
  AccountMeta,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  mintTo,
  tokenGroupUpdateGroupAuthority,
  getOrCreateAssociatedTokenAccount,
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
} from '@metaplex-foundation/mpl-bubblegum';

import { PublicKey } from '@solana/web3.js';
import { generateWhiteList } from './utils';
import { BN, min } from 'bn.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import { TransactionBuilder, publicKey } from '@metaplex-foundation/umi';
dotenv.config();

type PoolConfigArgs = anchor.IdlTypes<KyupadSmartContract>['PoolConfigArgs'];

describe('kyupad-smart-contract', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .KyupadSmartContract as Program<KyupadSmartContract>;

  const anchorProvider = program.provider as anchor.AnchorProvider;

  const minter = anchorProvider.wallet.publicKey;

  const collectionMint = new PublicKey(
    '2a81q5T129qDNQyzaAscvRgXZX92PCJSwX3S4ZzNxMCg'
  );

  const collectionMetadata = new PublicKey(
    'B7nB7vqhr5f1f3x1JhQ5KycLDEYs4mN7AvGB1gNTw6zZ'
  );

  const collectionMasterEditionAccount = new PublicKey(
    'DyRRPoQoyxNyYDwWSjHkuKQLxbFubyR2LoHUCmRgRPcL'
  );

  const [poolsPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('pools'), minter.toBuffer(), collectionMint.toBuffer()],
    program.programId
  );

  const server = Keypair.fromSecretKey(
    new Uint8Array(bs58.decode(process.env.PRIVATE_KEY!))
  );

  const [collectionAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('update_authority')],
    program.programId
  );

  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
  );

  it('Create collection', async () => {
    const mint = await createMint(
      anchorProvider.connection,
      server,
      collectionAuthority,
      collectionAuthority,
      0
    );

    const ata = await getOrCreateAssociatedTokenAccount(
      anchorProvider.connection,
      server,
      mint,
      collectionAuthority,
      true
    );

    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata', 'utf8'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const [masterEditionAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata', 'utf8'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
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

    const createTreeIx = SystemProgram.createAccount({
      fromPubkey: server.publicKey,
      newAccountPubkey: treeKeypair.publicKey,
      lamports:
        await anchorProvider.connection.getMinimumBalanceForRentExemption(
          space
        ),
      space: space,
      programId: new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'),
    });

    let tx1 = new Transaction().add(createTreeIx);
    tx1.feePayer = server.publicKey;
    console.log(2);

    await sendAndConfirmTransaction(
      anchorProvider.connection,
      tx1,
      [server, treeKeypair],
      {
        commitment: 'confirmed',
        skipPreflight: true,
      }
    );

    const tx = await program.methods
      .createCollection(Buffer.from(data), 14, 64, true, space)
      .accounts({
        creator: minter,
        merkleTree: treeKeypair.publicKey,
        treeConfig: treeConfig,
        mplBubbleGumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        collectionTokenAccount: ata.address,
        metadata: metadataAccount,
        masterEdition: masterEditionAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        mint: mint,
        updateAuthority: collectionAuthority,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .rpc({
        skipPreflight: true,
        commitment: 'confirmed',
      });

    console.log('Your transaction signature', tx);
  });

  // it('init_collection_config', async () => {
  //   const arrayGroupConfigArgs: Array<PoolConfigArgs> = [];
  //   const numberOfPools = 3;

  //   const remainingAccounts: Array<AccountMeta> = [];

  //   for (let i = 0; i < numberOfPools; i++) {
  //     let arrayWallet: string[] = [];
  //     if (i == 2) {
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
  //       payment: new BN(100000000),
  //       boxTax: 0.01,
  //       poolSupply: 5,
  //       lamports: new BN(100000000),
  //     };

  //     arrayGroupConfigArgs.push(groupConfigArgs);

  //     const [poolMinted] = PublicKey.findProgramAddressSync(
  //       [Buffer.from('pool_minted'), poolsPDA.toBuffer(), merkle_root],
  //       program.programId
  //     );

  //     remainingAccounts.push({
  //       pubkey: poolMinted,
  //       isWritable: true,
  //       isSigner: false,
  //     });
  //   }

  //   const tx = await program.methods
  //     .initCollectionConfig(arrayGroupConfigArgs)
  //     .accounts({
  //       creator: minter,
  //       collectionMint: collectionMint,
  //       pools: poolsPDA,
  //     })
  //     .remainingAccounts(remainingAccounts)
  //     .rpc({ skipPreflight: true });

  //   console.log('Your transaction signature', tx);
  // });

  it('mint cNFT', async () => {
    // Add your test here.
    const leafNode = whiteList.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNode, keccak256, { sortPairs: true });

    const merkle_root = merkleTree.getRoot();

    const getProof = merkleTree.getProof(keccak256(whiteList[3]));
    const merkle_proof = getProof.map((item) => Array.from(item.data));

    // Mint a compressed NFT
    const nftArgs: MetadataArgsArgs = {
      name: 'Compression Test',
      symbol: 'COMP',
      uri: 'https://arweave.net/gfO_TkYttQls70pTmhrdMDz9pfMUXX8hZkaoIivQjGs',
      creators: [],
      editionNonce: 253,
      tokenProgramVersion: TokenProgramVersion.Original,
      tokenStandard: TokenStandard.NonFungible,
      uses: null,
      primarySaleHappened: false,
      sellerFeeBasisPoints: 0,
      isMutable: false,
      collection: {
        verified: false,
        key: publicKey(collectionMint.toString()),
      },
    };

    const serializer = getMetadataArgsSerializer();

    const data = serializer.serialize(nftArgs);

    const treeAddress = new PublicKey(
      'BUBPuxzUMrTmGQKK7r9s14x2WRUwbvzyrw9Mai8adv9h'
    );

    const MPL_BUBBLEGUM_PROGRAM_ID = new PublicKey(
      'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
    );

    const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
      [treeAddress.toBuffer()],
      MPL_BUBBLEGUM_PROGRAM_ID
    );

    const [bgumSigner] = PublicKey.findProgramAddressSync(
      [Buffer.from('collection_cpi', 'utf8')],
      MPL_BUBBLEGUM_PROGRAM_ID
    );

    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
      'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    );

    const [poolMinted] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool_minted'), poolsPDA.toBuffer(), merkle_root],
      program.programId
    );

    const [mintCounter] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('mint_counter'),
        Buffer.from('2'),
        minter.toBuffer(),
        poolsPDA.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .mintCnft(merkle_proof, merkle_root, Buffer.from(data))
      .accounts({
        minter: minter,
        pools: poolsPDA,
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
      .remainingAccounts([
        {
          pubkey: mintCounter,
          isWritable: true,
          isSigner: false,
        },
      ])
      .rpc({
        skipPreflight: true,
      });

    console.log('Your transaction signature', tx);
  });
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
