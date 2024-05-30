"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const js_sha256_1 = require("js-sha256");
const bs58_1 = __importDefault(require("bs58"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const borsh = __importStar(require("borsh"));
const fetchAllStakeAccountsBuyAuth = (userPubkey) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = new web3_js_1.Connection(process.env.DEV_RPC_ENDPOINT, 'confirmed');
    const accounts = yield connection.getParsedProgramAccounts(web3_js_1.StakeProgram.programId, {
        commitment: 'confirmed',
        filters: [
            {
                memcmp: {
                    offset: 12,
                    bytes: new web3_js_1.PublicKey(userPubkey).toBase58(), // your pubkey, encoded as a base-58 string
                },
            },
        ],
    });
    console.log(accounts);
});
// fetchAllStakeAccountsBuyAuth('GpdqiSEwQSup7tW6trQ4iDFkrAfgEmjZgD1TSu5beHkA');
const fetchIfSteakJup = () => __awaiter(void 0, void 0, void 0, function* () {
    const connection = new web3_js_1.Connection(process.env.MAIN_RPC_ENDPOINT, 'confirmed');
    const discriminator = Buffer.from(js_sha256_1.sha256.digest('account:Escrow')).subarray(0, 8);
    const programId = new web3_js_1.PublicKey('voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj');
    try {
        const accounts = yield connection.getProgramAccounts(programId, {
            commitment: 'confirmed',
            dataSlice: { offset: 8 + 32 + 32 + 1, length: 32 },
            filters: [
                {
                    memcmp: {
                        offset: 0,
                        bytes: bs58_1.default.encode(discriminator),
                    },
                },
                {
                    memcmp: {
                        offset: 8 + 32,
                        bytes: new web3_js_1.PublicKey('7CCEDx1vujQofFjUggfnb84UesSLXyqZ3TB5zN25UwvA').toBase58(),
                    },
                },
            ],
        });
        console.log('Account length: ', accounts.length);
        console.log(bs58_1.default.decode(accounts[0].account.data.toString()));
    }
    catch (error) {
        console.log('Error: ', error);
    }
});
// fetchIfSteakJup();
const fetchStakeKamino = () => __awaiter(void 0, void 0, void 0, function* () {
    /// 811522
    const connection = new web3_js_1.Connection(process.env.MAIN_RPC_ENDPOINT, 'confirmed');
    const discriminator = Buffer.from(js_sha256_1.sha256.digest('account:UserState')).subarray(0, 8);
    const programId = new web3_js_1.PublicKey('FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr');
    try {
        const accounts = yield connection.getProgramAccounts(programId, {
            commitment: 'confirmed',
            dataSlice: {
                offset: 8 + 8 + 32 + 32 + 1 + 1 * 7 + 16 * 10 + 8 * 10 + 8 * 10,
                length: 16,
            },
            filters: [
                {
                    memcmp: {
                        offset: 0,
                        bytes: bs58_1.default.encode(discriminator),
                    },
                },
                {
                    memcmp: {
                        offset: 8 + 8 + 32,
                        bytes: new web3_js_1.PublicKey('47ygwr39bJ95WiZ51ybztEsxo3cZ41UHcqHNg5jnqSn3').toBase58(),
                    },
                },
            ],
        });
        console.log('Account length: ', accounts.length);
        for (let i = 0; i < accounts.length; i++) {
            // if (
            //   accounts[i].pubkey.toString() ===
            //   'DZHULrShXaZfnbwaXkSEMgysKiqopY59nvkbC6pn8Uhv'
            // ) {
            const a = borsh.deserialize('u128', accounts[i].account.data);
            console.log(a);
            // }
        }
        console.log(accounts);
    }
    catch (error) {
        console.log('Error: ', error);
    }
});
// fetchStakeKamino();
const fetchLendingKamino = () => __awaiter(void 0, void 0, void 0, function* () {
    const connection = new web3_js_1.Connection(process.env.MAIN_RPC_ENDPOINT, 'confirmed');
});
const createLookupTable = () => __awaiter(void 0, void 0, void 0, function* () {
    // Init lookup table adđress
    const connection = new web3_js_1.Connection(process.env.DEV_RPC_ENDPOINT, 'confirmed');
    const slot = yield connection.getSlot();
    const payer = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(process.env.PRIVATE_KEY));
    // Add 2 instruction to create lookupTableAddress and saved lookupTableAddress
    const [createLookupTableIns, lookupTableAddress] = web3_js_1.AddressLookupTableProgram.createLookupTable({
        authority: payer.publicKey,
        payer: payer.publicKey,
        recentSlot: slot,
    });
    const extendInstruction = web3_js_1.AddressLookupTableProgram.extendLookupTable({
        payer: payer.publicKey,
        authority: payer.publicKey,
        lookupTable: lookupTableAddress,
        addresses: [web3_js_1.Keypair.generate().publicKey, web3_js_1.Keypair.generate().publicKey],
    });
    const tx = new web3_js_1.Transaction().add(createLookupTableIns).add(extendInstruction);
    const sig = yield connection.sendTransaction(tx, [payer], {
        skipPreflight: true,
    });
    console.log(sig);
});
createLookupTable();
// fetchLendingKamino();
//# sourceMappingURL=test.js.map