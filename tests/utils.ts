import { PublicKey } from '@metaplex-foundation/umi';
import { Keypair } from '@solana/web3.js';
import { IRecipient, getBN } from '@streamflow/stream';
export declare const creatorAddress: PublicKey<'69s2phVx3WEqXVBdRzFG7uxPFh1iNy1EXg98zxxtD2qV'>;

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
