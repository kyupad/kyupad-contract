import { PublicKey } from "@solana/web3.js";

export const allowListWL = [
  "A75CR9bxnUGqZ4xjCLT2ts7kFvNJ6t93GXZWUaBaJbzv",
  "7ZZH7kusCmj6uTGKPX74iyBRYTWqKPWyJhrnVKZUWtTp",
];

export interface IConfigLineSettings {
  prefix_name: string;
  prefix_uri: string;
  name_length: number;
  uri_length: number;
  is_sequential: boolean;
}

export interface IHiddenSetting {
  name: string;
  uri: string;
  hash: Uint8Array;
}

export interface ICreateCollection {
  name: string;
  symbol: string;
  uri: string;
  seller_fee_basis_pints: number;
}

export interface ICreators {
  address: PublicKey;
  verify: boolean;
  percentage_share: number;
}

export interface IConfigLines {
  name: string;
  uri: string;
}

export interface IGuard {
  label: string;
  sol_payment: {
    lamports: number;
  };
  start_date: string;
  end_date: string;
  min_limit: {
    limit: number;
  };
  allocation: {
    limit: number;
  };
  allow_list: Uint8Array;
}

export interface ICreateCandyMachine {
  collection_mint_pk: string;
  item_available: number;
  config_line_settings: IConfigLineSettings | null;
  // hidden_settings: IHiddenSetting | null;
  // max_edition_supply: number;
  // creators: ICreators[];
  groups: IGuard[];
}

export interface IUpdateCandyMachine {
  symbol: string;
  config_line_settings: IConfigLineSettings | null;
  hidden_settings: IHiddenSetting | null;
}

export interface IUpdateCandyGuard {}
