import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { KyupadSmartContract } from '../target/types/kyupad_smart_contract';
import { MerkleTree } from 'merkletreejs';
import { publicKey } from '@metaplex-foundation/umi';

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
import { BN } from 'bn.js';

type GroupConigArgs = anchor.IdlTypes<KyupadSmartContract>['GroupConigArgs'];

describe('kyupad-smart-contract', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .KyupadSmartContract as Program<KyupadSmartContract>;

  const anchorProvider = program.provider as anchor.AnchorProvider;
  const minter = anchorProvider.wallet.publicKey;

  const collectionMint = new PublicKey(
    'CVu7sfWxYTkNDbUmxj2wPVD75CAdiqbzLZW97ZPxwZhc'
  );
  const collectionMetadata = new PublicKey(
    '9m2aPLRAotUnFKsmQ6DdtXth46V6dJ5m6gfgb7fG1Ebc'
  );
  const collectionMasterEditionAccount = new PublicKey(
    '4J7kimf8Bt8F2sQpbu1gvFVTVkRoBHd3NQsaWNcZChwX'
  );

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

    const [bgumSigner, __] = await PublicKey.findProgramAddress(
      [Buffer.from('collection_cpi', 'utf8')],
      MPL_BUBBLEGUM_PROGRAM_ID
    );

    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
      'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    );

    const tx = await program.methods
      .mintCnft(merkle_proof, merkle_root, Buffer.from(data))
      .accounts({
        minter: minter,
        merkleTree: treeAddress,
        treeAuthority,
        treeDelegate: minter,
        payer: minter,
        leafDelegate: minter,
        leafOwner: minter,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        collectionAuthority: minter,
        collectionAuthorityRecordPda: MPL_BUBBLEGUM_PROGRAM_ID,
        collectionMint: collectionMint,
        collectionMetadata: collectionMetadata,
        editionAccount: collectionMasterEditionAccount,
        bubblegumSigner: bgumSigner,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .rpc({
        skipPreflight: true,
      });

    console.log('Your transaction signature', tx);
  });

  it('init_collection_config', async () => {
    const arrayGroupConfigArgs: Array<GroupConigArgs> = [];

    for (let i = 0; i < 3; i++) {
      const arrayWallet = generateWhiteList(10);
      const leafNode = arrayWallet.map((addr) => keccak256(addr));
      const merkleTree = new MerkleTree(leafNode, keccak256, {
        sortPairs: true,
      });

      const merkle_root = merkleTree.getRoot();

      const groupConfigArgs: GroupConigArgs = {
        id: i.toString(),
        startDate: new BN(Math.floor(Date.now() / 1000)),
        endDate: new BN(Math.floor(Date.now() / 1000) + 3000),
        merkleRoot: merkle_root,
        mintLimit: 1,
        payment: 0.1,
        boxTax: 0.01,
        maxMint: 5,
      };

      arrayGroupConfigArgs.push(groupConfigArgs);
    }

    const [groupsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('groups'), minter.toBuffer(), collectionMint.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .initCollectionConfig(arrayGroupConfigArgs)
      .accounts({
        creator: minter,
        collectionMint: collectionMint,
        groups: groupsPDA,
      })
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

const OG = [];
