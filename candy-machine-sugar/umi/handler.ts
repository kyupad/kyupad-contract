import {
  CandyGuard,
  DefaultGuardSet,
  GuardGroupArgs,
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
  mintArgs,
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
import { IConfigLines, ICreateCandyMachine, allowListWL } from "../const/const";
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
    uri: "https://arweave.net/47tBwohfehJtcXNCI9I3iKD6lgNiCj6JuaBstx20WwQ",
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
  }).sendAndConfirm(umi);

  console.log(
    `✅ - Minted Collection NFT: ${base58.encode(collection.signature)}`
  );
  console.log(
    `     https://explorer.solana.com/tx/${base58.encode(
      collection.signature
    )}?cluster=${process.env.KYUPAD_PUBLIC_RPC_CLUSTER}`
  );
  return collectionMint.publicKey;
}

export async function createMachine(
  umi: Umi,
  collectionMint: string,
  collectionUpdateAuthority: KeypairSigner,
  data: ICreateCandyMachine
) {
  const groups: any[] = [];

  data.groups.forEach((item, idx) => {
    let group = {
      label: item.label,
      guards: {
        solPayment: some({
          lamports: sol(item.sol_payment.lamports),
          destination: umi.identity.publicKey,
        }),
        startDate: { date: dateTime(item.start_date) },
        end_date: { date: dateTime(item.end_date) },
        mintLimit: some({ id: idx + 1, limit: item.min_limit.limit }),
        allocation: some({ id: idx + 1, limit: item.allocation.limit }),
        allowList: some({ merkleRoot: item.allow_list }),
      },
    };

    groups.push(group);
  });

  const candyMachine = generateSigner(umi);

  let dataAdd = {
    candyMachine,
    collectionMint: publicKey(collectionMint),
    collectionUpdateAuthority: collectionUpdateAuthority,
    tokenStandard: TokenStandard.NonFungible,
    sellerFeeBasisPoints: percentAmount(9.99, 2),
    itemsAvailable: data.item_available,
    maxEditionSupply: 10,
    creators: [
      {
        address: umi.identity.publicKey,
        verified: true,
        percentageShare: 100,
      },
    ],
    groups: groups,
    ...(data.config_line_settings
      ? {
          configLineSettings: some({
            prefixName: data.config_line_settings.prefix_name,
            nameLength: data.config_line_settings.name_length,
            prefixUri: data.config_line_settings.prefix_uri,
            uriLength: data.config_line_settings.uri_length,
            isSequential: data.config_line_settings.is_sequential,
          }),
        }
      : {}),
  };

  // Create the Candy Machine.
  (await create(umi, dataAdd)).sendAndConfirm(umi);

  console.log(
    `✅ - Created Candy Machine: ${candyMachine.publicKey.toString()}`
  );
  return candyMachine.publicKey;
}

export async function insertItems(
  umi: Umi,
  candyMachinePk: string,
  configLines: IConfigLines[]
) {
  const candyMachinePublicKey = publicKey(candyMachinePk);
  const candyMachine = await fetchCandyMachine(umi, candyMachinePublicKey);
  const rsp = await addConfigLines(umi, {
    candyMachine: candyMachine.publicKey,
    index: candyMachine.itemsLoaded,
    configLines: configLines,
  }).sendAndConfirm(umi);
  console.log(`✅ - Items added to Candy Machine: ${candyMachinePk}`);
  console.log(
    `     https://explorer.solana.com/tx/${base58.encode(
      rsp.signature
    )}?cluster=${process.env.KYUPAD_PUBLIC_RPC_CLUSTER}`
  );
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

export async function getAllowList(projectId: string, poolId: string) {
  return;
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
      symbol: "KYUPAD",
    },
  }).sendAndConfirm(umi);

  const newCandyMachine = await fetchCandyMachineData(umi, candyMachinePk);

  console.log("✅ - New candy machine: ", newCandyMachine);
  console.log(`✅ - Updated candy machine success : ${candyMachine.publicKey}`);
}

export async function updateGuard(
  umi: Umi,
  candy_guard: CandyGuard,
  allowList: Uint8Array
) {
  console.log("updateGuard");
  try {
    await updateCandyGuard(umi, {
      candyGuard: candy_guard.publicKey,
      guards: {
        ...candy_guard.guards,
        allowList: some({ merkleRoot: allowList }),
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
export async function checkEligible(
  umi: Umi,
  label: string,
  pk: string,
  candyMachinePk: string,
  connection: Connection,
  allowListWL?: any[]
) {
  const user = publicKey(pk);
  const candyMachinePublicKey = publicKey(candyMachinePk);
  const candyMachine = await fetchCandyMachine(umi, candyMachinePublicKey);
  const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority);
  const g = candyGuard.groups.find((g) => g.label === label)!;

  //check allow list
  if (g.guards.allowList.__option === "Some") {
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
  if (g.guards.solPayment.__option === "Some") {
    let balance = await connection.getBalance(new W3Publickey(pk));
    console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    const solPayment = Number(g.guards.solPayment.value.lamports.basisPoints);
    console.log(`Required: ${solPayment / LAMPORTS_PER_SOL} SOL`);

    const gas = 20000000; // 0.02 in decimals 9
    if (balance < solPayment + gas) {
      throw new Error("sol payment not enough");
    }
  }

  //check allocation
  if (g.guards.allocation.__option === "Some") {
    const pda = findAllocationTrackerPda(umi, {
      id: g.guards.allocation.value.id,
      candyGuard: candyGuard.publicKey,
      candyMachine: candyMachine.publicKey,
    });
    const { count } = await fetchAllocationTracker(umi, pda);
    console.log(`Allocation ${count}/${g.guards.allocation.value.limit}`);
    if (count >= g.guards.allocation.value.limit) {
      throw new Error("Allocation limit reached");
    }
  }

  //check mint limit
  if (g.guards.mintLimit.__option === "Some") {
    const counterPda = findMintCounterPda(umi, {
      id: g.guards.mintLimit.value.id,
      user,
      candyGuard: candyGuard.publicKey,
      candyMachine: candyMachinePublicKey,
    });
    try {
      const limit = g.guards.mintLimit.value.limit;
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
  label: string,
  mySigner: KeypairSigner,
  mintArgs: any
) {
  console.log("umi identity", umi.identity.publicKey.toString());

  const candyMachine = await fetchCandyMachineData(umi, candyMachinePk);
  const candyGuard = await fetchCandyGuardData(umi, candyMachine.mintAuthority);
  const nftMint = generateSigner(umi);

  return await transactionBuilder()
    .add(setComputeUnitLimit(umi, { units: 800_000 }))
    .add(
      route(umi, {
        candyMachine: publicKey(candyMachinePk),
        guard: "allowList",
        group: some(label),
        routeArgs: {
          path: "proof",
          merkleRoot: getMerkleRoot(allowListWL),
          merkleProof: getMerkleProof(
            allowListWL,
            umi.identity.publicKey.toString()
          ),
        },
      })
    )
    .add(
      mintV2(umi, {
        candyMachine: candyMachine.publicKey,
        candyGuard: candyGuard.publicKey,
        nftMint,
        collectionMint: candyMachine.collectionMint,
        collectionUpdateAuthority: mySigner.publicKey,
        tokenStandard: candyMachine.tokenStandard,
        group: some(label),
        mintArgs: mintArgs,
      })
    )

    .sendAndConfirm(umi);
}
