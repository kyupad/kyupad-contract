import {
  BN,
  workspace,
  Program,
  setProvider,
  AnchorProvider,
  IdlTypes,
  getProvider,
} from '@coral-xyz/anchor';
import { KyupadIdo } from '../target/types/kyupad_ido';
import {
  AccountMeta,
  Keypair,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
  PublicKey,
  Transaction,
  TransactionResponse,
  SystemProgram,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js';
import { assert, expect } from 'chai';
import {
  createAccount,
  generateRandomObjectId,
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
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import * as dotenv from 'dotenv';
dotenv.config();

type ProjectConfig = {
  id: String;
  startDate: BN;
  endDate: BN;
  merkleRoot: Buffer;
  tokenAddress: PublicKey;
  ticketSize: BN;
  tokenOffered: number;
  totalTicket: number;
  vaultAddress: PublicKey;
  tokenProgram: PublicKey;
};

type ProjectConfigArgs = IdlTypes<KyupadIdo>['projectConfigArgs'];
type InvestArgs = IdlTypes<KyupadIdo>['investArgs'];

describe('Test Kyupad IDO', () => {
  setProvider(AnchorProvider.env());

  const connection = getProvider().connection;

  const program = workspace.KyupadIdo as Program<KyupadIdo>;

  const upgradableAuthority = Keypair.fromSecretKey(
    bs58.decode(process.env.PRIVATE_KEY!)
  );

  describe('📦📦📦 Register project', async () => {
    it('Register project with sol', async () => {
      const vaultAddress = upgradableAuthority.publicKey;

      let { arrayWallet, totalTicket } = generateWhiteListInvest(9999);

      const randomNumber = Math.floor(Math.random() * 3) + 1;
      const test =
        upgradableAuthority.publicKey.toString() +
        '_' +
        randomNumber.toString();
      arrayWallet.push(test);

      totalTicket += randomNumber;

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
        totalTicket: totalTicket,
      };

      const [project] = PublicKey.findProgramAddressSync(
        [Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)],
        program.programId
      );

      const registerProjectIns = await program.methods
        .registerProject(projectConfigArgs)
        .accounts({
          creator: upgradableAuthority.publicKey,
          receiver: vaultAddress,
        })
        .instruction();

      const tx = new Transaction().add(registerProjectIns);

      tx.feePayer = upgradableAuthority.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      tx.partialSign(upgradableAuthority);

      const sig = await connection.sendTransaction(tx, [upgradableAuthority], {
        maxRetries: 20,
        skipPreflight: true,
        preflightCommitment: 'processed',
      });

      console.log('Register project with sol: ', sig);

      await sleep(2000);

      const projectData: ProjectConfig =
        await program.account.projectConfig.fetch(project);

      const projectDataInput: ProjectConfig = {
        ...projectConfigArgs,
        vaultAddress: vaultAddress,
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

    it('Register project with token', async () => {
      const tokenAddress = new PublicKey(
        '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
      );

      const tokenData = await getMint(connection, tokenAddress);

      const receiver = upgradableAuthority.publicKey;

      const vaultAddress = getAssociatedTokenAddressSync(
        tokenAddress,
        receiver
      );

      let { arrayWallet, totalTicket } = generateWhiteListInvest(9999);

      const randomNumber = Math.floor(Math.random() * 3) + 1;

      const test =
        upgradableAuthority.publicKey.toString() +
        '_' +
        randomNumber.toString();
      arrayWallet.push(test);

      totalTicket += randomNumber;

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
      // const price = (totalTicket * ticketSize) / tokenOffered;

      const projectConfigArgs: ProjectConfigArgs = {
        id: id,
        startDate: startDate,
        endDate: endDate,
        merkleRoot: merkle_root,
        tokenAddress: tokenAddress,
        ticketSize: new BN(ticketSize * 10 ** tokenData.decimals),
        tokenOffered: tokenOffered,
        totalTicket: totalTicket,
      };

      const [project] = PublicKey.findProgramAddressSync(
        [Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)],
        program.programId
      );

      const remainingAccounRegister: AccountMeta[] = [
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

      // const createAtaIns = createAssociatedTokenAccountInstruction(
      //   upgradableAuthority.publicKey,
      //   vaultAddress,
      //   receiver,
      //   tokenAddress
      // );

      const registerProjectIns = await program.methods
        .registerProject(projectConfigArgs)
        .accounts({
          creator: upgradableAuthority.publicKey,
          receiver: receiver,
        })
        .remainingAccounts(remainingAccounRegister)
        .instruction();

      const tx = new Transaction().add(registerProjectIns);

      tx.feePayer = upgradableAuthority.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      tx.partialSign(upgradableAuthority);

      const sig = await connection.sendTransaction(tx, [upgradableAuthority], {
        skipPreflight: true,
      });

      console.log('Register project with token: ', sig);

      await sleep(2000);

      const projectData: ProjectConfig =
        await program.account.projectConfig.fetch(project);

      const projectDataInput: ProjectConfig = {
        ...projectConfigArgs,
        vaultAddress: vaultAddress,
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

    it('Resgister project but not admin', async () => {
      const fakeAdmin = Keypair.generate();

      // create fakeMaster
      await createAccount({
        connection: connection,
        payerKeypair: upgradableAuthority,
        newAccountKeypair: fakeAdmin,
        lamports: 0.01 * LAMPORTS_PER_SOL,
      });

      const vaultAddress = fakeAdmin.publicKey;

      let { arrayWallet, totalTicket } = generateWhiteListInvest(9999);

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
        totalTicket: totalTicket,
      };

      const registerProjectIns = await program.methods
        .registerProject(projectConfigArgs)
        .accounts({
          creator: fakeAdmin.publicKey,
          receiver: vaultAddress,
        })
        .instruction();

      const tx = new Transaction().add(registerProjectIns);

      tx.feePayer = fakeAdmin.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      tx.partialSign(fakeAdmin);

      let expected_error = false;
      try {
        await connection.sendTransaction(tx, [fakeAdmin]);
      } catch (error) {
        expected_error = true;
      }

      expect(
        expected_error,
        'Expect register project transaction must be failed'
      ).to.be.true;
    });
  });

  describe('🔑🔑🔑 Permission', async () => {
    it('Init master', async () => {
      const [masterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('master')],
        program.programId
      );

      const BPF_LOADER_PROGRAM = new PublicKey(
        'BPFLoaderUpgradeab1e11111111111111111111111'
      );

      const [programData] = PublicKey.findProgramAddressSync(
        [program.programId.toBuffer()],
        BPF_LOADER_PROGRAM
      );

      const createAdminIns = await program.methods
        .initMaster(upgradableAuthority.publicKey)
        .accounts({
          signer: upgradableAuthority.publicKey,
          programData: programData,
        })
        .instruction();

      const tx = new Transaction().add(createAdminIns);

      tx.feePayer = upgradableAuthority.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      tx.partialSign(upgradableAuthority);

      const sig = await connection.sendTransaction(tx, [upgradableAuthority], {
        maxRetries: 20,
        skipPreflight: true,
      });
      await sleep(2000);

      const masterData = await program.account.master.fetch(masterPda);

      console.log('Init master: ', sig);

      expect(
        masterData.masterKey.toString() ===
          upgradableAuthority.publicKey.toString(),
        'Expect master PDA have the key of master'
      ).to.be.true;
    });

    it('Add admin', async () => {
      const adminAddress = new PublicKey(
        '6N4XbeWRUS2Hqy7zBpXZHtQzd4rYYvn8mtfHDRvVYX2X'
      );

      // const adminAddress = upgradableAuthority.publicKey;

      const addAdminIns = await program.methods
        .addAdmin(adminAddress)
        .accounts({
          signer: upgradableAuthority.publicKey,
        })
        .instruction();

      const tx = new Transaction().add(addAdminIns);

      tx.feePayer = upgradableAuthority.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      tx.partialSign(upgradableAuthority);

      const sig = await connection.sendTransaction(tx, [upgradableAuthority], {
        maxRetries: 20,
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });
      await sleep(2000);

      const [adminPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('admin'), adminAddress.toBuffer()],
        program.programId
      );

      const adminPdaData = await program.account.admin.fetch(adminPda);

      console.log('Add admin: ', sig);

      expect(
        adminPdaData.adminKey.toString() === adminAddress.toString(),
        'This account must to be initialize'
      ).to.be.true;
    });

    it('Init another master but not deployer', async () => {
      const fakeDeployer = Keypair.generate();

      // create fakeMaster
      await createAccount({
        connection: connection,
        payerKeypair: upgradableAuthority,
        newAccountKeypair: fakeDeployer,
        lamports: 0.01 * LAMPORTS_PER_SOL,
      });

      const BPF_LOADER_PROGRAM = new PublicKey(
        'BPFLoaderUpgradeab1e11111111111111111111111'
      );

      const [programData] = PublicKey.findProgramAddressSync(
        [program.programId.toBuffer()],
        BPF_LOADER_PROGRAM
      );

      const createAdminIns = await program.methods
        .initMaster(fakeDeployer.publicKey)
        .accounts({
          signer: fakeDeployer.publicKey,
          programData: programData,
        })
        .instruction();

      const tx = new Transaction().add(createAdminIns);

      tx.feePayer = fakeDeployer.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      tx.partialSign(fakeDeployer);

      let expected_error = false;
      try {
        await connection.sendTransaction(tx, [fakeDeployer], {
          skipPreflight: true,
        });
      } catch (error) {
        expected_error = true;
      }

      expect(expected_error, 'Expect invest transaction must be failed').to.be
        .true;
    });

    it('Addadmin but not master', async () => {
      const fakeMaster = Keypair.generate();

      // create fakeMaster
      await createAccount({
        connection: connection,
        payerKeypair: upgradableAuthority,
        newAccountKeypair: fakeMaster,
        lamports: 0.01 * LAMPORTS_PER_SOL,
      });

      const addAdminIns = await program.methods
        .addAdmin(fakeMaster.publicKey)
        .accounts({
          signer: fakeMaster.publicKey,
        })
        .instruction();

      const tx = new Transaction().add(addAdminIns);

      tx.feePayer = fakeMaster.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      tx.partialSign(fakeMaster);

      let expected_error = false;
      try {
        await connection.sendTransaction(tx, [fakeMaster]);
      } catch (error) {
        expected_error = true;
      }

      expect(expected_error, 'Expect invest transaction must be failed').to.be
        .true;
    });
  });

  describe('💰💰💰 Invest', () => {
    describe('1️⃣ With no ticket', () => {
      it('D1: Try to invest', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet, totalTicket } = generateWhiteListInvest(9999);

        const randomNumber = Math.floor(Math.random() * 3) + 1;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          randomNumber.toString();

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
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
        };

        const remainingAccounRegister: AccountMeta[] = [
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

        const createAtaIns = createAssociatedTokenAccountInstruction(
          upgradableAuthority.publicKey,
          vaultAddress,
          receiver,
          tokenAddress
        );

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket =
          randomNumber - 1 === 0 ? randomNumber : randomNumber - 1;

        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: randomNumber,
          merkleProof: merkle_proof,
        };

        const source = getAssociatedTokenAddressSync(
          tokenAddress,
          upgradableAuthority.publicKey
        );

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(createAtaIns)
          .add(registerProjectIns)
          .add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);
        let expected_error = false;
        try {
          await connection.sendTransaction(tx, [upgradableAuthority]);
        } catch (error) {
          expected_error = true;
        }

        expect(expected_error, 'Expect invest transaction must be failed').to.be
          .true;
      });

      it('D2: Out of time', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet, totalTicket } = generateWhiteListInvest(9999);

        const randomNumber = Math.floor(Math.random() * 3) + 1;

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000) - 3000);
        const endDate = new BN(Math.floor(Date.now() / 1000) - 100);

        const tokenOffered = 100000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
        };

        const remainingAccounRegister: AccountMeta[] = [
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

        const createAtaIns = createAssociatedTokenAccountInstruction(
          upgradableAuthority.publicKey,
          vaultAddress,
          receiver,
          tokenAddress
        );

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const usertotalTicket =
          randomNumber - 1 === 0 ? randomNumber : randomNumber - 1;

        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: randomNumber,
          merkleProof: [[]],
        };

        const source = getAssociatedTokenAddressSync(
          tokenAddress,
          upgradableAuthority.publicKey
        );

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(createAtaIns)
          .add(registerProjectIns)
          .add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);
        let expected_error = false;
        try {
          await connection.sendTransaction(tx, [upgradableAuthority]);
        } catch (error) {
          expected_error = true;
        }

        expect(expected_error, 'Expect invest transaction must be failed').to.be
          .true;
      });
    });

    describe('2️⃣ With 1 ticket', () => {
      it('D3: Success', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 1;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000));
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const totalTicket = 1500;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
        };

        const [project] = PublicKey.findProgramAddressSync(
          [Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)],
          program.programId
        );

        const [projectCounter] = PublicKey.findProgramAddressSync(
          [Buffer.from('project_counter'), project.toBuffer()],
          program.programId
        );

        const remainingAccounRegister: AccountMeta[] = [
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

        const createAtaIns = createAssociatedTokenAccountInstruction(
          upgradableAuthority.publicKey,
          vaultAddress,
          receiver,
          tokenAddress
        );

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: usertotalTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(createAtaIns)
          .add(registerProjectIns)
          .add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        const sig = await connection.sendTransaction(
          tx,
          [upgradableAuthority],
          {
            skipPreflight: true,
          }
        );

        console.log('Invest: ', sig);

        await sleep(2000);

        const info = await getAccount(connection, vaultAddress);
        const amount = Number(info.amount);

        expect(amount, 'vaultAddress amount should equal ticket size').to.eq(
          ticketSize.toNumber() * usertotalTicket
        );

        const projectCounterData = await program.account.projectCounter.fetch(
          projectCounter
        );

        expect(
          projectCounterData.remaining,
          "Project counter should be equal investotal - user's invest total"
        ).to.eq(totalTicket - usertotalTicket);

        const investCounterData = await program.account.investorCounter.fetch(
          investCounter
        );

        expect(
          investCounterData.totalInvestedTicket,
          'User invest counter should be equal 0'
        ).to.eq(1);
      });

      it('D4: Before invest time', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet, totalTicket } = generateWhiteListInvest(9999);

        const randomNumber = Math.floor(Math.random() * 3) + 1;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          randomNumber.toString();

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000) + 1000);
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const tokenOffered = 100000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
        };

        const [project] = PublicKey.findProgramAddressSync(
          [Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)],
          program.programId
        );

        const [projectCounter] = PublicKey.findProgramAddressSync(
          [Buffer.from('project_counter'), project.toBuffer()],
          program.programId
        );

        const remainingAccounRegister: AccountMeta[] = [
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

        const createAtaIns = createAssociatedTokenAccountInstruction(
          upgradableAuthority.publicKey,
          vaultAddress,
          receiver,
          tokenAddress
        );

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket =
          randomNumber - 1 === 0 ? randomNumber : randomNumber - 1;

        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: randomNumber,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(createAtaIns)
          .add(registerProjectIns)
          .add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);
        let expected_error = false;
        try {
          await connection.sendTransaction(tx, [upgradableAuthority]);
        } catch (error) {
          expected_error = true;
        }

        expect(expected_error, 'Expect invest transaction must be failed').to.be
          .true;
      });

      it('D5: After invest time', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 1;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000) + 1000);
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const totalTicket = 1500;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
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

        const remainingAccounRegister: AccountMeta[] = [
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

        const createAtaIns = createAssociatedTokenAccountInstruction(
          upgradableAuthority.publicKey,
          vaultAddress,
          receiver,
          tokenAddress
        );

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: usertotalTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(createAtaIns)
          .add(registerProjectIns)
          .add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        let expected_error = false;
        try {
          await connection.sendTransaction(tx, [upgradableAuthority]);
        } catch (error) {
          expected_error = true;
        }

        expect(expected_error, 'Expect invest transaction must be failed').to.be
          .true;
      });

      it('D6: Try to invest with more tickets then they have', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 1;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000));
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const totalTicket = 1500;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
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

        const remainingAccounRegister: AccountMeta[] = [
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

        const createAtaIns = createAssociatedTokenAccountInstruction(
          upgradableAuthority.publicKey,
          vaultAddress,
          receiver,
          tokenAddress
        );

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket + 1,
          maxTicketAmount: usertotalTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(createAtaIns)
          .add(registerProjectIns)
          .add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        let expected_error = false;
        try {
          await connection.sendTransaction(tx, [upgradableAuthority]);
        } catch (error) {
          expected_error = true;
        }

        expect(expected_error, 'Expect invest transaction must be failed').to.be
          .true;
      });

      it('D7: User is out of ticket', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 1;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000));
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const totalTicket = 1500;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
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

        const remainingAccounRegister: AccountMeta[] = [
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

        const createAtaIns = createAssociatedTokenAccountInstruction(
          upgradableAuthority.publicKey,
          vaultAddress,
          receiver,
          tokenAddress
        );

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: usertotalTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(createAtaIns)
          .add(registerProjectIns)
          .add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        await connection.sendTransaction(tx, [upgradableAuthority]);

        const investSecondTimeIns = await program.methods
          .invest(investArgs)
          .accounts({
            investor: upgradableAuthority.publicKey,
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx_2 = new Transaction().add(investSecondTimeIns);

        tx_2.feePayer = upgradableAuthority.publicKey;
        tx_2.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;

        tx_2.partialSign(upgradableAuthority);

        let expected_error = false;
        try {
          await connection.sendTransaction(tx_2, [upgradableAuthority]);
        } catch (error) {
          expected_error = true;
        }

        expect(expected_error, 'Expect invest transaction must be failed').to.be
          .true;
      });

      it('D8: Project is out of ticket', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 2;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000));
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const totalTicket = 1;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
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

        const remainingAccounRegister: AccountMeta[] = [
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

        const createAtaIns = createAssociatedTokenAccountInstruction(
          upgradableAuthority.publicKey,
          vaultAddress,
          receiver,
          tokenAddress
        );

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket - 1;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: userTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(createAtaIns)
          .add(registerProjectIns)
          .add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        await connection.sendTransaction(tx, [upgradableAuthority], {
          skipPreflight: true,
        });

        const investSecondTimeIns = await program.methods
          .invest(investArgs)
          .accounts({
            investor: upgradableAuthority.publicKey,
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx_2 = new Transaction().add(investSecondTimeIns);

        tx_2.feePayer = upgradableAuthority.publicKey;
        tx_2.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;

        tx_2.partialSign(upgradableAuthority);

        let expected_error = false;
        try {
          await connection.sendTransaction(tx_2, [upgradableAuthority]);
        } catch (error) {
          expected_error = true;
        }

        expect(expected_error, 'Expect invest transaction must be failed').to.be
          .true;
      });
    });

    describe('3️⃣ With 2 ticket', () => {
      it('D10: Success with 1 ticket', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 2;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000));
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const totalTicket = 1500;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
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

        const remainingAccounRegister: AccountMeta[] = [
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

        const createAtaIns = createAssociatedTokenAccountInstruction(
          upgradableAuthority.publicKey,
          vaultAddress,
          receiver,
          tokenAddress
        );

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket - 1;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: userTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(createAtaIns)
          .add(registerProjectIns)
          .add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        const sig = await connection.sendTransaction(
          tx,
          [upgradableAuthority],
          {
            skipPreflight: true,
          }
        );

        console.log('Invest: ', sig);

        await sleep(2000);

        const info = await getAccount(connection, vaultAddress);
        const amount = Number(info.amount);

        expect(amount, 'vaultAddress amount should equal ticket size').to.eq(
          ticketSize.toNumber() * usertotalTicket
        );

        const projectCounterData = await program.account.projectCounter.fetch(
          projectCounter
        );

        expect(
          projectCounterData.remaining,
          "Project counter should be equal investotal - user's invest total"
        ).to.eq(totalTicket - usertotalTicket);

        const investCounterData = await program.account.investorCounter.fetch(
          investCounter
        );

        expect(
          investCounterData.totalInvestedTicket,
          'User invest counter should be equal usertotalTicket'
        ).to.eq(usertotalTicket);
      });

      it('D11: Success with second time invesment', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 2;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000));
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const totalTicket = 1500;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
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

        const remainingAccounRegister: AccountMeta[] = [
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

        const createAtaIns = createAssociatedTokenAccountInstruction(
          upgradableAuthority.publicKey,
          vaultAddress,
          receiver,
          tokenAddress
        );

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket - 1;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: userTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(createAtaIns)
          .add(registerProjectIns)
          .add(investIns)
          .add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        const sig = await connection.sendTransaction(
          tx,
          [upgradableAuthority],
          {
            skipPreflight: true,
          }
        );

        console.log('Invest: ', sig);

        await sleep(2000);

        const info = await getAccount(connection, vaultAddress);
        const amount = Number(info.amount);

        expect(amount, 'vaultAddress amount should equal ticket size').to.eq(
          ticketSize.toNumber() * userTicket
        );

        const projectCounterData = await program.account.projectCounter.fetch(
          projectCounter
        );

        expect(
          projectCounterData.remaining,
          "Project counter should be equal investotal - user's invest total"
        ).to.eq(totalTicket - userTicket);

        const investCounterData = await program.account.investorCounter.fetch(
          investCounter
        );

        expect(
          investCounterData.totalInvestedTicket,
          'User invest counter should be equal 0'
        ).to.eq(2);
      });

      it('D12: Success with 2 ticket', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 2;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000));
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const totalTicket = 1500;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
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

        const remainingAccounRegister: AccountMeta[] = [
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

        const createAtaIns = createAssociatedTokenAccountInstruction(
          upgradableAuthority.publicKey,
          vaultAddress,
          receiver,
          tokenAddress
        );

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: userTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(createAtaIns)
          .add(registerProjectIns)
          .add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        const sig = await connection.sendTransaction(
          tx,
          [upgradableAuthority],
          {
            skipPreflight: true,
          }
        );

        console.log('Invest: ', sig);

        await sleep(2000);

        const info = await getAccount(connection, vaultAddress);
        const amount = Number(info.amount);

        expect(amount, 'vaultAddress amount should equal ticket size').to.eq(
          ticketSize.toNumber() * usertotalTicket
        );

        const projectCounterData = await program.account.projectCounter.fetch(
          projectCounter
        );

        expect(
          projectCounterData.remaining,
          "Project counter should be equal investotal - user's invest total"
        ).to.eq(totalTicket - usertotalTicket);

        const investCounterData = await program.account.investorCounter.fetch(
          investCounter
        );

        expect(
          investCounterData.totalInvestedTicket,
          'User invest counter should be equal 2'
        ).to.eq(2);
      });

      it('D13: Before invest time', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 2;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000) + 1000);
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const totalTicket = 1500;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
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

        const remainingAccounRegister: AccountMeta[] = [
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
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: userTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction().add(registerProjectIns).add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        let expected_error = false;
        try {
          await connection.sendTransaction(tx, [upgradableAuthority]);
        } catch (error) {
          expected_error = true;
        }

        expect(expected_error, 'Expect invest transaction must be failed').to.be
          .true;
      });

      it('D14: Afteer invest time', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 2;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000) - 3000);
        const endDate = new BN(Math.floor(Date.now() / 1000) - 1000);

        const totalTicket = 1500;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
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

        const remainingAccounRegister: AccountMeta[] = [
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
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: userTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction().add(registerProjectIns).add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        let expected_error = false;
        try {
          await connection.sendTransaction(tx, [upgradableAuthority]);
        } catch (error) {
          expected_error = true;
        }

        expect(expected_error, 'Expect invest transaction must be failed').to.be
          .true;
      });

      it('D15: Number tiket is bigger than they have', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 2;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000));
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const totalTicket = 1500;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
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

        const remainingAccounRegister: AccountMeta[] = [
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
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket + 1;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: userTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction().add(registerProjectIns).add(investIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        let expected_error = false;
        try {
          await connection.sendTransaction(tx, [upgradableAuthority]);
        } catch (error) {
          expected_error = true;
        }

        expect(expected_error, 'Expect invest transaction must be failed').to.be
          .true;
      });

      it('D16: Number tiket is bigger than they have', async () => {
        const tokenAddress = new PublicKey(
          '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        );

        const tokenData = await getMint(connection, tokenAddress);

        const receiver = Keypair.generate().publicKey;

        const vaultAddress = getAssociatedTokenAddressSync(
          tokenAddress,
          receiver
        );

        let { arrayWallet } = generateWhiteListInvest(100);
        const userTicket = 2;
        const test =
          upgradableAuthority.publicKey.toString() +
          '_' +
          userTicket.toString();
        arrayWallet.push(test);

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000));
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const totalTicket = 1500;
        const tokenOffered = 10000; // 100 000 token KYUPAD
        const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        // const price = (totalTicket * ticketSize) / tokenOffered;

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: tokenAddress,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
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

        const remainingAccounRegister: AccountMeta[] = [
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
            creator: upgradableAuthority.publicKey,
            receiver: receiver,
          })
          .remainingAccounts(remainingAccounRegister)
          .instruction();

        const getProof = merkleTree.getProof(keccak256(test));
        const merkle_proof = getProof.map((item) => Array.from(item.data));

        const usertotalTicket = userTicket - 1;
        const investArgs: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: usertotalTicket,
          maxTicketAmount: userTicket,
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

        const remainingAccountsInvest: AccountMeta[] = [
          ...remainingAccounRegister,
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
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const investArgs2: InvestArgs = {
          projectId: projectConfigArgs.id,
          ticketAmount: 2,
          maxTicketAmount: userTicket,
          merkleProof: merkle_proof,
        };

        const investIns2 = await program.methods
          .invest(investArgs2)
          .accounts({
            investor: upgradableAuthority.publicKey,
            vaultAddress: vaultAddress,
          })
          .signers([upgradableAuthority])
          .remainingAccounts(remainingAccountsInvest)
          .instruction();

        const tx = new Transaction()
          .add(registerProjectIns)
          .add(investIns)
          .add(investIns2);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        let expected_error = false;
        try {
          await connection.sendTransaction(tx, [upgradableAuthority]);
        } catch (error) {
          expected_error = true;
        }

        expect(expected_error, 'Expect invest transaction must be failed').to.be
          .true;
      });
    });

    describe('4️⃣ Multiple user', async () => {
      it('Invest successfully', async () => {
        const vaultAddress = upgradableAuthority.publicKey;

        const number_of_user = 5000;

        const arrayUserKeypair: Keypair[] = [];

        const arrayWallet: string[] = [];

        const arrayMaxTicketAmount: number[] = [];

        let totalTicket = 0;

        // preprare transfer sol to user
        for (let i = 0; i < number_of_user; i++) {
          console.log(`💲💲💲 Transfer sol for user ${i}`);

          const userKeypair = Keypair.generate();

          arrayUserKeypair.push(userKeypair);

          const randomNumber = Math.floor(Math.random() * 3) + 1;

          arrayMaxTicketAmount.push(randomNumber);

          arrayWallet.push(
            userKeypair.publicKey.toString() + '_' + randomNumber.toString()
          );

          totalTicket += randomNumber;

          await createAccount({
            connection: connection,
            payerKeypair: upgradableAuthority,
            newAccountKeypair: userKeypair,
            lamports: (0.00001 * randomNumber + 0.0015) * LAMPORTS_PER_SOL,
          });
        }

        const leafNode = arrayWallet.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNode, keccak256, {
          sortPairs: true,
        });

        const merkle_root = merkleTree.getRoot();

        const id = generateRandomObjectId();
        const startDate = new BN(Math.floor(Date.now() / 1000));
        const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

        const tokenOffered = 1_000_000;
        const ticketSize = new BN(0.00001 * LAMPORTS_PER_SOL);

        const projectConfigArgs: ProjectConfigArgs = {
          id: id,
          startDate: startDate,
          endDate: endDate,
          merkleRoot: merkle_root,
          tokenAddress: null,
          ticketSize: ticketSize,
          tokenOffered: tokenOffered,
          totalTicket: totalTicket,
        };

        const registerProjectIns = await program.methods
          .registerProject(projectConfigArgs)
          .accounts({
            creator: upgradableAuthority.publicKey,
            receiver: vaultAddress,
          })
          .instruction();

        const tx = new Transaction().add(registerProjectIns);

        tx.feePayer = upgradableAuthority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.partialSign(upgradableAuthority);

        const sig = await connection.sendTransaction(
          tx,
          [upgradableAuthority],
          {
            maxRetries: 20,
            preflightCommitment: 'processed',
          }
        );

        console.log('Register project with sol: ', sig);

        // invest
        for (let i = 0; i < number_of_user; i++) {
          const ticketAmount =
            arrayMaxTicketAmount[i] - 1 === 0
              ? arrayMaxTicketAmount[i]
              : arrayMaxTicketAmount[i] - 1;

          console.log(
            `User ${i + 1}: ${
              arrayUserKeypair[i].publicKey
            } invest ${ticketAmount}`
          );

          const wallet_with_max =
            arrayUserKeypair[i].publicKey.toString() +
            '_' +
            arrayMaxTicketAmount[i].toString();

          const getProof = merkleTree.getProof(keccak256(wallet_with_max));

          const merkle_proof = getProof.map((item) => Array.from(item.data));

          const investArgs: InvestArgs = {
            projectId: id,
            ticketAmount: ticketAmount,
            maxTicketAmount: arrayMaxTicketAmount[i],
            merkleProof: merkle_proof,
          };

          const investIns = await program.methods
            .invest(investArgs)
            .accounts({
              investor: arrayUserKeypair[i].publicKey,
              vaultAddress: vaultAddress,
            })
            .signers([arrayUserKeypair[i]])
            .instruction();

          const tx = new Transaction().add(investIns);
          tx.feePayer = arrayUserKeypair[i].publicKey;
          tx.recentBlockhash = (
            await connection.getLatestBlockhash()
          ).blockhash;

          tx.partialSign(arrayUserKeypair[i]);

          const sig = await connection.sendTransaction(
            tx,
            [arrayUserKeypair[i]],
            { skipPreflight: true }
          );

          console.log('Invest: ', sig);
        }
      });
    });

    // xit('Invest project with sol', async () => {
    //   const vaultAddress = Keypair.generate().publicKey;

    //   let { arrayWallet, totalTicket } = generateWhiteListInvest(9999);

    //   const randomNumber = Math.floor(Math.random() * 3) + 1;
    //   const test =
    //     upgradableAuthority.publicKey.toString() +
    //     '_' +
    //     randomNumber.toString();
    //   arrayWallet.push(test);

    //   totalTicket += randomNumber;

    //   const leafNode = arrayWallet.map((addr) => keccak256(addr));
    //   const merkleTree = new MerkleTree(leafNode, keccak256, {
    //     sortPairs: true,
    //   });

    //   const merkle_root = merkleTree.getRoot();

    //   const id = generateRandomObjectId();
    //   const startDate = new BN(Math.floor(Date.now() / 1000));
    //   const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

    //   const tokenOffered = 1_000_000;
    //   const ticketSizeSol = 0.1;
    //   const ticketSize = new BN(ticketSizeSol * LAMPORTS_PER_SOL);

    //   const projectConfigArgs: ProjectConfigArgs = {
    //     id: id,
    //     startDate: startDate,
    //     endDate: endDate,
    //     merkleRoot: merkle_root,
    //     tokenAddress: null,
    //     ticketSize: ticketSize,
    //     tokenOffered: tokenOffered,
    //     totalTicket: totalTicket,
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
    //       creator: upgradableAuthority.publicKey,
    //       receiver: vaultAddress,
    //     })
    //     .instruction();

    //   const getProof = merkleTree.getProof(keccak256(test));
    //   const merkle_proof = getProof.map((item) => Array.from(item.data));

    //   const usertotalTicket =
    //     randomNumber - 1 === 0 ? randomNumber : randomNumber - 1;

    //   const investArgs: InvestArgs = {
    //     projectId: projectConfigArgs.id,
    //     ticketAmount: usertotalTicket,
    //     maxTicketAmount: randomNumber,
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

    //   const investIns = await program.methods
    //     .invest(investArgs)
    //     .accounts({
    //       investor: upgradableAuthority.publicKey,
    //       vaultAddress: vaultAddress,
    //     })
    //     .signers([upgradableAuthority])
    //     .instruction();

    //   const tx = new Transaction().add(registerProjectIns).add(investIns);

    //   tx.feePayer = upgradableAuthority.publicKey;
    //   tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    //   tx.partialSign(upgradableAuthority);

    //   const sig = await connection.sendTransaction(tx, [upgradableAuthority], {
    //     skipPreflight: true,
    //   });

    //   console.log('Invest: ', sig);

    //   await sleep(2000);

    //   const projectCounterData = await program.account.projectCounter.fetch(
    //     projectCounter
    //   );

    //   const expectedBalance = await connection.getBalance(vaultAddress);

    //   expect(
    //     expectedBalance,
    //     'Expected vaultAddress balace equal ticketSOL'
    //   ).to.eq(ticketSize.toNumber() * usertotalTicket);

    //   expect(
    //     projectCounterData.remaining,
    //     "Project counter should be equal investotal - user's invest total"
    //   ).to.eq(totalTicket - usertotalTicket);

    //   const investCounterData = await program.account.investorCounter.fetch(
    //     investCounter
    //   );

    //   expect(
    //     investCounterData.totalInvestedTicket,
    //     'User invest counter should be equal 0 or 1'
    //   ).to.eq(randomNumber - usertotalTicket);
    // });

    // xit('Invest project with token', async () => {
    //   const tokenAddress = new PublicKey(
    //     '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
    //   );

    //   const tokenData = await getMint(connection, tokenAddress);

    //   const receiver = Keypair.generate().publicKey;

    //   const vaultAddress = (
    //     await getOrCreateAssociatedTokenAccount(
    //       connection,
    //       upgradableAuthority,
    //       tokenAddress,
    //       receiver
    //     )
    //   ).address;

    //   let { arrayWallet } = generateWhiteListInvest(9999);

    //   const usertotalTicket = 1;
    //   const test =
    //     upgradableAuthority.publicKey.toString() +
    //     '_' +
    //     usertotalTicket.toString();
    //   arrayWallet.push(test);

    //   const leafNode = arrayWallet.map((addr) => keccak256(addr));
    //   const merkleTree = new MerkleTree(leafNode, keccak256, {
    //     sortPairs: true,
    //   });

    //   const merkle_root = merkleTree.getRoot();

    //   const id = generateRandomObjectId();
    //   const startDate = new BN(Math.floor(Date.now() / 1000));
    //   const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);

    //   const totalTicket = 1500;
    //   const tokenOffered = 10000; // 100 000 token KYUPAD
    //   const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
    //   // const price = (totalTicket * ticketSize) / tokenOffered;

    //   const projectConfigArgs: ProjectConfigArgs = {
    //     id: id,
    //     startDate: startDate,
    //     endDate: endDate,
    //     merkleRoot: merkle_root,
    //     tokenAddress: tokenAddress,
    //     ticketSize: ticketSize,
    //     tokenOffered: tokenOffered,
    //     totalTicket: totalTicket,
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

    //   const remainingAccounRegister: AccountMeta[] = [
    //     {
    //       pubkey: TOKEN_PROGRAM_ID,
    //       isSigner: false,
    //       isWritable: false,
    //     },
    //     {
    //       pubkey: tokenAddress,
    //       isSigner: false,
    //       isWritable: false,
    //     },
    //   ];

    //   const registerProjectIns = await program.methods
    //     .registerProject(projectConfigArgs)
    //     .accounts({
    //       creator: upgradableAuthority.publicKey,
    //       receiver: receiver,
    //     })
    //     .remainingAccounts(remainingAccounRegister)
    //     .instruction();

    //   const getProof = merkleTree.getProof(keccak256(test));
    //   const merkle_proof = getProof.map((item) => Array.from(item.data));

    //   const investArgs: InvestArgs = {
    //     projectId: projectConfigArgs.id,
    //     ticketAmount: usertotalTicket,
    //     maxTicketAmount: usertotalTicket,
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

    //   const remainingAccountsInvest: AccountMeta[] = [
    //     ...remainingAccounRegister,
    //     {
    //       pubkey: source,
    //       isSigner: false,
    //       isWritable: true,
    //     },
    //   ];

    //   const investIns = await program.methods
    //     .invest(investArgs)
    //     .accounts({
    //       investor: upgradableAuthority.publicKey,
    //       vaultAddress: vaultAddress,
    //     })
    //     .signers([upgradableAuthority])
    //     .remainingAccounts(remainingAccountsInvest)
    //     .instruction();

    //   const tx = new Transaction().add(registerProjectIns).add(investIns);

    //   tx.feePayer = upgradableAuthority.publicKey;
    //   tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    //   tx.partialSign(upgradableAuthority);

    //   const sig = await connection.sendTransaction(tx, [upgradableAuthority], {
    //     skipPreflight: true,
    //   });

    //   console.log('Invest: ', sig);

    //   await sleep(2000);

    //   const info = await getAccount(connection, vaultAddress);
    //   const amount = Number(info.amount);

    //   expect(amount, 'vaultAddress amount should equal ticket size').to.eq(
    //     ticketSize.toNumber()
    //   );

    //   const projectCounterData = await program.account.projectCounter.fetch(
    //     projectCounter
    //   );

    //   expect(
    //     projectCounterData.remaining,
    //     "Project counter should be equal investotal - user's invest total"
    //   ).to.eq(totalTicket - usertotalTicket);

    //   const investCounterData = await program.account.investorCounter.fetch(
    //     investCounter
    //   );

    //   expect(
    //     investCounterData.totalInvestedTicket,
    //     'User invest counter should be equal 0'
    //   ).to.eq(0);
    // });
  });
});
