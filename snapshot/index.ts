import {
  Connection,
  GetProgramAccountsConfig,
  GetProgramAccountsFilter,
  PublicKey,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "fs";

const rpcEndpoint = "https://api.devnet.solana.com";
const solanaConnection = new Connection(rpcEndpoint);

const enum TokenSnapshot {
  MADLADS_TOKEN = "ABoiqh4NqSvBcZ9Z2E8zpAsn1QM55yrKBna7zkNVvEXN", //eg
  SMB_TOKEN = "GKKLThqqGrLcCcs291AmNFrVtAC1QLWowJ5NDrEd3vYS", //eg
}

interface State {
  [key: string]: any;
}

const getProgramAccounts = async (
  solanaConnection: Connection,
  token: string
) => {
  console.log(`token: ${token}`);
  let publicKeys: PublicKey[] = [];
  const filters: GetProgramAccountsFilter[] = [
    {
      dataSize: 165, //size of account
    },
    {
      memcmp: {
        offset: 0,
        bytes: token,
      },
    },
  ];

  const config: GetProgramAccountsConfig = {
    filters,
  };
  try {
    const accounts = await solanaConnection.getProgramAccounts(
      TOKEN_PROGRAM_ID,
      config
    );
    accounts.forEach((acc) => {
      const pubkey = acc.pubkey;

      publicKeys.push(pubkey);
    });
    return publicKeys;
  } catch (error) {
    console.log(`error : ${error}`);
  }
};

const saveState = async (state: State) => {
  const data = JSON.stringify(state);

  fs.writeFile("data.json", data, (err) => {
    if (err) throw err;
    console.log("Data saved to file");
  });
};

const snapshot = async () => {
  const state: State = {};
  const [madlads, smb] = await Promise.all([
    getProgramAccounts(solanaConnection, TokenSnapshot.MADLADS_TOKEN),
    getProgramAccounts(solanaConnection, TokenSnapshot.SMB_TOKEN),
  ]);

  state.madlads = madlads;
  state.smb = smb;

  saveState(state);
};

snapshot();
