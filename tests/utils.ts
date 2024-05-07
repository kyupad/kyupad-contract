import { PublicKey } from '@metaplex-foundation/umi';
import { Keypair } from '@solana/web3.js';
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

  let investTotal = 0;

  for (let i = 0; i < size; i++) {
    const randomNumber = Math.floor(Math.random() * 3) + 1;
    investTotal += randomNumber;

    arrayWallet.push(
      Keypair.generate().publicKey.toString() + '_' + randomNumber.toString()
    );
  }

  return { arrayWallet, investTotal };
};

export const generateRandomObjectId = () => {
  const objectId = new ObjectId();
  return objectId.toHexString();
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
