import {
  CandyGuard,
  CandyMachine,
  getMerkleRoot,
  mplCandyMachine,
  updateCandyGuard,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  publicKey,
  some,
  dateTime,
  keypairIdentity,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  fetchCandyMachine,
  fetchCandyGuard,
} from "@metaplex-foundation/mpl-candy-machine";
import { allowListWL } from "./const/const";
import * as dotenv from "dotenv";
import owner from "./owner.json";

dotenv.config();

if (!process.env.KYUPAD_PUBLIC_RPC_ENDPOINT)
  throw new Error(
    "No RPC endpoint. Please, provide a KYUPAD_PUBLIC_RPC_ENDPOINT env variable"
  );
const candyMachineId = process.env.KYUPAD_PUBLIC_CANDY_MACHINE_ID;

interface State {
  candy_machine: CandyMachine | undefined;
  candy_guard: CandyGuard | undefined;
}

const state: State = {
  candy_machine: undefined,
  candy_guard: undefined,
};

const umi1 = createUmi(process.env.KYUPAD_PUBLIC_RPC_ENDPOINT).use(
  mplCandyMachine()
);

const keypair = umi1.eddsa.createKeypairFromSecretKey(Buffer.from(owner));
const umi = umi1.use(keypairIdentity(keypair));

const fetchCandyMachineData = async () => {
  if (!candyMachineId)
    throw new Error(
      "Please, provide a KYUPAD_PUBLIC_CANDY_MACHINE_ID env variable"
    );
  const candyMachinePublicKey = publicKey(candyMachineId);
  console.log("candyMachinePublicKey: ", candyMachinePublicKey);

  state.candy_machine = await fetchCandyMachine(umi, candyMachinePublicKey);
  console.log("candy_machine: ", state.candy_machine);

  state.candy_guard = await fetchCandyGuard(
    umi,
    state.candy_machine.mintAuthority
  );
  console.log("candy_guard: ", state.candy_guard);
};

const updateGuard = async () => {
  if (!(state.candy_machine && state.candy_guard)) {
    throw new Error("Candy Machine not available");
  }

  console.log(`update guard ${state.candy_machine.mintAuthority}`);

  try {
    await updateCandyGuard(umi, {
      candyGuard: state.candy_guard.publicKey,
      guards: {
        ...state.candy_guard.guards,
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
};

const main = async () => {
  console.log("init");
  await fetchCandyMachineData();
  await updateGuard();
};

main();
