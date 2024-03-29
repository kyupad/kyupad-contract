import {
  getMerkleRoot,
  mplCandyMachine,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  keypairIdentity,
  createSignerFromKeypair,
  some,
  sol,
  dateTime,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import * as dotenv from "dotenv";
import owner from "./id.json";
import {
  createCollection,
  createMachine,
  fetchCandyGuardData,
  fetchCandyMachineData,
  insertItems,
  mintWL,
  updateCandyMachineData,
  updateGuard,
  uploadFileJsonMetadata,
} from "./umi/handler";
import { nftStorageUploader } from "@metaplex-foundation/umi-uploader-nft-storage";
import { Connection } from "@solana/web3.js";
import { IConfigLines, ICreateCandyMachine, allowListWL } from "./const/const";
import { delay } from "./util/util";

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
  const madladAllowList = getMerkleRoot(allowListWL);
  const smbAllowList = getMerkleRoot(allowListWL);

  const collectionMint = await createCollection(umi, mySigner);

  let candyMachinePk = "";
  delay(15, async () => {
    let dataCreateMachine: ICreateCandyMachine = {
      collection_mint_pk: collectionMint,
      item_available: 6,
      config_line_settings: {
        is_sequential: true,
        name_length: 32,
        prefix_name: "",
        prefix_uri: "",
        uri_length: 200,
      },
      groups: [
        {
          label: "mad",
          sol_payment: {
            lamports: 0.01,
          },
          start_date: "2024-03-20T17:00:00Z",
          end_date: "2024-04-01T17:00:00Z",
          min_limit: {
            limit: 1,
          },
          allocation: { limit: 100 },
          allow_list: madladAllowList,
        },
        {
          label: "smb",
          sol_payment: {
            lamports: 0.02,
          },
          start_date: "2024-04-02T17:00:00Z",
          end_date: "2024-04-20T17:00:00Z",
          min_limit: {
            limit: 2,
          },
          allocation: { limit: 200 },
          allow_list: smbAllowList,
        },
      ],
    };

    candyMachinePk = await createMachine(
      umi,
      collectionMint,
      mySigner,
      dataCreateMachine
    );
  });

  delay(30, async () => {
    const configLines: IConfigLines[] = [
      {
        name: "AMI big stomach#0",
        uri: "https://arweave.net/4DIZoYIPlO6E1_EkPDtZ-0saQbEK_AOAEi_LZckzGoU",
      },
      {
        name: "AMI big stomach#1",
        uri: "https://arweave.net/wYPxwUlO4CDfDIwmQ6zq_0cIlTHi8-U-XT2pkXvkZR0",
      },
      {
        name: "AMI big stomach#2",
        uri: "https://arweave.net/85fTj6OmGtqayXRPTs2J4WsmvN5lKdRrKrPSmpYtcVY",
      },
      {
        name: "AMI big stomach#3",
        uri: "https://arweave.net/xctPweqDqioRCewTixlAGbNH7163wP01d-_Ls6cRUOY",
      },
      {
        name: "AMI big stomach#4",
        uri: "https://arweave.net/DzFBF9WhFs1qZ0p28M6E_PxjaOzuZpZUrmeCLa1qikw",
      },
    ];
    await insertItems(umi, candyMachinePk, configLines);
  });

  delay(45, async () => {
    const mintArgs = {
      solPayment: some({
        lamports: sol(0.01),
        destination: umi.identity.publicKey,
      }),
      startDate: { date: dateTime("2024-03-30T17:00:00Z") },
      endDate: { date: dateTime("2024-04-01T17:00:00Z") },
      mintLimit: some({ id: 1, limit: 1 }),
      allocation: some({ id: 1, limit: 100 }),
      allowList: some({ merkleRoot: madladAllowList }),
    };
    await mintWL(umi, candyMachinePk, "mad", mySigner, mintArgs);
  });
};

main();
