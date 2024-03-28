import { PublicKey } from "@solana/web3.js";

export const allowListWL = [
  "BaNS3Sx6MAg8QFu1yXi1Ftt5pjJPMR2vyrQHqaHwGL7r",
  "7UvSycMiBikyErLyCGrTcAECDrCwghikvD7PunVDh2DS",
  "G78qwbjfetiHGHhjKpPLxWrUq4eJqkLotS6CVQ2BQ2ZA",
  "85XUKZ77v3ADNw1QZeLhGSWi1gz1NwbnwqA8QDeQCeRf",
  "A75CR9bxnUGqZ4xjCLT2ts7kFvNJ6t93GXZWUaBaJbzv",
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

export interface ICreateCandyMachine {
  collection_mint_pk: string;
  item_available: number;
  config_line_settings: IConfigLineSettings | null;
  hidden_settings: IHiddenSetting | null;
  max_edition_supply: number;
  creators: ICreators[];
  guards: {
    box_tax?: {
      lamports: number;
      last_instruction: boolean;
    };
    sol_payment?: {
      lamports: number;
    };
    start_date?: string;
    end_date?: string;
    min_limit?: {
      id: number;
      limit: number;
    };
    allow_list?: Uint8Array;
  };
}

export interface IUpdateCandyMachine {
  symbol: string;
  config_line_settings: IConfigLineSettings | null;
  hidden_settings: IHiddenSetting | null;
}

export interface IUpdateCandyGuard {}
