import {
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  ata,
  executeMultipleTransactions,
  executeTransaction,
  getMintAndProgram,
  prepareBaseInstructions,
  prepareWrappedAccount,
} from '@streamflow/common/solana';
import {
  ICreateMultiError,
  ICreateMultipleStreamData,
  IMultiTransactionResult,
  IRecipient,
  IStreamConfig,
  IWithdrawData,
  WITHDRAW_AVAILABLE_AMOUNT,
  getBN,
} from '@streamflow/stream';
import { sha256 } from 'js-sha256';

import {
  BN,
  BatchItem,
  ICreateStreamSolanaExt,
  IInteractStreamSolanaExt,
  MetadataRecipientHashMap,
  createStreamInstruction,
  decodeStream,
  extractSolanaErrorCode,
  sendAndConfirmStreamRawTransaction,
  signAllTransactionWithRecipients,
} from '@streamflow/stream/solana';

import * as BufferLayout from '@solana/buffer-layout';

import { ObjectId } from 'mongodb';
import PQueue from 'p-queue';
// import {
//   FEE_ORACLE_PUBLIC_KEY,
//   WITHDRAWOR_PUBLIC_KEY,
// } from '@streamflow/stream/dist/solana/constants';
import { ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const WITHDRAWOR_PUBLIC_KEY = new PublicKey(
  'wdrwhnCv4pzW8beKsbPa4S2UDZrXenjg16KJdKSpb5u'
);

export const FEE_ORACLE_PUBLIC_KEY = new PublicKey(
  'B743wFVk2pCYhV91cn287e1xY7f1vt4gdY48hhNiuQmT'
);

export const generateWhiteList = (size: number) => {
  const arrayWallet: string[] = [];
  for (let i = 0; i < size; i++) {
    arrayWallet.push(Keypair.generate().publicKey.toString());
  }

  return arrayWallet;
};

export const generateWhiteListInvest = (size: number) => {
  const arrayWallet: string[] = [];

  let totalTicket = 0;

  for (let i = 0; i < size; i++) {
    const randomNumber = Math.floor(Math.random() * 3) + 1;
    totalTicket += randomNumber;

    arrayWallet.push(
      Keypair.generate().publicKey.toString() + '_' + randomNumber.toString()
    );
  }

  return { arrayWallet, totalTicket };
};

export const generateRandomObjectId = () => {
  const objectId = new ObjectId();
  return objectId.toHexString();
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const generateRecipents = (
  size: number,
  isCliff: boolean,
  decimals: number,
  amountTimeUnit?: number
) => {
  const recipients: IRecipient[] = [];

  for (let i = 0; i < size; i++) {
    const amount = randomNumberGenerator(1000);

    const recipient: IRecipient = {
      recipient: Keypair.generate().publicKey.toString(),
      amount: getBN(amount, decimals),
      name: 'Unknown',
      cliffAmount: getBN(0, decimals),
      amountPerPeriod: isCliff
        ? getBN(amount, decimals)
        : getBN(amount / amountTimeUnit, decimals),
    };

    recipients.push(recipient);
  }

  return recipients;
};

function randomNumberGenerator(n: number): number {
  if (n < 0) {
    throw new Error('Input phải là một số không âm.');
  }
  return Math.floor(Math.random() * (n + 1));
}

export const createAccount = async ({
  connection,
  payerKeypair,
  newAccountKeypair,
  lamports,
}: {
  connection: Connection;
  payerKeypair: Keypair;
  newAccountKeypair: Keypair;
  lamports: number;
}) => {
  const dataLength = 0;

  const rentExemptionAmount =
    await connection.getMinimumBalanceForRentExemption(dataLength);

  const createAccountIns = SystemProgram.createAccount({
    fromPubkey: payerKeypair.publicKey,
    newAccountPubkey: newAccountKeypair.publicKey,
    lamports: rentExemptionAmount,
    space: dataLength,
    programId: SystemProgram.programId,
  });

  const transferIns = SystemProgram.transfer({
    fromPubkey: payerKeypair.publicKey,
    toPubkey: newAccountKeypair.publicKey,
    lamports: lamports,
  });

  const tx = new Transaction().add(createAccountIns).add(transferIns);

  tx.feePayer = payerKeypair.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  tx.partialSign(payerKeypair);

  const sig = await connection.sendTransaction(
    tx,
    [payerKeypair, newAccountKeypair],
    {
      maxRetries: 20,
    }
  );

  console.log(
    `Create account ${newAccountKeypair.publicKey} with ${lamports} lamports: ${sig}`
  );
};

export const STREAMFLOW_TREASURY_PUBLIC_KEY = new PublicKey(
  '5SEpbdjFK5FxwTvfsGMXVQTD2v4M2c5tyRTxhdsPkgDw'
);

export async function prepareWithdrawInstructions(
  { id, amount = WITHDRAW_AVAILABLE_AMOUNT }: IWithdrawData,
  {
    invoker,
    checkTokenAccounts,
    computePrice,
    computeLimit,
  }: IInteractStreamSolanaExt,
  connection: Connection
): Promise<TransactionInstruction[]> {
  if (!invoker.publicKey) {
    throw new Error(
      "Invoker's PublicKey is not available, check passed wallet adapter!"
    );
  }

  const ixs: TransactionInstruction[] = prepareBaseInstructions(connection, {
    computePrice,
    computeLimit,
  });
  const streamPublicKey = new PublicKey(id);

  const escrow = await connection.getAccountInfo(streamPublicKey);
  if (!escrow?.data) {
    throw new Error("Couldn't get account info");
  }

  const data = decodeStream(escrow.data);
  const { tokenProgramId } = await getMintAndProgram(connection, data.mint);
  const streamflowTreasuryTokens = await ata(
    data.mint,
    STREAMFLOW_TREASURY_PUBLIC_KEY,
    tokenProgramId
  );
  const partnerTokens = await ata(data.mint, data.partner, tokenProgramId);
  // await checkAssociatedTokenAccounts(
  //   data,
  //   { invoker, checkTokenAccounts },
  //   ixs,
  //   tokenProgramId
  // );

  ixs.push(
    withdrawStreamInstruction(
      amount,
      new PublicKey('HqDGZjaVRXJ9MGRQEw7qDc2rAr6iH1n1kAQdCZaCMfMZ'),
      {
        authority: invoker.publicKey,
        recipient: invoker.publicKey,
        recipientTokens: data.recipientTokens,
        metadata: streamPublicKey,
        escrowTokens: data.escrowTokens,
        streamflowTreasury: STREAMFLOW_TREASURY_PUBLIC_KEY,
        streamflowTreasuryTokens,
        partner: data.partner,
        partnerTokens,
        mint: data.mint,
        tokenProgram: tokenProgramId,
      }
    )
  );

  return ixs;
}

interface WithdrawAccounts {
  authority: PublicKey;
  recipient: PublicKey;
  recipientTokens: PublicKey;
  metadata: PublicKey;
  escrowTokens: PublicKey;
  streamflowTreasury: PublicKey;
  streamflowTreasuryTokens: PublicKey;
  partner: PublicKey;
  partnerTokens: PublicKey;
  mint: PublicKey;
  tokenProgram: PublicKey;
}

export const withdrawStreamInstruction = (
  amount: BN,
  programId: PublicKey,
  {
    authority,
    recipient,
    recipientTokens,
    metadata,
    escrowTokens,
    streamflowTreasury,
    streamflowTreasuryTokens,
    partner,
    partnerTokens,
    mint,
    tokenProgram,
  }: WithdrawAccounts
): TransactionInstruction => {
  const keys = [
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: recipient, isSigner: false, isWritable: true },
    { pubkey: recipientTokens, isSigner: false, isWritable: true },
    { pubkey: metadata, isSigner: false, isWritable: true },
    { pubkey: escrowTokens, isSigner: false, isWritable: true },
    {
      pubkey: streamflowTreasury,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: streamflowTreasuryTokens, isSigner: false, isWritable: true },
    { pubkey: partner, isSigner: false, isWritable: true },
    { pubkey: partnerTokens, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: tokenProgram, isSigner: false, isWritable: false },
  ];

  let data = Buffer.alloc(withdrawStreamLayout.span);
  const decodedData = { amount: amount.toArrayLike(Buffer, 'le', 8) };
  const encodeLength = withdrawStreamLayout.encode(decodedData, data);
  data = data.slice(0, encodeLength);
  data = Buffer.concat([
    Buffer.from(sha256.digest('global:withdraw')).slice(0, 8),
    data,
    Buffer.alloc(10),
  ]);

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
};

export const withdrawStreamLayout: BufferLayout.Structure<IWithdrawStreamLayout> =
  BufferLayout.struct([BufferLayout.blob(8, 'amount')]);

export interface IWithdrawStreamLayout {
  amount: Uint8Array;
}

export async function createMultiple(
  data: ICreateMultipleStreamData,
  {
    sender,
    metadataPubKeys,
    isNative = false,
    computePrice,
    computeLimit,
  }: ICreateStreamSolanaExt,
  connection: Connection,
  sendThrottler: PQueue,
  programId: PublicKey
): Promise<IMultiTransactionResult> {
  const { recipients, tokenId: tokenAddress } = data;

  if (!sender.publicKey) {
    throw new Error(
      "Sender's PublicKey is not available, check passed wallet adapter!"
    );
  }

  const metadatas: string[] = [];
  const metadataToRecipient: MetadataRecipientHashMap = {};
  const errors: ICreateMultiError[] = [];
  const signatures: string[] = [];
  const batch: BatchItem[] = [];
  const instructionsBatch: {
    ixs: TransactionInstruction[];
    metadata: Keypair | undefined;
    recipient: string;
  }[] = [];
  metadataPubKeys = metadataPubKeys || [];

  const { tokenProgramId } = await getMintAndProgram(
    connection,
    new PublicKey(tokenAddress)
  );

  for (let i = 0; i < recipients.length; i++) {
    const recipientData = recipients[i];
    const { ixs, metadata, metadataPubKey } = await prepareStreamInstructions(
      recipientData,
      data,
      {
        sender,
        metadataPubKeys: metadataPubKeys[i] ? [metadataPubKeys[i]] : undefined,
        computePrice,
        computeLimit,
      },
      connection,
      programId,
      tokenProgramId
    );

    metadataToRecipient[metadataPubKey.toBase58()] = recipientData;

    metadatas.push(metadataPubKey.toBase58());
    instructionsBatch.push({
      ixs,
      metadata,
      recipient: recipientData.recipient,
    });
  }

  const { value: hash, context } =
    await connection.getLatestBlockhashAndContext();

  for (const { ixs, metadata, recipient } of instructionsBatch) {
    const messageV0 = new TransactionMessage({
      payerKey: sender.publicKey,
      recentBlockhash: hash.blockhash,
      instructions: ixs,
    }).compileToV0Message();
    const tx = new VersionedTransaction(messageV0);
    if (metadata) {
      tx.sign([metadata]);
    }
    batch.push({ tx, recipient });
  }

  if (isNative) {
    const totalDepositedAmount = recipients.reduce(
      (acc, recipient) => recipient.amount.add(acc),
      new BN(0)
    );
    const nativeInstructions = await prepareWrappedAccount(
      connection,
      sender.publicKey,
      totalDepositedAmount
    );

    const messageV0 = new TransactionMessage({
      payerKey: sender.publicKey,
      recentBlockhash: hash.blockhash,
      instructions: nativeInstructions,
    }).compileToV0Message();
    const tx = new VersionedTransaction(messageV0);

    batch.push({
      tx,
      recipient: sender.publicKey.toBase58(),
    });
  }

  const signedBatch: BatchItem[] = await signAllTransactionWithRecipients(
    sender,
    batch
  );

  if (isNative) {
    const prepareTx = signedBatch.pop();
    await sendAndConfirmStreamRawTransaction(
      connection,
      prepareTx!,
      { hash, context },
      { sendThrottler: sendThrottler }
    );
  }

  const responses: PromiseSettledResult<string>[] = [];
  if (metadataPubKeys.length > 0) {
    //if metadata pub keys were passed we should execute transaction sequentially
    //ephemeral signer need to be used first before proceeding with the next
    for (const batchTx of signedBatch) {
      responses.push(
        ...(await Promise.allSettled([
          executeTransaction(
            connection,
            batchTx.tx,
            { hash, context },
            { sendThrottler: sendThrottler }
          ),
        ]))
      );
    }
  } else {
    //send all transactions in parallel and wait for them to settle.
    //it allows to speed up the process of sending transactions
    //we then filter all promise responses and handle failed transactions
    responses.push(
      ...(await executeMultipleTransactions(
        connection,
        signedBatch.map((item) => item.tx),
        { hash, context },
        { sendThrottler: sendThrottler }
      ))
    )

  }

  responses.forEach((item, index) => {
    if (item.status === 'fulfilled') {
      signatures.push(item.value);
    } else {
      errors.push({
        recipient: signedBatch[index].recipient,
        error: item.reason,
        contractErrorCode: extractErrorCode(item.reason) || undefined,
      });
    }
  });

  return { txs: signatures, metadatas, metadataToRecipient, errors };
}

function extractErrorCode(err: Error): string | null {
  const logs = 'logs' in err && Array.isArray(err.logs) ? err.logs : undefined;
  return extractSolanaErrorCode(err.toString() ?? 'Unknown error!', logs);
}

async function prepareStreamInstructions(
  recipient: IRecipient,
  streamParams: IStreamConfig,
  extParams: ICreateStreamSolanaExt,
  connection: Connection,
  programId: PublicKey,
  tokenProgramId
): Promise<{
  ixs: TransactionInstruction[];
  metadata: Keypair | undefined;
  metadataPubKey: PublicKey;
}> {
  const {
    tokenId: mint,
    start,
    period,
    cliff,
    canTopup,
    cancelableBySender,
    cancelableByRecipient,
    transferableBySender,
    transferableByRecipient,
    automaticWithdrawal = false,
    withdrawalFrequency = 0,
    partner,
  } = streamParams;

  const { sender, metadataPubKeys, computeLimit, computePrice } = extParams;

  if (!sender.publicKey) {
    throw new Error(
      "Sender's PublicKey is not available, check passed wallet adapter!"
    );
  }

  const ixs: TransactionInstruction[] = prepareBaseInstructions(connection, {
    computePrice,
    computeLimit,
  });
  const recipientPublicKey = new PublicKey(recipient.recipient);
  const mintPublicKey = new PublicKey(mint);
  const { metadata, metadataPubKey } =
    getOrCreateStreamMetadata(metadataPubKeys);
  const [escrowTokens] = PublicKey.findProgramAddressSync(
    [Buffer.from('strm'), metadataPubKey.toBuffer()],
    programId
  );

  const senderTokens = await ata(
    mintPublicKey,
    sender.publicKey,
    tokenProgramId
  );
  const recipientTokens = await ata(
    mintPublicKey,
    recipientPublicKey,
    tokenProgramId
  );
  const streamflowTreasuryTokens = await ata(
    mintPublicKey,
    STREAMFLOW_TREASURY_PUBLIC_KEY,
    tokenProgramId
  );
  const partnerPublicKey = partner
    ? new PublicKey(partner)
    : WITHDRAWOR_PUBLIC_KEY;
  const partnerTokens = await ata(
    mintPublicKey,
    partnerPublicKey,
    tokenProgramId
  );

  ixs.push(
    createStreamInstruction(
      {
        start: new BN(start),
        depositedAmount: recipient.amount,
        period: new BN(period),
        amountPerPeriod: recipient.amountPerPeriod,
        cliff: new BN(cliff),
        cliffAmount: recipient.cliffAmount,
        cancelableBySender,
        cancelableByRecipient,
        automaticWithdrawal,
        transferableBySender,
        transferableByRecipient,
        canTopup,
        name: recipient.name,
        withdrawFrequency: new BN(
          automaticWithdrawal ? withdrawalFrequency : period
        ),
      },
      programId,
      {
        sender: sender.publicKey,
        senderTokens,
        recipient: new PublicKey(recipient.recipient),
        metadata: metadataPubKey,
        escrowTokens,
        recipientTokens,
        streamflowTreasury: STREAMFLOW_TREASURY_PUBLIC_KEY,
        streamflowTreasuryTokens: streamflowTreasuryTokens,
        partner: partnerPublicKey,
        partnerTokens: partnerTokens,
        mint: new PublicKey(mint),
        feeOracle: FEE_ORACLE_PUBLIC_KEY,
        rent: SYSVAR_RENT_PUBKEY,
        timelockProgram: programId,
        tokenProgram: tokenProgramId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        withdrawor: WITHDRAWOR_PUBLIC_KEY,
        systemProgram: SystemProgram.programId,
      }
    )
  );
  return { ixs, metadata, metadataPubKey };
}

function getOrCreateStreamMetadata(metadataPubKeys?: PublicKey[]) {
  let metadata: Keypair;
  let metadataPubKey: PublicKey;

  if (!metadataPubKeys) {
    metadata = Keypair.generate();
    metadataPubKey = metadata.publicKey;
  } else {
    metadataPubKey = metadataPubKeys[0];
  }

  return { metadata, metadataPubKey };
}
