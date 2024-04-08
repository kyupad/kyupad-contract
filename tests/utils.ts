import { Keypair } from '@solana/web3.js';

export const generateWhiteList = (size: number) => {
  const arrayWallet: string[] = [];
  for (let i = 0; i < size; i++) {
    arrayWallet.push(Keypair.generate().publicKey.toString());
  }

  return arrayWallet;
};
