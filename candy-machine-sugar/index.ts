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
  updateCandyMachineData,
} from "./umi/handler";
import { nftStorageUploader } from "@metaplex-foundation/umi-uploader-nft-storage";

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


const main = async () => {
  // const collectionMint = await createCollection(umi);
  // const candyMachinePk = await createMachine(umi, collectionMint, 3);
  await updateCandyMachineData(
    umi,
    "CrVuqP1xzQqxMsSiHmDcKKHYaZ73SxfMczpndURG4n8i"
  );
};

main();
