import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { KyupadSmartContract } from '../target/types/kyupad_smart_contract';
import { MerkleTree } from 'merkletreejs';
import { AccountMeta, Keypair } from '@solana/web3.js';
import { createMint } from '@solana/spl-token';
import { verifyCollectionV1 } from '@metaplex-foundation/mpl-token-metadata';

import * as borsh from 'borsh';
import keccak256 from 'keccak256';
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  TokenProgramVersion,
  TokenStandard,
  getMetadataArgsSerializer,
  MetadataArgsArgs,
} from '@metaplex-foundation/mpl-bubblegum';

import { PublicKey } from '@solana/web3.js';
import { generateWhiteList } from './utils';
import { BN, min } from 'bn.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import { publicKey } from '@metaplex-foundation/umi';
dotenv.config();

type PoolConfigArgs = anchor.IdlTypes<KyupadSmartContract>['PoolConfigArgs'];

describe('kyupad-smart-contract', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .KyupadSmartContract as Program<KyupadSmartContract>;

  const anchorProvider = program.provider as anchor.AnchorProvider;

  function programPaidBy(payer: anchor.web3.Keypair): anchor.Program {
    const newProvider = new anchor.AnchorProvider(
      anchorProvider.connection,
      new anchor.Wallet(payer),
      {}
    );

    return new anchor.Program(
      program.idl as anchor.Idl,
      program.programId,
      newProvider
    );
  }
  
  const minter = anchorProvider.wallet.publicKey;

  const collectionMint = new PublicKey(
    'BZArgKfXyaW3Cp4LN34RjXe1jwxNiBkX9ybSh7yR8pzt'
  );
  const collectionMetadata = new PublicKey(
    'CWFwqMCV2Mp773r6thwJapuBE5VJDNCfiEmPaiPRQk7P'
  );
  const collectionMasterEditionAccount = new PublicKey(
    '8NUueApHg4KWknZbGshLHNxMdTDGhaq6tH7L84b4T7Ks'
  );

  const [poolsPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('pools'), minter.toBuffer(), collectionMint.toBuffer()],
    program.programId
  );

  const collectionAuthority = Keypair.fromSecretKey(
    new Uint8Array(bs58.decode(process.env.PRIVATE_KEY!))
  );

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
      '4XXQ1ToKs6D2ULN9T4kXEg9aUBhMv3iYNY5pvaHDASVA'
    );

    const MPL_BUBBLEGUM_PROGRAM_ID = new PublicKey(
      'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
    );

    const [treeAuthority, _bump] = await PublicKey.findProgramAddress(
      [treeAddress.toBuffer()],
      MPL_BUBBLEGUM_PROGRAM_ID
    );

    const [bgumSigner] = await PublicKey.findProgramAddress(
      [Buffer.from('collection_cpi', 'utf8')],
      MPL_BUBBLEGUM_PROGRAM_ID
    );

    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
      'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    );

    const [poolMinted] = await PublicKey.findProgramAddress(
      [Buffer.from('pool_minted'), poolsPDA.toBuffer(), merkle_root],
      program.programId
    );

    const [mintCounter] = await PublicKey.findProgramAddressSync(
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
        collectionAuthority: collectionAuthority.publicKey,
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
      .signers([collectionAuthority])
      .rpc({
        skipPreflight: true,
      });

    console.log('Your transaction signature', tx);
  });

  // it('init_collection_config by creator', async () => {
  //   const creator = Keypair.fromSecretKey(
  //     new Uint8Array(bs58.decode(process.env.PRIVATE_KEY!))
  //   );
  //   const newProgram = programPaidBy(creator);

  //   const arrayGroupConfigArgs: Array<PoolConfigArgs> = [];
  //   const numberOfPools = 3;

  //   const remainingAccounts: Array<AccountMeta> = [];

  //   const [poolsPDA] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('pools'),
  //       creator.publicKey.toBuffer(),
  //       collectionMint.toBuffer(),
  //     ],
  //     program.programId
  //   );

  //   for (let i = 0; i < numberOfPools; i++) {
  //     const arrayWallet = generateWhiteList(10);
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
  //       payment: new BN(1),
  //       boxTax: 0.01,
  //       poolSupply: 5,
  //       lamports: new BN(1),
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

  //   const tx = await newProgram.methods
  //     .initCollectionConfig(arrayGroupConfigArgs)
  //     .accounts({
  //       creator: creator.publicKey,
  //       collectionMint: collectionMint,
  //       pools: poolsPDA,
  //     })
  //     .remainingAccounts(remainingAccounts)
  //     .rpc({
  //       skipPreflight: true,
  //     });

  //   console.log('Your transaction signature', tx);
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
