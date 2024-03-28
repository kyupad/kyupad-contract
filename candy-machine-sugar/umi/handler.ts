import {
  CandyGuard,
  addConfigLines,
  create,
  fetchCandyGuard,
  fetchCandyMachine,
  getMerkleRoot,
  updateCandyGuard,
  updateCandyMachine,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  TokenStandard,
  createNft,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  KeypairSigner,
  PublicKey,
  Umi,
  createGenericFileFromBrowserFile,
  dateTime,
  generateSigner,
  none,
  percentAmount,
  publicKey,
  sol,
  some,
} from "@metaplex-foundation/umi";
import base58 from "bs58";
import { allowListWL } from "../const/const";
import fs from "fs";
import path from "path";
import { getImageMimeType, isImageFile } from "../util/util";

// Create function
export async function createCollection(umi: Umi) {
  const collectionMint = generateSigner(umi);

  const collection = await createNft(umi, {
    mint: collectionMint,
    authority: umi.identity,
    name: "Kyupad Collection NFT",
    symbol: "KYUPAD",
    uri: "https://bafybeifpyhhx4tufmzikpyty3dvi4veh5xgx4zk47iago524b4h45oxoke.ipfs.nftstorage.link/1.json",
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
  }).sendAndConfirm(umi);

  console.log(
    `✅ - Minted Collection NFT: ${base58.encode(collection.signature)}`
  );
  console.log(
    `     https://explorer.solana.com/address/${base58.encode(
      collection.signature
    )}`
  );
  return collectionMint.publicKey;
}

export async function createMachine(
  umi: Umi,
  collectionMint: string,
  itemsAvailable = 10
) {
  // Create the Candy Machine.
  const candyMachine = generateSigner(umi);
  (
    await create(umi, {
      candyMachine,
      collectionMint: publicKey(collectionMint),
      collectionUpdateAuthority: umi.identity,
      tokenStandard: TokenStandard.NonFungible,
      sellerFeeBasisPoints: percentAmount(9.99, 2), // 9.99%
      itemsAvailable: itemsAvailable,
      maxEditionSupply: 10,
      creators: [
        {
          address: umi.identity.publicKey,
          verified: true,
          percentageShare: 100,
        },
      ],
      configLineSettings: some({
        prefixName: "",
        nameLength: 32,
        prefixUri: "",
        uriLength: 200,
        isSequential: false,
      }),
      guards: {
        botTax: some({ lamports: sol(0.01), lastInstruction: true }),
        solPayment: some({
          lamports: sol(1),
          destination: umi.identity.publicKey,
        }),
        startDate: { date: dateTime("2024-03-30T17:00:00Z") },
        mintLimit: some({ id: 1, limit: 1 }),
      },
    })
  ).sendAndConfirm(umi);

  console.log(
    `✅ - Created Candy Machine: ${candyMachine.publicKey.toString()}`
  );
  return candyMachine.publicKey;
}

export async function insertItems(
  umi: Umi,
  candyMachinePk: string,
  from: number,
  to: number,
  batch = 10,
  startIndex = from,
  name: string
) {
  const candyMachinePublicKey = publicKey(candyMachinePk);
  const candyMachine = await fetchCandyMachine(umi, candyMachinePublicKey);
  const items = [];
  for (let i = from; i < to; i++) {
    const tokenId = i + 1;
    items.push({
      name: name,
      uri: `${tokenId}`,
    });
  }
  for (let i = 0; i < items.length; i += batch) {
    const sliceItem = items.slice(i, i + batch);
    console.log("sliceItem", sliceItem);
    const rsp = await addConfigLines(umi, {
      candyMachine: candyMachine.publicKey,
      index: i + startIndex,
      configLines: sliceItem,
    }).sendAndConfirm(umi);
    console.log(`✅ - Items added to Candy Machine: ${candyMachinePk}`);
    console.log(
      `     https://explorer.solana.com/tx/${base58.encode(rsp.signature)}`
    );
  }
}

// run doesn't success
export async function uploadFileJsonMetadata(umi: Umi, directoryPath: string) {
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      throw new Error(`❌ - uploadFileJsonMetadata failed: ${err}`);
    }

    files.forEach(async (file, idx) => {
      const filePath = path.join(directoryPath, file);
      if (isImageFile(filePath)) {
        const data = fs.readFileSync(filePath);

        const imageFile = new File([data], path.basename(filePath), {
          type: getImageMimeType(file),
        });

        const asset = await createGenericFileFromBrowserFile(imageFile);
        const [fileUri] = await umi.uploader.upload([asset]);
        const uri = await umi.uploader.uploadJson({
          name: `AMI NFT #${idx + 1}`,
          description: "My description",
          image: fileUri,
        });

        console.log(`✅ - Upload the JSON metadata success: ${uri}`);
      }
    });
  });
}

// Read function
export async function fetchCandyMachineData(umi: Umi, candyMachinePk: string) {
  const candyMachinePublicKey = publicKey(candyMachinePk);
  const candy_machine = await fetchCandyMachine(umi, candyMachinePublicKey);

  console.log(`✅ - Candy Machine fetch success :`, candy_machine);
  return candy_machine;
}

export async function fetchCandyGuardData(umi: Umi, mintAuthority: PublicKey) {
  const candy_guard = await fetchCandyGuard(umi, mintAuthority);

  console.log(`✅ - Candy Guard fetch success :`, candy_guard);
  return candy_guard;
}

//Update function
export async function updateCandyMachineData(umi: Umi, candyMachinePk: string) {
  console.log("candyMachineUpdate", candyMachinePk);
  const candyMachine = await fetchCandyMachineData(umi, candyMachinePk);
  console.log("✅ - Old candy machine: ", candyMachine);

  await updateCandyMachine(umi, {
    candyMachine: candyMachine.publicKey,
    data: {
      ...candyMachine.data,
      hiddenSettings: none(),
      symbol: "KYUPAD",
      configLineSettings: some({
        prefixName: "KYUPAD #$ID+1$",
        nameLength: 0,
        symbol: "KYUPAD",
        prefixUri:
          "https://bafybeifpyhhx4tufmzikpyty3dvi4veh5xgx4zk47iago524b4h45oxoke.ipfs.nftstorage.link/$ID+1$.json",
        uriLength: 0,
        isSequential: false,
      }),
    },
  }).sendAndConfirm(umi);

  const newCandyMachine = await fetchCandyMachineData(umi, candyMachinePk);

  console.log("✅ - New candy machine: ", newCandyMachine);
  console.log(`✅ - Updated candy machine success : ${candyMachine.publicKey}`);
}

export async function updateGuard(umi: Umi, candy_guard: CandyGuard) {
  console.log("updateGuard");
  try {
    await updateCandyGuard(umi, {
      candyGuard: candy_guard.publicKey,
      guards: {
        ...candy_guard.guards,
        allowList: some({ merkleRoot: getMerkleRoot(allowListWL) }),
        mintLimit: some({ id: 1, limit: 5 }),
        startDate: some({ date: dateTime("2023-03-28T17:00:00Z") }),
        endDate: some({ date: dateTime("2023-03-30T17:00:00Z") }),
      },
      groups: [],
    }).sendAndConfirm(umi);
  } catch (error) {
    console.log(error);
  }

  console.log(`✅ - Update Candy Guard success : ${candy_guard.publicKey}`);
}

// Delete function
