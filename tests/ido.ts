import {
  AnchorProvider,
  BN,
  IdlTypes,
  Program,
  setProvider,
} from '@coral-xyz/anchor';
import { IDL, KyupadIdo } from '../target/types/kyupad_ido';
import {
  AccountMeta,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
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

import _ from 'lodash';
import { Option } from '@metaplex-foundation/umi';

type ProjectConfigArgs = IdlTypes<KyupadIdo>['ProjectConfigArgs'];
type InvestArgs = IdlTypes<KyupadIdo>['InvestArgs'];

type ProjectConfig = {
  id: String;
  startDate: BN;
  endDate: BN;
  merkleRoot: Buffer;
  tokenAddress: PublicKey;
  ticketSize: BN;
  tokenOffered: number;
  investTotal: number;
  destination: PublicKey;
  tokenProgram: PublicKey;
};

describe('kyupad-smart-contract', () => {
  setProvider(AnchorProvider.env());

  const programId = new PublicKey(
    'DwFzHZexbYr1r3uKnh9rgAKwbyHcznXGXceE3dami4nk'
  );

  const connection = new Connection(
    'https://kathlin-5yytwf-fast-devnet.helius-rpc.com',
    'confirmed'
  );

  const program = new Program<KyupadIdo>(IDL, programId, {
    connection,
  });

  const anchorProvider = program.provider as AnchorProvider;

  const upgradableAuthority = Keypair.fromSecretKey(
    bs58.decode(process.env.PRIVATE_KEY!)
  );

  xit('Init master', async () => {
    const [masterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('master')],
      program.programId
    );

    const BPF_LOADER_PROGRAM = new PublicKey(
      'BPFLoaderUpgradeab1e11111111111111111111111'
    );

    const [kyupadProgramData] = PublicKey.findProgramAddressSync(
      [program.programId.toBuffer()],
      BPF_LOADER_PROGRAM
    );

    const createAdminIns = await program.methods
      .initMaster(upgradableAuthority.publicKey)
      .accounts({
        signer: upgradableAuthority.publicKey,
        masterPda: masterPda,
        kyupadProgramData: kyupadProgramData,
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
      { maxRetries: 20, skipPreflight: true }
    );
    await sleep(2000);

    const masterData = await program.account.master.fetch(masterPda);

    console.log('Init master: ', sig);

    expect(
      masterData.masterKey.toString() ===
        upgradableAuthority.publicKey.toString(),
      'Expect master PDA have the key of master'
    ).to.be.true;
  });

  xit('Add admin', async () => {
    const adminAddress = upgradableAuthority.publicKey;
    const [masterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('master')],
      program.programId
    );

    const [adminPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin'), adminAddress.toBuffer()],
      program.programId
    );

    const addAdminIns = await program.methods
      .addAdmin(adminAddress)
      .accounts({
        signer: upgradableAuthority.publicKey,
        masterPda: masterPda,
        adminPda: adminPda,
      })
      .instruction();

    const tx = new Transaction().add(addAdminIns);

    tx.feePayer = upgradableAuthority.publicKey;
    tx.recentBlockhash = (
      await anchorProvider.connection.getLatestBlockhash()
    ).blockhash;

    tx.partialSign(upgradableAuthority);

    const sig = await anchorProvider.connection.sendTransaction(
      tx,
      [upgradableAuthority],
      { maxRetries: 20, skipPreflight: true }
    );
    await sleep(2000);

    const adminPdaInfo = await connection.getAccountInfo(adminPda);

    console.log('Add admin: ', sig);

    expect(
      adminPdaInfo.owner.toString() === programId.toString(),
      'This account must to be initialize'
    ).to.be.true;
  });

  xit('Register project with sol', async () => {
    const destination = upgradableAuthority.publicKey;

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

    const tokenOffered = 1_000_000;
    const ticketSize = new BN(0.1 * LAMPORTS_PER_SOL);

    const projectConfigArgs: ProjectConfigArgs = {
      id: id,
      startDate: startDate,
      endDate: endDate,
      merkleRoot: merkle_root,
      tokenAddress: null,
      ticketSize: ticketSize,
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
        destination: destination,
      })
      .instruction();

    const tx = new Transaction().add(registerProjectIns);

    tx.feePayer = upgradableAuthority.publicKey;
    tx.recentBlockhash = (
      await anchorProvider.connection.getLatestBlockhash()
    ).blockhash;

    tx.partialSign(upgradableAuthority);

    const sig = await anchorProvider.connection.sendTransaction(
      tx,
      [upgradableAuthority],
      { maxRetries: 20, skipPreflight: true }
    );

    await sleep(2000);

    console.log('Register project: ', sig);

    const projectData: ProjectConfig =
      await program.account.projectConfig.fetch(project);

    const projectDataInput: ProjectConfig = {
      ...projectConfigArgs,
      destination: destination,
      tokenProgram: null,
    };

    const order1 = Object.keys(projectData)
      .sort()
      .reduce((obj, key) => {
        obj[key] = projectData[key];
        return obj;
      }, {});

    const order2 = Object.keys(projectDataInput)
      .sort()
      .reduce((obj, key) => {
        obj[key] = projectDataInput[key];
        return obj;
      }, {});

    expect(
      JSON.stringify(order1) === JSON.stringify(order2),
      'Expect project pda data to be equal initial data'
    ).to.be.true;
  });

  xit('Invest project with sol', async () => {
    const destination = Keypair.generate().publicKey;

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

    const tokenOffered = 1_000_000;
    const ticketSizeSol = 0.1;
    const ticketSize = new BN(ticketSizeSol * LAMPORTS_PER_SOL);

    const projectConfigArgs: ProjectConfigArgs = {
      id: id,
      startDate: startDate,
      endDate: endDate,
      merkleRoot: merkle_root,
      tokenAddress: null,
      ticketSize: ticketSize,
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
        destination: destination,
      })
      .instruction();

    const getProof = merkleTree.getProof(keccak256(test));
    const merkle_proof = getProof.map((item) => Array.from(item.data));

    const userInvestTotal =
      randomNumber - 1 === 0 ? randomNumber : randomNumber - 1;

    const investArgs: InvestArgs = {
      projectId: projectConfigArgs.id,
      investTotal: userInvestTotal,
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

    const investIns = await program.methods
      .invest(investArgs)
      .accounts({
        investor: upgradableAuthority.publicKey,
        project: project,
        projectCounter: projectCounter,
        investorCounter: investCounter,
        destination: destination,
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

    const projectCounterData = await program.account.projectCounter.fetch(
      projectCounter
    );

    const expectedBalance = await connection.getBalance(destination);

    expect(
      expectedBalance,
      'Expected destination balace equal ticketSOL'
    ).to.eq(ticketSize.toNumber() * userInvestTotal);

    expect(
      projectCounterData.remainning,
      "Project counter should be equal investotal - user's invest total"
    ).to.eq(investTotal - userInvestTotal);

    const investCounterData = await program.account.investorCounter.fetch(
      investCounter
    );

    expect(
      investCounterData.remainning,
      'User invest counter should be equal 0 or 1'
    ).to.eq(randomNumber - userInvestTotal);
  });

  xit('Register project with token', async () => {
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

    const remainningAccounRegister: AccountMeta[] = [
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: tokenAddress,
        isSigner: false,
        isWritable: false,
      },
    ];

    const registerProjectIns = await program.methods
      .registerProject(projectConfigArgs)
      .accounts({
        adminPda: adminPda,
        creator: upgradableAuthority.publicKey,
        project: project,
        projectCounter: projectCounter,
        destination: destination,
      })
      .remainingAccounts(remainningAccounRegister)
      .instruction();

    const tx = new Transaction().add(registerProjectIns);

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

    const projectData: ProjectConfig =
      await program.account.projectConfig.fetch(project);

    const projectDataInput: ProjectConfig = {
      ...projectConfigArgs,
      destination: destination,
      tokenProgram: null,
    };

    const order1 = Object.keys(projectData)
      .sort()
      .reduce((obj, key) => {
        obj[key] = projectData[key];
        return obj;
      }, {});

    const order2 = Object.keys(projectDataInput)
      .sort()
      .reduce((obj, key) => {
        obj[key] = projectDataInput[key];
        return obj;
      }, {});

    expect(
      JSON.stringify(order1) === JSON.stringify(order2),
      'Expect project pda data to be equal initial data'
    ).to.be.true;
  });

  it('Invest project with token', async () => {
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
    const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
    // const price = (investTotal * ticketSize) / tokenOffered;

    const projectConfigArgs: ProjectConfigArgs = {
      id: id,
      startDate: startDate,
      endDate: endDate,
      merkleRoot: merkle_root,
      tokenAddress: tokenAddress,
      ticketSize: ticketSize,
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

    const remainningAccounRegister: AccountMeta[] = [
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: tokenAddress,
        isSigner: false,
        isWritable: false,
      },
    ];

    const registerProjectIns = await program.methods
      .registerProject(projectConfigArgs)
      .accounts({
        adminPda: adminPda,
        creator: upgradableAuthority.publicKey,
        project: project,
        projectCounter: projectCounter,
        destination: destination,
      })
      .remainingAccounts(remainningAccounRegister)
      .instruction();

    const getProof = merkleTree.getProof(keccak256(test));
    const merkle_proof = getProof.map((item) => Array.from(item.data));

    const userInvestTotal =
      randomNumber - 1 === 0 ? randomNumber : randomNumber - 1;

    const investArgs: InvestArgs = {
      projectId: projectConfigArgs.id,
      investTotal: userInvestTotal,
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

    const remainningAccountsInvest: AccountMeta[] = [
      ...remainningAccounRegister,
      {
        pubkey: source,
        isSigner: false,
        isWritable: true,
      },
    ];

    const investIns = await program.methods
      .invest(investArgs)
      .accounts({
        investor: upgradableAuthority.publicKey,
        project: project,
        projectCounter: projectCounter,
        investorCounter: investCounter,
        destination: destination,
      })
      .signers([upgradableAuthority])
      .remainingAccounts(remainningAccountsInvest)
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

    expect(amount, 'Destination amount should equal ticket size').to.eq(
      ticketSize.toNumber() * userInvestTotal
    );

    const projectCounterData = await program.account.projectCounter.fetch(
      projectCounter
    );

    expect(
      projectCounterData.remainning,
      "Project counter should be equal investotal - user's invest total"
    ).to.eq(investTotal - userInvestTotal);

    const investCounterData = await program.account.investorCounter.fetch(
      investCounter
    );

    expect(
      investCounterData.remainning,
      'User invest counter should be equal 0 or 1'
    ).to.eq(randomNumber - userInvestTotal);
  });

  // xit('User not in the whitelist', async () => {});

  // xit('Invest with large white list (50k)', async () => {
  //   const tokenAddress = new PublicKey(
  //     '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
  //   );

  //   const tokenData = await getMint(anchorProvider.connection, tokenAddress);

  //   const receiver = Keypair.generate().publicKey;

  //   const destination = (
  //     await getOrCreateAssociatedTokenAccount(
  //       connection,
  //       upgradableAuthority,
  //       tokenAddress,
  //       receiver
  //     )
  //   ).address;

  //   let { arrayWallet, investTotal } = generateWhiteListInvest(49999);

  //   const randomNumber = Math.floor(Math.random() * 3) + 1;
  //   const test =
  //     upgradableAuthority.publicKey.toString() + '_' + randomNumber.toString();
  //   arrayWallet.push(test);

  //   investTotal += randomNumber;

  //   const leafNode = arrayWallet.map((addr) => keccak256(addr));
  //   const merkleTree = new MerkleTree(leafNode, keccak256, {
  //     sortPairs: true,
  //   });

  //   const merkle_root = merkleTree.getRoot();

  //   const id = generateRandomObjectId();
  //   const startDate = new BN(Math.floor(Date.now() / 1000));
  //   const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

  //   const tokenOffered = 100000; // 100 000 token KYUPAD
  //   const ticketSize = 100; // 100 USDT per ticket
  //   // const price = (investTotal * ticketSize) / tokenOffered;

  //   const projectConfigArgs: ProjectConfigArgs = {
  //     id: id,
  //     startDate: startDate,
  //     endDate: endDate,
  //     merkleRoot: merkle_root,
  //     destination: destination,
  //     tokenAddress: tokenAddress,
  //     ticketSize: new BN(ticketSize * 10 ** tokenData.decimals),
  //     tokenOffered: tokenOffered,
  //     investTotal: investTotal,
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
  //     [Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()],
  //     program.programId
  //   );

  //   const registerProjectIns = await program.methods
  //     .registerProject(projectConfigArgs)
  //     .accounts({
  //       adminPda: adminPda,
  //       creator: upgradableAuthority.publicKey,
  //       project: project,
  //       projectCounter: projectCounter,
  //     })
  //     .instruction();

  //   const getProof = merkleTree.getProof(keccak256(test));
  //   const merkle_proof = getProof.map((item) => Array.from(item.data));

  //   const investArgs: InvestArgs = {
  //     projectId: projectConfigArgs.id,
  //     investTotal: randomNumber - 1 === 0 ? randomNumber : randomNumber - 1,
  //     investMaxTotal: randomNumber,
  //     merkleProof: merkle_proof,
  //   };

  //   const [investCounter] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('invest_counter'),
  //       project.toBuffer(),
  //       upgradableAuthority.publicKey.toBuffer(),
  //     ],
  //     program.programId
  //   );

  //   const source = getAssociatedTokenAddressSync(
  //     tokenAddress,
  //     upgradableAuthority.publicKey
  //   );

  //   const investIns = await program.methods
  //     .invest(investArgs)
  //     .accounts({
  //       investor: upgradableAuthority.publicKey,
  //       project: project,
  //       projectCounter: projectCounter,
  //       investorCounter: investCounter,
  //       mint: tokenAddress,
  //       source: source,
  //       destination: destination,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //     })
  //     .signers([upgradableAuthority])
  //     .instruction();

  //   const tx = new Transaction().add(registerProjectIns).add(investIns);

  //   tx.feePayer = upgradableAuthority.publicKey;
  //   tx.recentBlockhash = (
  //     await anchorProvider.connection.getLatestBlockhash()
  //   ).blockhash;

  //   tx.partialSign(upgradableAuthority);

  //   const sig = await anchorProvider.connection.sendTransaction(
  //     tx,
  //     [upgradableAuthority],
  //     {
  //       skipPreflight: true,
  //     }
  //   );

  //   console.log('Invest: ', sig);

  //   await sleep(2000);

  //   const info = await getAccount(connection, destination);
  //   const amount = Number(info.amount);

  //   expect(
  //     amount / 10 ** tokenData.decimals,
  //     'Destination amount should equal ticket size'
  //   ).to.eq(
  //     ticketSize * (randomNumber - 1 === 0 ? randomNumber : randomNumber - 1)
  //   );

  //   const projectCounterData = await program.account.projectCounter.fetch(
  //     projectCounter
  //   );

  //   expect(
  //     projectCounterData.remainning,
  //     "Project counter should be equal investotal - user's invest total"
  //   ).to.eq(
  //     investTotal - (randomNumber - 1 === 0 ? randomNumber : randomNumber - 1)
  //   );

  //   const investCounterData = await program.account.investorCounter.fetch(
  //     investCounter
  //   );

  //   expect(
  //     investCounterData.remainning,
  //     'User invest counter should be equal 0 or 1'
  //   ).to.eq(randomNumber - 1 === 0 ? 0 : 1);
  // });

  // xit('User invest over invest_total_max', async () => {});

  // xit('User of of ticket', async () => {});

  // xit('Project is out of ticket', async () => {});
});
