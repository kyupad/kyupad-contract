import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  getBN,
  ICluster,
  ICreateMultipleStreamData,
  ICreateStreamData,
  StreamflowSolana,
} from '@streamflow/stream';
import bs58 from 'bs58';

import dotenv from 'dotenv';
import { generateRecipents } from './utils';
import {
  createAssociatedTokenAccount,
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { expect } from 'chai';
dotenv.config();

describe('Testing with streamflow', () => {
  const solanaClient = new StreamflowSolana.SolanaStreamClient(
    process.env.DEV_RPC_ENDPOINT!,
    ICluster.Devnet
  );
  const creator = Keypair.fromSecretKey(
    bs58.decode(process.env.VESTING_PRIVATE_KEY!)
  );

  const connection = new Connection(process.env.DEV_RPC_ENDPOINT!, 'confirmed');

  describe('Create vesting', () => {
    it('Release 100% right from the start', async () => {
      const { mint, decimals } = await setupToken({});

      const recipients = generateRecipents(10, true, decimals);

      const createStreamParams: ICreateMultipleStreamData = {
        period: 1, // Time step (period) in seconds per which the unlocking occurs.
        start: Math.floor(Date.now() / 1000) + 60, // Timestamp (in seconds) when the stream/token vesting starts.
        cliff: Math.floor(Date.now() / 1000) + 60, // Vesting contract "cliff" timestamp in seconds.
        cancelableBySender: true, // Whether or not sender can cancel the stream.
        cancelableByRecipient: false, // Whether or not recipient can cancel the stream.
        transferableBySender: true, // Whether or not sender can transfer the stream.
        transferableByRecipient: false, // Whether or not recipient can transfer the stream.
        canTopup: false, // setting to FALSE will effectively create a vesting contract.
        automaticWithdrawal: false, // Whether or not a 3rd party (e.g. cron job, "cranker") can initiate a token withdraw/transfer.
        withdrawalFrequency: 0, // Relevant when automatic withdrawal is enabled. If greater than 0 our withdrawor will take care of withdrawals. If equal to 0 our withdrawor will skip, but everyone else can initiate withdrawals.
        tokenId: mint.toString(),
        partner: undefined, //  (optional) Partner's wallet address (string | null).
        recipients: recipients,
      };

      const { txs, errors } = await solanaClient.createMultiple(
        createStreamParams,
        {
          sender: creator,
        }
      );

      expect(errors.length, 'Expect errors length must be zero').to.eql(0);
    });

    it('Release linear by the second in a minute', async () => {
      const { mint, decimals } = await setupToken({});

      const recipients = generateRecipents(5, false, decimals, 60);

      const createStreamParams: ICreateMultipleStreamData = {
        period: 1, // Time step (period) in seconds per which the unlocking occurs.
        start: Math.floor(Date.now() / 1000) + 60, // Timestamp (in seconds) when the stream/token vesting starts.
        cliff: Math.floor(Date.now() / 1000) + 60, // Vesting contract "cliff" timestamp in seconds.
        cancelableBySender: true, // Whether or not sender can cancel the stream.
        cancelableByRecipient: false, // Whether or not recipient can cancel the stream.
        transferableBySender: true, // Whether or not sender can transfer the stream.
        transferableByRecipient: false, // Whether or not recipient can transfer the stream.
        canTopup: false, // setting to FALSE will effectively create a vesting contract.
        automaticWithdrawal: false, // Whether or not a 3rd party (e.g. cron job, "cranker") can initiate a token withdraw/transfer.
        withdrawalFrequency: 0, // Relevant when automatic withdrawal is enabled. If greater than 0 our withdrawor will take care of withdrawals. If equal to 0 our withdrawor will skip, but everyone else can initiate withdrawals.
        tokenId: mint.toString(),
        partner: undefined, //  (optional) Partner's wallet address (string | null).
        recipients: recipients,
      };

      const { txs, errors } = await solanaClient.createMultiple(
        createStreamParams,
        {
          sender: creator,
        }
      );

      expect(errors.length, 'Expect errors length must be zero').to.eql(0);
    });

    it('Release linear by the minute in an hour', async () => {
      const { mint, decimals } = await setupToken({});

      const recipients = generateRecipents(2, false, decimals, 60);

      const createStreamParams: ICreateMultipleStreamData = {
        period: 60, // Time step (period) in seconds per which the unlocking occurs.
        start: Math.floor(Date.now() / 1000) + 60, // Timestamp (in seconds) when the stream/token vesting starts.
        cliff: Math.floor(Date.now() / 1000) + 60, // Vesting contract "cliff" timestamp in seconds.
        cancelableBySender: true, // Whether or not sender can cancel the stream.
        cancelableByRecipient: false, // Whether or not recipient can cancel the stream.
        transferableBySender: true, // Whether or not sender can transfer the stream.
        transferableByRecipient: false, // Whether or not recipient can transfer the stream.
        canTopup: false, // setting to FALSE will effectively create a vesting contract.
        automaticWithdrawal: false, // Whether or not a 3rd party (e.g. cron job, "cranker") can initiate a token withdraw/transfer.
        withdrawalFrequency: 0, // Relevant when automatic withdrawal is enabled. If greater than 0 our withdrawor will take care of withdrawals. If equal to 0 our withdrawor will skip, but everyone else can initiate withdrawals.
        tokenId: mint.toString(),
        partner: undefined, //  (optional) Partner's wallet address (string | null).
        recipients: recipients,
      };

      const { txs, errors } = await solanaClient.createMultiple(
        createStreamParams,
        {
          sender: creator,
        }
      );

      expect(errors.length, 'Expect errors length must be zero').to.eql(0);
    });

    it('Dont have enough token to vesting', async () => {
      const { mint, decimals } = await setupToken({ amount: 0 });

      const size = 10;

      const recipients = generateRecipents(size, false, decimals, 60);

      const createStreamParams: ICreateMultipleStreamData = {
        period: 60, // Time step (period) in seconds per which the unlocking occurs.
        start: Math.floor(Date.now() / 1000) + 60, // Timestamp (in seconds) when the stream/token vesting starts.
        cliff: Math.floor(Date.now() / 1000) + 60, // Vesting contract "cliff" timestamp in seconds.
        cancelableBySender: true, // Whether or not sender can cancel the stream.
        cancelableByRecipient: false, // Whether or not recipient can cancel the stream.
        transferableBySender: true, // Whether or not sender can transfer the stream.
        transferableByRecipient: false, // Whether or not recipient can transfer the stream.
        canTopup: false, // setting to FALSE will effectively create a vesting contract.
        automaticWithdrawal: false, // Whether or not a 3rd party (e.g. cron job, "cranker") can initiate a token withdraw/transfer.
        withdrawalFrequency: 0, // Relevant when automatic withdrawal is enabled. If greater than 0 our withdrawor will take care of withdrawals. If equal to 0 our withdrawor will skip, but everyone else can initiate withdrawals.
        tokenId: mint.toString(),
        partner: undefined, //  (optional) Partner's wallet address (string | null).
        recipients: recipients,
      };

      const { txs, errors } = await solanaClient.createMultiple(
        createStreamParams,
        {
          sender: creator,
        }
      );

      expect(errors.length, 'Expect errors length must be zero').to.eq(size);
      expect(errors[0].contractErrorCode).to.eq(undefined);
    });

    it('Invalid timestamp', async () => {
      const { mint, decimals } = await setupToken({ amount: 100000000 });

      const size = 5;

      const recipients = generateRecipents(size, false, decimals, 60);

      const createStreamParams: ICreateMultipleStreamData = {
        period: 60, // Time step (period) in seconds per which the unlocking occurs.
        start: Math.floor(Date.now() / 1000), // Timestamp (in seconds) when the stream/token vesting starts.
        cliff: Math.floor(Date.now() / 1000), // Vesting contract "cliff" timestamp in seconds.
        cancelableBySender: true, // Whether or not sender can cancel the stream.
        cancelableByRecipient: false, // Whether or not recipient can cancel the stream.
        transferableBySender: true, // Whether or not sender can transfer the stream.
        transferableByRecipient: false, // Whether or not recipient can transfer the stream.
        canTopup: false, // setting to FALSE will effectively create a vesting contract.
        automaticWithdrawal: false, // Whether or not a 3rd party (e.g. cron job, "cranker") can initiate a token withdraw/transfer.
        withdrawalFrequency: 0, // Relevant when automatic withdrawal is enabled. If greater than 0 our withdrawor will take care of withdrawals. If equal to 0 our withdrawor will skip, but everyone else can initiate withdrawals.
        tokenId: mint.toString(),
        partner: undefined, //  (optional) Partner's wallet address (string | null).
        recipients: recipients,
      };

      const { txs, errors } = await solanaClient.createMultiple(
        createStreamParams,
        {
          sender: creator,
        }
      );

      console.log(errors);

      expect(errors.length, 'Expect errors length must be zero').to.eq(size);
      expect(errors[0].contractErrorCode).to.eq('InvalidTimestamps');
    });

    const setupToken = async ({
      decimals = 9,
      amount = 100000000,
    }: {
      decimals?: number;
      amount?: number;
    }) => {
      const mint = await createMint(
        connection,
        creator,
        creator.publicKey,
        creator.publicKey,
        decimals
      );

      const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        creator,
        mint,
        creator.publicKey
      );

      await mintTo(
        connection,
        creator,
        mint,
        ata.address,
        creator.publicKey,
        amount * 10 ** decimals
      );

      return {
        mint,
        decimals,
      };
    };
  });
});
