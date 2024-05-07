import {
  AnchorProvider,
  BN,
  IdlTypes,
  Program,
  setProvider,
  workspace,
} from '@coral-xyz/anchor';
import {
  IDL,
  KyupadSmartContract,
} from '../target/types/kyupad_smart_contract';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { expect } from 'chai';
import {
  generateRandomObjectId,
  generateWhiteList,
  generateWhiteListInvest,
  sleep,
} from './utils';
import keccak256 from 'keccak256';
import MerkleTree from 'merkletreejs';
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import * as dotenv from 'dotenv';
dotenv.config();

type Permission = IdlTypes<KyupadSmartContract>['Permission'];
type ProjectConfigArgs = IdlTypes<KyupadSmartContract>['ProjectConfigArgs'];
type InvestArgs = IdlTypes<KyupadSmartContract>['InvestArgs'];

describe('kyupad-smart-contract', () => {
  setProvider(AnchorProvider.env());

  const programId = new PublicKey(process.env.DEVNET_ROGRAM_ID!);

  const connection = new Connection(
    'https://kathlin-5yytwf-fast-devnet.helius-rpc.com',
    'confirmed'
  );

  const program = new Program<KyupadSmartContract>(IDL, programId, {
    connection,
  });
  const anchorProvider = program.provider as AnchorProvider;

  const upgradableAuthority = Keypair.fromSecretKey(
    bs58.decode(process.env.PRIVATE_KEY!)
  );

  xit('Init admin with ido permission', async () => {
    const [adminPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()],
      program.programId
    );

    const BPF_LOADER_PROGRAM = new PublicKey(
      'BPFLoaderUpgradeab1e11111111111111111111111'
    );

    const [kyupadProgramData] = PublicKey.findProgramAddressSync(
      [program.programId.toBuffer()],
      BPF_LOADER_PROGRAM
    );

    const idoPermission: Permission = {
      idoAdmin: {},
    };

    const createAdminIns = await program.methods
      .initAdmin(upgradableAuthority.publicKey, [idoPermission])
      .accounts({
        signer: upgradableAuthority.publicKey,
        adminPda: adminPda,
        kyupadProgramData: kyupadProgramData,
        bpfLoaderUpgradeable: BPF_LOADER_PROGRAM,
      })
      .instruction();

    const tx = new Transaction().add(createAdminIns);

    tx.feePayer = upgradableAuthority.publicKey;
    tx.recentBlockhash = (
      await anchorProvider.connection.getLatestBlockhash()
    ).blockhash;

    tx.partialSign(upgradableAuthority);

    const sig = await anchorProvider.connection.sendTransaction(
      tx,
      [upgradableAuthority],
      {
        skipPreflight: true,
      }
    );
    await sleep(2000);

    console.log('Init admin: ', sig);

    const adminPdaData: Array<Permission> = (
      await program.account.admin.fetch(adminPda)
    ).permissions;

    const foundPermission = adminPdaData.some((permission: Permission) => {
      return JSON.stringify(permission) === JSON.stringify(idoPermission);
    });

    expect(foundPermission, 'Expect admin have right to register project').to.be
      .true;
  });

  xit('Init admin with cnft permission', async () => {
    const adminAddress = new PublicKey(
      'CY92ruXbHmeaNiGqaZ9mXnXFPTjgfq2pHDuoM5VgWY1V'
    );

    const [adminPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin'), adminAddress.toBuffer()],
      program.programId
    );

    const BPF_LOADER_PROGRAM = new PublicKey(
      'BPFLoaderUpgradeab1e11111111111111111111111'
    );

    const [kyupadProgramData] = PublicKey.findProgramAddressSync(
      [program.programId.toBuffer()],
      BPF_LOADER_PROGRAM
    );

    // @ts-ignore
    const cnftPermission: Permission = {
      cnftAdmin: {},
    };

    // @ts-ignore
    const createAdminIns = await program.methods
      .initAdmin(adminAddress, [cnftPermission])
      .accounts({
        signer: upgradableAuthority.publicKey,
        adminPda: adminPda,
        kyupadProgramData: kyupadProgramData,
        bpfLoaderUpgradeable: BPF_LOADER_PROGRAM,
      })
      .instruction();

    const tx = new Transaction().add(createAdminIns);

    tx.feePayer = upgradableAuthority.publicKey;
    tx.recentBlockhash = (
      await anchorProvider.connection.getLatestBlockhash()
    ).blockhash;

    tx.partialSign(upgradableAuthority);

    const sig = await anchorProvider.connection.sendTransaction(
      tx,
      [upgradableAuthority],
      {
        skipPreflight: true,
      }
    );
    await sleep(2000);

    console.log('Init admin: ', sig);

    const adminPdaData: Array<Permission> = (
      await program.account.admin.fetch(adminPda)
    ).permissions;

    const foundPermission = adminPdaData.some((permission: Permission) => {
      return JSON.stringify(permission) === JSON.stringify(cnftPermission);
    });

    expect(foundPermission, 'Expect admin have right to register project').to.be
      .true;
  });

  xit('Register project', async () => {
    const tokenAddress = Keypair.generate();
    const destination = Keypair.generate();

    const arrayWallet = generateWhiteList(10000);

    const leafNode = arrayWallet.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNode, keccak256, {
      sortPairs: true,
    });

    const merkle_root = merkleTree.getRoot();

    const id = generateRandomObjectId();
    const startDate = new BN(Math.floor(Date.now() / 1000));
    const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

    const projectConfigArgs: ProjectConfigArgs = {
      id: id,
      startDate: startDate,
      endDate: endDate,
      merkleRoot: merkle_root,
      destination: tokenAddress.publicKey,
      tokenAddress: destination.publicKey,
      ticketSize: new BN(1000),
      tokenOffered: 0,
      investTotal: 0,
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
      [Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .registerProject(projectConfigArgs)
      .accounts({
        adminPda: adminPda,
        creator: upgradableAuthority.publicKey,
        project: project,
        projectCounter: projectCounter,
      })
      .rpc({ maxRetries: 20, skipPreflight: true });

    console.log('Register project: ', tx);

    const projectData: ProjectConfigArgs =
      await program.account.projectConfig.fetch(project);

    expect(
      Buffer.from(JSON.stringify(projectData)),
      'Expect project pda data to be equal initial data'
    ).to.eql(Buffer.from(JSON.stringify(projectConfigArgs)));
  });

  xit('User not in the whitelist', async () => {});

  xit('Invest successfully', async () => {
    const tokenAddress = new PublicKey(
      '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
    );

    const tokenData = await getMint(anchorProvider.connection, tokenAddress);

    const receiver = Keypair.generate().publicKey;

    const destination = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        upgradableAuthority,
        tokenAddress,
        receiver
      )
    ).address;

    let { arrayWallet, investTotal } = generateWhiteListInvest(9999);

    const randomNumber = Math.floor(Math.random() * 3) + 1;
    const test =
      upgradableAuthority.publicKey.toString() + '_' + randomNumber.toString();
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
    // const price = (investTotal * ticketSize) / tokenOffered;

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
      [Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()],
      program.programId
    );

    const registerProjectIns = await program.methods
      .registerProject(projectConfigArgs)
      .accounts({
        adminPda: adminPda,
        creator: upgradableAuthority.publicKey,
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
        upgradableAuthority.publicKey.toBuffer(),
      ],
      program.programId
    );

    const source = getAssociatedTokenAddressSync(
      tokenAddress,
      upgradableAuthority.publicKey
    );

    const investIns = await program.methods
      .invest(investArgs)
      .accounts({
        investor: upgradableAuthority.publicKey,
        project: project,
        projectCounter: projectCounter,
        investorCounter: investCounter,
        mint: tokenAddress,
        source: source,
        destination: destination,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([upgradableAuthority])
      .instruction();

    const tx = new Transaction().add(registerProjectIns).add(investIns);

    tx.feePayer = upgradableAuthority.publicKey;
    tx.recentBlockhash = (
      await anchorProvider.connection.getLatestBlockhash()
    ).blockhash;

    tx.partialSign(upgradableAuthority);

    const sig = await anchorProvider.connection.sendTransaction(
      tx,
      [upgradableAuthority],
      {
        skipPreflight: true,
      }
    );

    console.log('Invest: ', sig);

    await sleep(2000);

    const info = await getAccount(connection, destination);
    const amount = Number(info.amount);

    expect(
      amount / 10 ** tokenData.decimals,
      'Destination amount should equal ticket size'
    ).to.eq(ticketSize);

    const projectCounterData = await program.account.projectCounter.fetch(
      projectCounter
    );

    expect(
      projectCounterData.remainning,
      "Project counter should be equal investotal - user's invest total"
    ).to.eq(
      investTotal - (randomNumber - 1 === 0 ? randomNumber : randomNumber - 1)
    );

    const investCounterData = await program.account.investorCounter.fetch(
      investCounter
    );

    expect(
      investCounterData.remainning,
      'User invest counter should be equal 0 or 1'
    ).to.eq(randomNumber - 1 === 0 ? 0 : 1);
  });

  xit('Invest with large white list (50k)', async () => {
    const tokenAddress = new PublicKey(
      '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
    );

    const tokenData = await getMint(anchorProvider.connection, tokenAddress);

    const receiver = Keypair.generate().publicKey;

    const destination = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        upgradableAuthority,
        tokenAddress,
        receiver
      )
    ).address;

    let { arrayWallet, investTotal } = generateWhiteListInvest(49999);

    const randomNumber = Math.floor(Math.random() * 3) + 1;
    const test =
      upgradableAuthority.publicKey.toString() + '_' + randomNumber.toString();
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
    // const price = (investTotal * ticketSize) / tokenOffered;

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
      [Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()],
      program.programId
    );

    const registerProjectIns = await program.methods
      .registerProject(projectConfigArgs)
      .accounts({
        adminPda: adminPda,
        creator: upgradableAuthority.publicKey,
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
        upgradableAuthority.publicKey.toBuffer(),
      ],
      program.programId
    );

    const source = getAssociatedTokenAddressSync(
      tokenAddress,
      upgradableAuthority.publicKey
    );

    const investIns = await program.methods
      .invest(investArgs)
      .accounts({
        investor: upgradableAuthority.publicKey,
        project: project,
        projectCounter: projectCounter,
        investorCounter: investCounter,
        mint: tokenAddress,
        source: source,
        destination: destination,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([upgradableAuthority])
      .instruction();

    const tx = new Transaction().add(registerProjectIns).add(investIns);

    tx.feePayer = upgradableAuthority.publicKey;
    tx.recentBlockhash = (
      await anchorProvider.connection.getLatestBlockhash()
    ).blockhash;

    tx.partialSign(upgradableAuthority);

    const sig = await anchorProvider.connection.sendTransaction(
      tx,
      [upgradableAuthority],
      {
        skipPreflight: true,
      }
    );

    console.log('Invest: ', sig);

    await sleep(2000);

    const info = await getAccount(connection, destination);
    const amount = Number(info.amount);

    expect(
      amount / 10 ** tokenData.decimals,
      'Destination amount should equal ticket size'
    ).to.eq(
      ticketSize * (randomNumber - 1 === 0 ? randomNumber : randomNumber - 1)
    );

    const projectCounterData = await program.account.projectCounter.fetch(
      projectCounter
    );

    expect(
      projectCounterData.remainning,
      "Project counter should be equal investotal - user's invest total"
    ).to.eq(
      investTotal - (randomNumber - 1 === 0 ? randomNumber : randomNumber - 1)
    );

    const investCounterData = await program.account.investorCounter.fetch(
      investCounter
    );

    expect(
      investCounterData.remainning,
      'User invest counter should be equal 0 or 1'
    ).to.eq(randomNumber - 1 === 0 ? 0 : 1);
  });

  xit('User invest over invest_total_max', async () => {});

  xit('User out of ticket', async () => {});

  xit('Project is out of ticket', async () => {});
});
