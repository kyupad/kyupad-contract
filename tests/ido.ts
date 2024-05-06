import {
  AnchorProvider,
  BN,
  IdlTypes,
  Program,
  setProvider,
  workspace,
} from '@coral-xyz/anchor';
import { KyupadSmartContract } from '../target/types/kyupad_smart_contract';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { expect } from 'chai';
import {
  generateRandomObjectId,
  generateWhiteList,
  generateWhiteListInvest,
} from './utils';
import keccak256 from 'keccak256';
import MerkleTree from 'merkletreejs';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint,
} from '@solana/spl-token';

type Permission = IdlTypes<KyupadSmartContract>['Permission'];
type ProjectConfigArgs = IdlTypes<KyupadSmartContract>['ProjectConfigArgs'];
type InvestArgs = IdlTypes<KyupadSmartContract>['InvestArgs'];

describe('kyupad-smart-contract', () => {
  setProvider(AnchorProvider.env());

  const program = workspace.KyupadSmartContract as Program<KyupadSmartContract>;

  const anchorProvider = program.provider as AnchorProvider;
  const upgradableAuthority = anchorProvider.wallet.publicKey;

  // beforeEach('Init admin', async () => {
  //   const [adminPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from('admin'), upgradableAuthority.toBuffer()],
  //     program.programId
  //   );

  //   const BPF_LOADER_PROGRAM = new PublicKey(
  //     'BPFLoaderUpgradeab1e11111111111111111111111'
  //   );

  //   const [kyupadProgramData] = PublicKey.findProgramAddressSync(
  //     [program.programId.toBuffer()],
  //     BPF_LOADER_PROGRAM
  //   );

  //   const idoPermission: Permission = {
  //     idoAdmin: {},
  //   };

  //   const tx = await program.methods
  //     .initAdmin(upgradableAuthority, [idoPermission])
  //     .accounts({
  //       signer: upgradableAuthority,
  //       adminPda: adminPda,
  //       kyupadProgramData: kyupadProgramData,
  //       bpfLoaderUpgradeable: BPF_LOADER_PROGRAM,
  //     })
  //     .rpc({
  //       maxRetries: 20,
  //     });

  //   console.log('Init admin: ', tx);

  //   const adminPdaData: Array<Permission> = (
  //     await program.account.admin.fetch(adminPda)
  //   ).permissions;

  //   const foundPermission = adminPdaData.some((permission: Permission) => {
  //     return JSON.stringify(permission) === JSON.stringify(idoPermission);
  //   });

  //   expect(foundPermission, 'Expect admin have right to register project').to.be
  //     .true;
  // });

  // it('Register project', async () => {
  //   const tokenAddress = Keypair.generate();
  //   const destination = Keypair.generate();

  //   const arrayWallet = generateWhiteList(10000);

  //   const leafNode = arrayWallet.map((addr) => keccak256(addr));
  //   const merkleTree = new MerkleTree(leafNode, keccak256, {
  //     sortPairs: true,
  //   });

  //   const merkle_root = merkleTree.getRoot();

  //   const id = generateRandomObjectId();
  //   const startDate = new BN(Math.floor(Date.now() / 1000));
  //   const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

  //   const projectConfigArgs: ProjectConfigArgs = {
  //     id: id,
  //     startDate: startDate,
  //     endDate: endDate,
  //     merkleRoot: merkle_root,
  //     destination: tokenAddress.publicKey,
  //     tokenAddress: destination.publicKey,
  //     ticketSize: 0,
  //     tokenOffered: 0,
  //     investTotal: 0,
  //   };

  //   const [project] = PublicKey.findProgramAddressSync(
  //     [Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)],
  //     program.programId
  //   );

  //   const [projectCounter] = PublicKey.findProgramAddressSync(
  //     [Buffer.from('project_counter'), project.toBuffer()],
  //     program.programId
  //   );

  //   const [adminPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from('admin'), upgradableAuthority.toBuffer()],
  //     program.programId
  //   );

  //   const tx = await program.methods
  //     .registerProject(projectConfigArgs)
  //     .accounts({
  //       adminPda: adminPda,
  //       creator: upgradableAuthority,
  //       project: project,
  //       projectCounter: projectCounter,
  //     })
  //     .rpc({ maxRetries: 20, skipPreflight: true });

  //   console.log('Register project: ', tx);

  //   const projectData: ProjectConfigArgs =
  //     await program.account.projectConfig.fetch(project);

  //   expect(
  //     Buffer.from(JSON.stringify(projectData)),
  //     'Expect project pda data to be equal initial data'
  //   ).to.eql(Buffer.from(JSON.stringify(projectConfigArgs)));
  // });

  it('Invest', async () => {
    const tokenAddress = new PublicKey(
      '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
    );

    const tokenData = await getMint(anchorProvider.connection, tokenAddress);

    const receiver = new PublicKey(
      '5aMGztMuSVPAp4nm6vrkU25BAho6gGxpWHnnaKZfiUHP'
    );

    const destination = getAssociatedTokenAddressSync(tokenAddress, receiver);

    let { arrayWallet, investTotal } = generateWhiteListInvest(9999);

    const randomNumber = Math.floor(Math.random() * 3) + 1;
    const test = upgradableAuthority.toString() + '_' + randomNumber.toString();
    arrayWallet.push(test);

    investTotal += randomNumber;

    const leafNode = arrayWallet.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNode, keccak256, {
      sortPairs: true,
    });

    const merkle_root = merkleTree.getRoot();

    const id = generateRandomObjectId();
    const startDate = new BN(Math.floor(Date.now() / 1000));
    const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

    const tokenOffered = 100000; // 100 000 token KYUPAD
    const ticketSize = 100; // 100 USDT per ticket
    const price = (investTotal * ticketSize) / tokenOffered;

    const projectConfigArgs: ProjectConfigArgs = {
      id: id,
      startDate: startDate,
      endDate: endDate,
      merkleRoot: merkle_root,
      destination: destination,
      tokenAddress: tokenAddress,
      ticketSize: new BN(ticketSize * 10 ** tokenData.decimals),
      tokenOffered: tokenOffered,
      investTotal: investTotal,
    };

    const [project] = PublicKey.findProgramAddressSync(
      [Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)],
      program.programId
    );

    const [projectCounter] = PublicKey.findProgramAddressSync(
      [Buffer.from('project_counter'), project.toBuffer()],
      program.programId
    );

    const [adminPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin'), upgradableAuthority.toBuffer()],
      program.programId
    );

    const registerProjectIns = await program.methods
      .registerProject(projectConfigArgs)
      .accounts({
        adminPda: adminPda,
        creator: upgradableAuthority,
        project: project,
        projectCounter: projectCounter,
      })
      .instruction();

    const getProof = merkleTree.getProof(keccak256(test));
    const merkle_proof = getProof.map((item) => Array.from(item.data));

    const investArgs: InvestArgs = {
      projectId: projectConfigArgs.id,
      investTotal: randomNumber - 1 === 0 ? randomNumber : randomNumber - 1,
      investMaxTotal: randomNumber,
      merkleProof: merkle_proof,
    };

    const [investCounter] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('invest_counter'),
        project.toBuffer(),
        upgradableAuthority.toBuffer(),
      ],
      program.programId
    );

    const source = getAssociatedTokenAddressSync(
      tokenAddress,
      upgradableAuthority
    );

    const investIns = await program.methods
      .invest(investArgs)
      .accounts({
        investor: upgradableAuthority,
        project: project,
        projectCounter: projectCounter,
        investorCounter: investCounter,
        mint: tokenAddress,
        source: source,
        destination: destination,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const tx = new Transaction().add(registerProjectIns).add(investIns);

    tx.feePayer = upgradableAuthority;
    tx.recentBlockhash = (
      await anchorProvider.connection.getLatestBlockhash()
    ).blockhash;

    const signedTxn = await anchorProvider.wallet.signTransaction(tx);

    const sig = await anchorProvider.connection.sendRawTransaction(
      signedTxn.serialize(),
      {
        skipPreflight: true,
      }
    );

    console.log('Invest: ', sig);
  });
});
