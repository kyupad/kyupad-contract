import { PublicKey } from '@metaplex-foundation/umi';
import { Keypair } from '@solana/web3.js';
export declare const creatorAddress: PublicKey<'69s2phVx3WEqXVBdRzFG7uxPFh1iNy1EXg98zxxtD2qV'>;

export const generateWhiteList = (size: number) => {
  const arrayWallet: string[] = [];
  for (let i = 0; i < size; i++) {
    arrayWallet.push(Keypair.generate().publicKey.toString());
  }

  return arrayWallet;
};
