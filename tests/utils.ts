import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  ata,
  getMintAndProgram,
  prepareBaseInstructions,
} from '@streamflow/common/solana';
import {
  IRecipient,
  IWithdrawData,
  WITHDRAW_AVAILABLE_AMOUNT,
  getBN,
} from '@streamflow/stream';
import { sha256 } from 'js-sha256';

import {
  BN,
  IInteractStreamSolanaExt,
  decodeStream,
} from '@streamflow/stream/solana';

import * as BufferLayout from '@solana/buffer-layout';

import { ObjectId } from 'mongodb';

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
  // await this.checkAssociatedTokenAccounts(
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
