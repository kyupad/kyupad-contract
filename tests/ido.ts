import {
  AnchorProvider,
  BN,
  IdlTypes,
  Program,
  setProvider,
  workspace,
} from '@coral-xyz/anchor';
import { KyupadSmartContract } from '../target/types/kyupad_smart_contract';
import { Keypair, PublicKey } from '@solana/web3.js';
import { expect } from 'chai';
import { generateRandomObjectId, generateWhiteList } from './utils';
import keccak256 from 'keccak256';
import MerkleTree from 'merkletreejs';

type Permission = IdlTypes<KyupadSmartContract>['Permission'];
type ProjectConfigArgs = IdlTypes<KyupadSmartContract>['ProjectConfigArgs'];

describe('kyupad-smart-contract', () => {
  setProvider(AnchorProvider.env());

  const program = workspace.KyupadSmartContract as Program<KyupadSmartContract>;

  const anchorProvider = program.provider as AnchorProvider;
  const upgradableAuthority = anchorProvider.wallet.publicKey;

  beforeEach('Init admin', async () => {
    const [adminPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin'), upgradableAuthority.toBuffer()],
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

    const tx = await program.methods
      .initAdmin(upgradableAuthority, [idoPermission])
      .accounts({
        signer: upgradableAuthority,
        adminPda: adminPda,
        kyupadProgramData: kyupadProgramData,
        bpfLoaderUpgradeable: BPF_LOADER_PROGRAM,
      })
      .rpc({
        maxRetries: 20,
      });

    console.log('Init admin: ', tx);

    const adminPdaData: Array<Permission> = (
      await program.account.admin.fetch(adminPda)
    ).permissions;

    const foundPermission = adminPdaData.some((permission: Permission) => {
      return JSON.stringify(permission) === JSON.stringify(idoPermission);
    });

    expect(foundPermission, 'Expect admin have right to register project').to.be
      .true;
  });

  it('Register project', async () => {
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
      ticketSize: 0,
    };

    const [project] = PublicKey.findProgramAddressSync(
      [Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)],
      program.programId
    );

    const [adminPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('admin'), upgradableAuthority.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .registerProject(projectConfigArgs)
      .accounts({
        adminPda: adminPda,
        creator: upgradableAuthority,
        project: project,
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
});
