import { mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import {
  keypairIdentity,
  createSignerFromKeypair,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import * as dotenv from "dotenv";
import owner from "./id.json";
import {
  createCollection,
  createMachine,
  fetchCandyGuardData,
  fetchCandyMachineData,
  mintWL,
  updateCandyMachineData,
  updateGuard,
} from "./umi/handler";
import { nftStorageUploader } from "@metaplex-foundation/umi-uploader-nft-storage";
import { Connection } from "@solana/web3.js";
import { allowListWL } from "./const/const";

dotenv.config();

if (!process.env.KYUPAD_PUBLIC_RPC_ENDPOINT)
  throw new Error(
    "No RPC endpoint. Please, provide a KYUPAD_PUBLIC_RPC_ENDPOINT env variable"
  );
if (!process.env.KYUPAD_NFT_STORAGE_KEY)
  throw new Error(
    "No Nft storage. Please, provide a KYUPAD_NFT_STORAGE_KEY env variable"
  );

// Use the RPC endpoint of your choice.
const umi1 = createUmi(process.env.KYUPAD_PUBLIC_RPC_ENDPOINT).use(
  mplCandyMachine()
);
const keypair = umi1.eddsa.createKeypairFromSecretKey(Buffer.from(owner));
export const umi = umi1.use(keypairIdentity(keypair));
umi.use(nftStorageUploader({ token: process.env.KYUPAD_NFT_STORAGE_KEY }));
const mySigner = createSignerFromKeypair(umi, keypair);
const connection = new Connection(process.env.KYUPAD_PUBLIC_RPC_ENDPOINT);

const main = async () => {
  const collectionMint = await createCollection(umi, mySigner);
  const candyMachinePk = await createMachine(umi, collectionMint, mySigner, 3);

  // const candyMachinePk = "EFeGnqvdTyRLrKjeSnaNgwuiCr3qkUVf4PSuxsuZExW4";
  // await updateCandyMachineData(umi, candyMachinePk);
  // const candyMachine = await fetchCandyMachineData(umi, candyMachinePk);
  // const candyGuard = await fetchCandyGuardData(umi, candyMachine.mintAuthority);
  // await updateGuard(umi, candyGuard,allowListWL);

  // await mintWL(umi, candyMachinePk, mySigner, allowListWL);
};

main();
