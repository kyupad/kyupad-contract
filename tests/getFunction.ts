import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import idl from '../target/idl/kyupad_ido.json';
import { Program, getProvider, workspace } from '@coral-xyz/anchor';
import { KyupadIdo } from '../target/types/kyupad_ido';

const getFunction = async () => {
  const connection = getProvider().connection;

  const program = workspace.KyupadIdo as Program<KyupadIdo>;

  const accounts = await connection.getProgramAccounts(program.programId, {
    dataSlice: { offset: 0, length: 0 },
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(
            idl.accounts.filter((acc) => acc.name === 'Admin')[0].discriminator
          ),
        },
      },
    ],
  });

  console.log('Get accounts: ', accounts);
};

// getFunction();
