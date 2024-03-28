import {
  CandyGuard,
  addConfigLines,
  create,
  fetchAllocationTracker,
  fetchCandyGuard,
  fetchCandyMachine,
  fetchMintCounter,
  findAllocationTrackerPda,
  findMintCounterPda,
  getMerkleProof,
  getMerkleRoot,
  getMerkleTree,
  mintV2,
  route,
  updateCandyGuard,
  updateCandyMachine,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  TokenStandard,
  createNft,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  AccountNotFoundError,
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
  transactionBuilder,
} from "@metaplex-foundation/umi";
import base58 from "bs58";
import { allowListWL } from "../const/const";
import fs from "fs";
import path from "path";
import { getImageMimeType, isImageFile } from "../util/util";
import { keccak_256 } from "@noble/hashes/sha3";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey as W3Publickey,
} from "@solana/web3.js";

import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";

// Create function
export async function createCollection(umi: Umi, mySigner: KeypairSigner) {
  const collectionMint = generateSigner(umi);

  const collection = await createNft(umi, {
    mint: collectionMint,
    authority: mySigner,
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
  collectionUpdateAuthority: KeypairSigner,
  itemsAvailable = 10
) {
  // Create the Candy Machine.
  const candyMachine = generateSigner(umi);
  (
    await create(umi, {
      candyMachine,
      collectionMint: publicKey(collectionMint),
      collectionUpdateAuthority: collectionUpdateAuthority,
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
        allocation: some({ id: 1, limit: 100 }),
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

export async function updateGuard(
  umi: Umi,
  candy_guard: CandyGuard,
  allowList: string[]
) {
  console.log("updateGuard");
  try {
    await updateCandyGuard(umi, {
      candyGuard: candy_guard.publicKey,
      guards: {
        ...candy_guard.guards,
        allowList: some({ merkleRoot: getMerkleRoot(allowList) }),
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

// Common Function
async function checkEligible(
  umi: Umi,
  pk: string,
  candyMachinePk: string,
  connection: Connection,
  allowListWL?: any[]
) {
  const user = publicKey(pk);
  const candyMachinePublicKey = publicKey(candyMachinePk);
  const candyMachine = await fetchCandyMachineData(umi, candyMachinePublicKey);
  const candyGuard = await fetchCandyGuardData(umi, candyMachine.mintAuthority);
  // const g = candyGuard.groups.find((g) => g.label === label)!;
  const g = candyGuard.guards;

  //check allow list
  if (g.allowList.__option === "Some") {
    if (!allowListWL) throw new Error("allowListWL required");
    const allowList = getMerkleTree(allowListWL);
    const validMerkleProof = getMerkleProof(allowListWL, user);
    const merkleRoot = getMerkleRoot(allowListWL);
    const isVerify = allowList.verify(
      validMerkleProof.map((e) => Buffer.from(e)),
      Buffer.from(keccak_256(pk)),
      Buffer.from(merkleRoot)
    );
    if (!isVerify) {
      throw new Error("Not in allowlist");
    }
  }

  // check item available
  console.log(
    `Item available: ${Number(candyMachine.itemsRedeemed)}/${
      candyMachine.itemsLoaded
    }`
  );
  if (candyMachine.itemsLoaded <= Number(candyMachine.itemsRedeemed)) {
    throw new Error("Sold out");
  }

  //check sol balance
  if (g.solPayment.__option === "Some") {
    let balance = await connection.getBalance(new W3Publickey(pk));
    console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    const solPayment = Number(g.solPayment.value.lamports.basisPoints);
    console.log(`Required: ${solPayment / LAMPORTS_PER_SOL} SOL`);

    const gas = 20000000; // 0.02 in decimals 9
    if (balance < solPayment + gas) {
      throw new Error("sol payment not enough");
    }
  }

  //check allocation
  if (g.allocation.__option === "Some") {
    const pda = findAllocationTrackerPda(umi, {
      id: g.allocation.value.id,
      candyGuard: candyGuard.publicKey,
      candyMachine: candyMachine.publicKey,
    });
    const { count } = await fetchAllocationTracker(umi, pda);
    console.log(`Allocation ${count}/${g.allocation.value.limit}`);
    if (count >= g.allocation.value.limit) {
      throw new Error("Allocation limit reached");
    }
  }

  //check mint limit
  if (g.mintLimit.__option === "Some") {
    const counterPda = findMintCounterPda(umi, {
      id: g.mintLimit.value.id,
      user,
      candyGuard: candyGuard.publicKey,
      candyMachine: candyMachinePublicKey,
    });
    try {
      const limit = g.mintLimit.value.limit;
      const { count } = await fetchMintCounter(umi, counterPda);
      console.log(`MintLimit ${count}/${limit}`);
      if (count >= limit) throw new Error("Limit reached");
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
      } else {
        throw error;
      }
    }
  }
}

export async function mintWL(
  umi: Umi,
  candyMachinePk: string,
  mySigner: KeypairSigner,
  allowList: string[]
) {
  const candyMachinePublicKey = publicKey(candyMachinePk);
  console.log("umi identity", umi.identity.publicKey.toString());
  const candyMachine = await fetchCandyMachine(umi, candyMachinePublicKey);
  const nftMint = generateSigner(umi);

  return await transactionBuilder()
    .add(setComputeUnitLimit(umi, { units: 800_000 }))
    .add(
      route(umi, {
        candyMachine: publicKey(candyMachinePk),
        guard: "allowList",
        routeArgs: {
          path: "proof",
          merkleRoot: getMerkleRoot(allowList),
          merkleProof: getMerkleProof(
            allowList,
            umi.identity.publicKey.toString()
          ),
        },
      })
    )
    .add(
      mintV2(umi, {
        candyMachine: candyMachine.publicKey,
        nftMint,
        collectionMint: candyMachine.collectionMint,
        collectionUpdateAuthority: mySigner.publicKey,
        tokenStandard: candyMachine.tokenStandard,
        group: some("wl"),
        mintArgs: {
          solPayment: some({
            lamports: sol(1.1),
            destination: mySigner.publicKey,
          }),
          allocation: some({
            id: 2,
            limit: 2700,
          }),
          mintLimit: some({ id: 3, limit: 2 }),
          allowList: some({ merkleRoot: getMerkleRoot(allowListWL) }),
          botTax: some({
            lamports: sol(0.01),
            lastInstruction: true,
          }),
        },
      })
    )

    .sendAndConfirm(umi);
}
