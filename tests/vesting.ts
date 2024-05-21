import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  getBN,
  ICluster,
  ICreateMultipleStreamData,
  ICreateStreamData,
  IGetAllData,
  IRecipient,
  IWithdrawData,
  Stream,
  StreamDirection,
  StreamflowSolana,
  StreamType,
} from '@streamflow/stream';
import bs58 from 'bs58';

import dotenv from 'dotenv';
import {
  createAccount,
  createMultiple,
  generateRecipents,
  prepareWithdrawInstructions,
  sleep,
} from './utils';
import {
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { expect } from 'chai';
import PQueue from 'p-queue';
dotenv.config();

describe('Testing with streamflow', () => {
  const solanaClient = new StreamflowSolana.SolanaStreamClient(
    process.env.DEV_RPC_ENDPOINT!,
    ICluster.Devnet,
    undefined,
    undefined,
    undefined,
    new PQueue({
      concurrency: 5,
      intervalCap: 5,
      interval: 5000,
    })
  );

  const creator = Keypair.fromSecretKey(
    bs58.decode(process.env.VESTING_PRIVATE_KEY!)
  );

  const connection = new Connection(process.env.DEV_RPC_ENDPOINT!, {
    commitment: 'confirmed',
    httpAgent: false,
  });

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

      const recipients = generateRecipents(50, false, decimals, 60);

      const createStreamParams: ICreateMultipleStreamData = {
        period: 1, // Time step (period) in seconds per which the unlocking occurs.
        start: Math.floor(Date.now() / 1000) + 10000, // Timestamp (in seconds) when the stream/token vesting starts.
        cliff: Math.floor(Date.now() / 1000) + 10000, // Vesting contract "cliff" timestamp in seconds.
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

      const { txs, errors } = await createMultiple(
        createStreamParams,
        {
          sender: creator,
        },
        connection,
        new PQueue({
          concurrency: 10,
          intervalCap: 10,
          interval: 1000,
        }),
        new PublicKey('HqDGZjaVRXJ9MGRQEw7qDc2rAr6iH1n1kAQdCZaCMfMZ')
      );

      // const { txs, errors } = await solanaClient.createMultiple(
      //   createStreamParams,
      //   {
      //     sender: creator,
      //   }
      // );

      console.log(errors, txs);

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
  });

  describe('Claim', () => {
    it('Claim success', async () => {
      const { mint, decimals } = await setupToken({});

      const claimer = Keypair.generate();

      await createAccount({
        connection: connection,
        payerKeypair: creator,
        newAccountKeypair: claimer,
        lamports: 0.001 * LAMPORTS_PER_SOL,
      });

      const size = 3;

      const recipients = generateRecipents(size, false, decimals, 60);

      const amount = 1200;

      const newRecipient: IRecipient = {
        recipient: claimer.publicKey.toString(),
        amount: getBN(amount, decimals),
        name: 'Unknown',
        cliffAmount: getBN(0, decimals),
        amountPerPeriod: getBN(amount / 60, decimals),
      };

      recipients.push(newRecipient);

      const createStreamParams: ICreateMultipleStreamData = {
        period: 1, // Time step (period) in seconds per which the unlocking occurs.
        start: Math.floor(Date.now() / 1000) + 20, // Timestamp (in seconds) when the stream/token vesting starts.
        cliff: Math.floor(Date.now() / 1000) + 20, // Vesting contract "cliff" timestamp in seconds.
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

      const { metadatas, errors } = await solanaClient.createMultiple(
        createStreamParams,
        {
          sender: creator,
        }
      );

      console.log(errors);

      expect(errors.length, 'Expect errors length must be zero').to.eql(0);

      await sleep(20000);

      const data: IGetAllData = {
        address: claimer.publicKey.toString(),
        type: StreamType.Vesting,
        direction: StreamDirection.Incoming,
      };

      const streams = await solanaClient.get(data);

      if (streams.length === 0) {
        throw Error('User dont have any incoming streams');
      } else {
        const specStreams: Stream[] = [];
        for (let i = 0; i < streams.length; i++) {
          const singleStream = streams[i][1];
          const now = Math.floor(Date.now() / 1000);
          // some vesting contract is closed but closed status is false (because auto send token to user wallet in devnet is error when vesting is over)
          if (
            singleStream.mint === mint.toString() &&
            !singleStream.closed &&
            singleStream.end >= now
          ) {
            specStreams.push(singleStream);

            // Max token can claim now
            const startTime = singleStream.start;
            const period = singleStream.period;
            const amountPerPeriod = singleStream.amountPerPeriod.toNumber();

            const withdrawnToken = singleStream.withdrawnAmount.toNumber();

            const totalCanClaim: number =
              ((now - startTime) / period) * amountPerPeriod - withdrawnToken;

            // total can claim when vesting over
            console.log(
              'Total token can claim when in this vesting ended: ',
              singleStream.depositedAmount.toNumber()
            );

            console.log('Total token can claim now: ', totalCanClaim);

            // total claimed
            console.log('Total token user is claimed: ', withdrawnToken);

            const withdrawStreamParams: IWithdrawData = {
              id: metadatas[size], // Identifier of a stream to be withdrawn from.
              amount: getBN(totalCanClaim, decimals), // Requested amount to withdraw. If stream is completed, the whole amount will be withdrawn.
            };

            try {
              const widthDrawIns = await prepareWithdrawInstructions(
                withdrawStreamParams,
                {
                  invoker: claimer,
                },
                connection
              );
              const txn = new Transaction();
              for (let i = 0; i < widthDrawIns.length; i++) {
                txn.add(widthDrawIns[i]);
              }

              txn.feePayer = claimer.publicKey;
              txn.recentBlockhash = (
                await connection.getLatestBlockhash()
              ).blockhash;
              txn.partialSign(claimer);

              const sig = await connection.sendRawTransaction(txn.serialize());

              console.log('Signature: ', sig);
            } catch (exception) {
              console.log('Error: ', exception);
            }
          }
        }

        if (specStreams.length === 0) {
          throw Error('User dont have any outgoing contract with this mint');
        } else {
          // console.log(specStreams);
        }
      }
    });

    it('Claim success', async () => {
      const { mint, decimals } = await setupToken({});

      const claimer = Keypair.generate();

      await createAccount({
        connection: connection,
        payerKeypair: creator,
        newAccountKeypair: claimer,
        lamports: 0.001 * LAMPORTS_PER_SOL,
      });

      const size = 3;

      const recipients = generateRecipents(size, false, decimals, 60);

      const amount = 1200;

      const newRecipient: IRecipient = {
        recipient: claimer.publicKey.toString(),
        amount: getBN(amount, decimals),
        name: 'Unknown',
        cliffAmount: getBN(0, decimals),
        amountPerPeriod: getBN(amount / 60, decimals),
      };

      recipients.push(newRecipient);

      const createStreamParams: ICreateMultipleStreamData = {
        period: 1, // Time step (period) in seconds per which the unlocking occurs.
        start: Math.floor(Date.now() / 1000) + 20, // Timestamp (in seconds) when the stream/token vesting starts.
        cliff: Math.floor(Date.now() / 1000) + 20, // Vesting contract "cliff" timestamp in seconds.
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

      const { metadatas, errors } = await solanaClient.createMultiple(
        createStreamParams,
        {
          sender: creator,
        }
      );

      console.log(errors);

      expect(errors.length, 'Expect errors length must be zero').to.eql(0);

      await sleep(40000);

      const withdrawStreamParams: IWithdrawData = {
        id: metadatas[size], // Identifier of a stream to be withdrawn from.
        amount: getBN(amount / 60, decimals), // Requested amount to withdraw. If stream is completed, the whole amount will be withdrawn.
      };

      try {
        const widthDrawIns = await prepareWithdrawInstructions(
          withdrawStreamParams,
          {
            invoker: claimer,
          },
          connection
        );
        const txn = new Transaction();
        for (let i = 0; i < widthDrawIns.length; i++) {
          txn.add(widthDrawIns[i]);
        }

        txn.feePayer = claimer.publicKey;
        txn.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        txn.partialSign(claimer);

        const sig = await connection.sendRawTransaction(txn.serialize());

        console.log('Signature: ', sig);
      } catch (exception) {
        console.log('Error: ', exception);
      }
    });

    it('Test claim', async () => {
      const claimer = Keypair.fromSecretKey(
        bs58.decode(
          '4Nt7brdfqcxSFyDBt7XkBaW7twphq8f1Nhey5LgELw5AqjmkWszGCiZuSojLtP9fbeTTckGbH1zqqToXcFjtJPwE'
        )
      );

      // await createAccount({
      //   connection,
      //   newAccountKeypair: claimer,
      //   payerKeypair: creator,
      //   lamports: 0.01 * LAMPORTS_PER_SOL,
      // });

      const withdrawStreamParams: IWithdrawData = {
        id: '2QKGQNbHubFmEvp14vYTTWmAc7CAS3K2aEQXA3xvbdH5', // Identifier of a stream to be withdrawn from.
        amount: getBN(1000, 9), // Requested amount to withdraw. If stream is completed, the whole amount will be withdrawn.
      };

      try {
        // const { ixs, txId } = await solanaClient.withdraw(
        //   withdrawStreamParams,
        //   {
        //     invoker: claimer,
        //   }
        // );

        const widthDrawIns = await prepareWithdrawInstructions(
          withdrawStreamParams,
          {
            invoker: claimer,
          },
          connection
        );
        const txn = new Transaction();
        for (let i = 0; i < widthDrawIns.length; i++) {
          txn.add(widthDrawIns[i]);
        }

        txn.feePayer = claimer.publicKey;
        txn.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        txn.partialSign(claimer);

        const sig = await connection.sendRawTransaction(txn.serialize(), {
          skipPreflight: true,
        });

        console.log('Signature: ', sig);

        // console.log(ixs, txId);
      } catch (exception) {
        console.log('Error: ', exception);
      }
    });
  });

  describe('Fetch data vesting', () => {
    const wallet = new PublicKey(
      '5aMGztMuSVPAp4nm6vrkU25BAho6gGxpWHnnaKZfiUHP'
    );

    it('Get incoming streams', async () => {
      const data: IGetAllData = {
        address: wallet.toString(),
        type: StreamType.Vesting,
        direction: StreamDirection.Incoming,
      };

      try {
        const streams = await solanaClient.get(data);

        console.log(streams.length);
      } catch (exception) {
        console.log('Error: ', exception);

        // handle exception
      }
    });

    it('Get outgoing streams', async () => {
      const data: IGetAllData = {
        address: wallet.toString(),
        type: StreamType.Vesting,
        direction: StreamDirection.Outgoing,
      };

      try {
        const streams = await solanaClient.get(data);

        console.log(streams.length);
      } catch (exception) {
        console.log('Error: ', exception);

        // handle exception
      }
    });

    it('Get all streams', async () => {
      const data: IGetAllData = {
        address: wallet.toString(),
        type: StreamType.Vesting,
        direction: StreamDirection.All,
      };

      try {
        const streams = await solanaClient.get(data);

        console.log(streams.length);
      } catch (exception) {
        console.log('Error: ', exception);

        // handle exception
      }
    });

    it('Get incoming streams with token', async () => {
      const data: IGetAllData = {
        address: wallet.toString(),
        type: StreamType.Vesting,
        direction: StreamDirection.Incoming,
      };

      const mint = new PublicKey(
        '5SXpAwD1yvUMdib6WeWwtAsQACB9A6t7kBsZonByXAgo'
      );

      try {
        const streams = await solanaClient.get(data);

        if (streams.length === 0) {
          throw Error('User dont have any incoming streams');
        } else {
          const specStreams: Stream[] = [];
          for (let i = 0; i < streams.length; i++) {
            const singleStream = streams[i][1];
            if (singleStream.mint === mint.toString()) {
              specStreams.push(singleStream);
            }
          }

          if (specStreams.length === 0) {
            throw Error('User dont have any incoming contract with this mint');
          } else {
            console.log(specStreams);
          }
        }
      } catch (exception) {
        console.log('Error: ', exception);
      }
    });

    it('Get outgoing streams with token', async () => {
      const data: IGetAllData = {
        address: wallet.toString(),
        type: StreamType.Vesting,
        direction: StreamDirection.Outgoing,
      };

      const mint = new PublicKey(
        '5SXpAwD1yvUMdib6WeWwtAsQACB9A6t7kBsZonByXAgo'
      );

      try {
        const streams = await solanaClient.get(data);

        if (streams.length === 0) {
          throw Error('User dont have any incoming streams');
        } else {
          const specStreams: Stream[] = [];
          for (let i = 0; i < streams.length; i++) {
            if (streams[i][1].mint === mint.toString()) {
              specStreams.push(streams[i][1]);
            }
          }

          if (specStreams.length === 0) {
            throw Error('User dont have any outgoing contract with this mint');
          } else {
            console.log(specStreams);
          }
        }
      } catch (exception) {
        console.log('Error: ', exception);
      }
    });

    it('Get outgoing streams with filter', async () => {
      // Note: this address must be creator of all vesting contract
      const data: IGetAllData = {
        address: wallet.toString(),
        type: StreamType.Vesting,
        direction: StreamDirection.Outgoing,
      };

      const mint = new PublicKey(
        '8xukXAhpyfNeMePeyxVAamUyVwsymuoztB8tXCz6uNmq'
      );

      try {
        const streams = await solanaClient.get(data);

        if (streams.length === 0) {
          throw Error('User dont have any incoming streams');
        } else {
          const specStreams: Stream[] = [];
          for (let i = 0; i < streams.length; i++) {
            const singleStream = streams[i][1];
            const now = Math.floor(Date.now() / 1000);
            // some vesting contract is closed but closed status is false (because auto send token to user wallet in devnet is error when vesting is over)
            if (
              singleStream.mint === mint.toString() &&
              !singleStream.closed &&
              singleStream.end >= now
            ) {
              specStreams.push(singleStream);

              // Max token can claim now
              const startTime = singleStream.start;
              const period = singleStream.period;
              const amountPerPeriod = singleStream.amountPerPeriod.toNumber();

              const withdrawnToken = singleStream.withdrawnAmount.toNumber();

              const totalCanClaim: number =
                ((now - startTime) / period) * amountPerPeriod - withdrawnToken;

              console.log('Name: ', singleStream.name);

              // total can claim when vesting over
              console.log(
                'Total token can claim when in this vesting ended: ',
                singleStream.depositedAmount.toNumber()
              );

              console.log('Total token can claim now: ', totalCanClaim);

              // total claimed
              console.log('Total token user is claimed: ', withdrawnToken);
            }
          }

          if (specStreams.length === 0) {
            throw Error('User dont have any outgoing contract with this mint');
          } else {
            // console.log(specStreams);
          }
        }
      } catch (exception) {
        console.log('Error: ', exception);
      }
    });
  });

  const setupToken = async ({
    decimals = 9,
    amount = 100000000,
  }: {
    decimals?: number;
    amount?: number;
  }) => {
    console.log('Create token');

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

    console.log('---Success');

    return {
      mint,
      decimals,
    };
  };
});
