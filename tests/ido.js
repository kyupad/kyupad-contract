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
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const chai_1 = require("chai");
const utils_1 = require("./utils");
const keccak256_1 = __importDefault(require("keccak256"));
const merkletreejs_1 = __importDefault(require("merkletreejs"));
const spl_token_1 = require("@solana/spl-token");
const bytes_1 = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
describe('Test Kyupad IDO', () => {
    (0, anchor_1.setProvider)(anchor_1.AnchorProvider.env());
    const connection = (0, anchor_1.getProvider)().connection;
    const program = anchor_1.workspace.KyupadIdo;
    const upgradableAuthority = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(process.env.PRIVATE_KEY));
    describe('📦📦📦 Register project', () => __awaiter(void 0, void 0, void 0, function* () {
        it('Register project with sol', () => __awaiter(void 0, void 0, void 0, function* () {
            const vaultAddress = upgradableAuthority.publicKey;
            let { arrayWallet, totalTicket } = (0, utils_1.generateWhiteListInvest)(9999);
            const randomNumber = Math.floor(Math.random() * 3) + 1;
            const test = upgradableAuthority.publicKey.toString() +
                '_' +
                randomNumber.toString();
            arrayWallet.push(test);
            totalTicket += randomNumber;
            const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
            const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                sortPairs: true,
            });
            const merkle_root = merkleTree.getRoot();
            const id = (0, utils_1.generateRandomObjectId)();
            const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
            const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
            const tokenOffered = 1000000;
            const ticketSize = new anchor_1.BN(0.1 * web3_js_1.LAMPORTS_PER_SOL);
            const projectConfigArgs = {
                id: id,
                startDate: startDate,
                endDate: endDate,
                merkleRoot: merkle_root,
                tokenAddress: null,
                ticketSize: ticketSize,
                tokenOffered: tokenOffered,
                totalTicket: totalTicket,
            };
            const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
            const registerProjectIns = yield program.methods
                .registerProject(projectConfigArgs)
                .accounts({
                creator: upgradableAuthority.publicKey,
                receiver: vaultAddress,
            })
                .instruction();
            const tx = new web3_js_1.Transaction().add(registerProjectIns);
            tx.feePayer = upgradableAuthority.publicKey;
            tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
            tx.partialSign(upgradableAuthority);
            const sig = yield connection.sendTransaction(tx, [upgradableAuthority], {
                maxRetries: 20,
                skipPreflight: true,
                preflightCommitment: 'processed',
            });
            console.log('Register project with sol: ', sig);
            yield (0, utils_1.sleep)(2000);
            const projectData = yield program.account.projectConfig.fetch(project);
            const projectDataInput = Object.assign(Object.assign({}, projectConfigArgs), { vaultAddress: vaultAddress, tokenProgram: null });
            const order1 = Object.keys(projectData)
                .sort()
                .reduce((obj, key) => {
                obj[key] = projectData[key];
                return obj;
            }, {});
            const order2 = Object.keys(projectDataInput)
                .sort()
                .reduce((obj, key) => {
                obj[key] = projectDataInput[key];
                return obj;
            }, {});
            (0, chai_1.expect)(JSON.stringify(order1) === JSON.stringify(order2), 'Expect project pda data to be equal initial data').to.be.true;
        }));
        it('Register project with token', () => __awaiter(void 0, void 0, void 0, function* () {
            const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
            const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
            const receiver = upgradableAuthority.publicKey;
            const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
            let { arrayWallet, totalTicket } = (0, utils_1.generateWhiteListInvest)(9999);
            const randomNumber = Math.floor(Math.random() * 3) + 1;
            const test = upgradableAuthority.publicKey.toString() +
                '_' +
                randomNumber.toString();
            arrayWallet.push(test);
            totalTicket += randomNumber;
            const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
            const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                sortPairs: true,
            });
            const merkle_root = merkleTree.getRoot();
            const id = (0, utils_1.generateRandomObjectId)();
            const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
            const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
            const tokenOffered = 100000; // 100 000 token KYUPAD
            const ticketSize = 100; // 100 USDT per ticket
            // const price = (totalTicket * ticketSize) / tokenOffered;
            const projectConfigArgs = {
                id: id,
                startDate: startDate,
                endDate: endDate,
                merkleRoot: merkle_root,
                tokenAddress: tokenAddress,
                ticketSize: new anchor_1.BN(ticketSize * Math.pow(10, tokenData.decimals)),
                tokenOffered: tokenOffered,
                totalTicket: totalTicket,
            };
            const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
            const remainingAccounRegister = [
                {
                    pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                    isSigner: false,
                    isWritable: false,
                },
                {
                    pubkey: tokenAddress,
                    isSigner: false,
                    isWritable: false,
                },
            ];
            // const createAtaIns = createAssociatedTokenAccountInstruction(
            //   upgradableAuthority.publicKey,
            //   vaultAddress,
            //   receiver,
            //   tokenAddress
            // );
            const registerProjectIns = yield program.methods
                .registerProject(projectConfigArgs)
                .accounts({
                creator: upgradableAuthority.publicKey,
                receiver: receiver,
            })
                .remainingAccounts(remainingAccounRegister)
                .instruction();
            const tx = new web3_js_1.Transaction().add(registerProjectIns);
            tx.feePayer = upgradableAuthority.publicKey;
            tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
            tx.partialSign(upgradableAuthority);
            const sig = yield connection.sendTransaction(tx, [upgradableAuthority], {
                skipPreflight: true,
            });
            console.log('Register project with token: ', sig);
            yield (0, utils_1.sleep)(2000);
            const projectData = yield program.account.projectConfig.fetch(project);
            const projectDataInput = Object.assign(Object.assign({}, projectConfigArgs), { vaultAddress: vaultAddress, tokenProgram: null });
            const order1 = Object.keys(projectData)
                .sort()
                .reduce((obj, key) => {
                obj[key] = projectData[key];
                return obj;
            }, {});
            const order2 = Object.keys(projectDataInput)
                .sort()
                .reduce((obj, key) => {
                obj[key] = projectDataInput[key];
                return obj;
            }, {});
            (0, chai_1.expect)(JSON.stringify(order1) === JSON.stringify(order2), 'Expect project pda data to be equal initial data').to.be.true;
        }));
        it('Resgister project but not admin', () => __awaiter(void 0, void 0, void 0, function* () {
            const fakeAdmin = web3_js_1.Keypair.generate();
            // create fakeMaster
            yield (0, utils_1.createAccount)({
                connection: connection,
                payerKeypair: upgradableAuthority,
                newAccountKeypair: fakeAdmin,
                lamports: 0.01 * web3_js_1.LAMPORTS_PER_SOL,
            });
            const vaultAddress = fakeAdmin.publicKey;
            let { arrayWallet, totalTicket } = (0, utils_1.generateWhiteListInvest)(9999);
            const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
            const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                sortPairs: true,
            });
            const merkle_root = merkleTree.getRoot();
            const id = (0, utils_1.generateRandomObjectId)();
            const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
            const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
            const tokenOffered = 1000000;
            const ticketSize = new anchor_1.BN(0.1 * web3_js_1.LAMPORTS_PER_SOL);
            const projectConfigArgs = {
                id: id,
                startDate: startDate,
                endDate: endDate,
                merkleRoot: merkle_root,
                tokenAddress: null,
                ticketSize: ticketSize,
                tokenOffered: tokenOffered,
                totalTicket: totalTicket,
            };
            const registerProjectIns = yield program.methods
                .registerProject(projectConfigArgs)
                .accounts({
                creator: fakeAdmin.publicKey,
                receiver: vaultAddress,
            })
                .instruction();
            const tx = new web3_js_1.Transaction().add(registerProjectIns);
            tx.feePayer = fakeAdmin.publicKey;
            tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
            tx.partialSign(fakeAdmin);
            let expected_error = false;
            try {
                yield connection.sendTransaction(tx, [fakeAdmin]);
            }
            catch (error) {
                expected_error = true;
            }
            (0, chai_1.expect)(expected_error, 'Expect register project transaction must be failed').to.be.true;
        }));
    }));
    describe('🔑🔑🔑 Permission', () => __awaiter(void 0, void 0, void 0, function* () {
        it('Init master', () => __awaiter(void 0, void 0, void 0, function* () {
            const [masterPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('master')], program.programId);
            const BPF_LOADER_PROGRAM = new web3_js_1.PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
            const [programData] = web3_js_1.PublicKey.findProgramAddressSync([program.programId.toBuffer()], BPF_LOADER_PROGRAM);
            const createAdminIns = yield program.methods
                .initMaster(upgradableAuthority.publicKey)
                .accounts({
                signer: upgradableAuthority.publicKey,
                programData: programData,
            })
                .instruction();
            const tx = new web3_js_1.Transaction().add(createAdminIns);
            tx.feePayer = upgradableAuthority.publicKey;
            tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
            tx.partialSign(upgradableAuthority);
            const sig = yield connection.sendTransaction(tx, [upgradableAuthority], {
                maxRetries: 20,
                skipPreflight: true,
            });
            yield (0, utils_1.sleep)(2000);
            const masterData = yield program.account.master.fetch(masterPda);
            console.log('Init master: ', sig);
            (0, chai_1.expect)(masterData.masterKey.toString() ===
                upgradableAuthority.publicKey.toString(), 'Expect master PDA have the key of master').to.be.true;
        }));
        it('Add admin', () => __awaiter(void 0, void 0, void 0, function* () {
            const adminAddress = new web3_js_1.PublicKey('6N4XbeWRUS2Hqy7zBpXZHtQzd4rYYvn8mtfHDRvVYX2X');
            // const adminAddress = upgradableAuthority.publicKey;
            const addAdminIns = yield program.methods
                .addAdmin(adminAddress)
                .accounts({
                signer: upgradableAuthority.publicKey,
            })
                .instruction();
            const tx = new web3_js_1.Transaction().add(addAdminIns);
            tx.feePayer = upgradableAuthority.publicKey;
            tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
            tx.partialSign(upgradableAuthority);
            const sig = yield connection.sendTransaction(tx, [upgradableAuthority], {
                maxRetries: 20,
                skipPreflight: true,
                preflightCommitment: 'confirmed',
            });
            yield (0, utils_1.sleep)(2000);
            const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), adminAddress.toBuffer()], program.programId);
            const adminPdaData = yield program.account.admin.fetch(adminPda);
            console.log('Add admin: ', sig);
            (0, chai_1.expect)(adminPdaData.adminKey.toString() === adminAddress.toString(), 'This account must to be initialize').to.be.true;
        }));
        it('Init another master but not deployer', () => __awaiter(void 0, void 0, void 0, function* () {
            const fakeDeployer = web3_js_1.Keypair.generate();
            // create fakeMaster
            yield (0, utils_1.createAccount)({
                connection: connection,
                payerKeypair: upgradableAuthority,
                newAccountKeypair: fakeDeployer,
                lamports: 0.01 * web3_js_1.LAMPORTS_PER_SOL,
            });
            const BPF_LOADER_PROGRAM = new web3_js_1.PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
            const [programData] = web3_js_1.PublicKey.findProgramAddressSync([program.programId.toBuffer()], BPF_LOADER_PROGRAM);
            const createAdminIns = yield program.methods
                .initMaster(fakeDeployer.publicKey)
                .accounts({
                signer: fakeDeployer.publicKey,
                programData: programData,
            })
                .instruction();
            const tx = new web3_js_1.Transaction().add(createAdminIns);
            tx.feePayer = fakeDeployer.publicKey;
            tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
            tx.partialSign(fakeDeployer);
            let expected_error = false;
            try {
                yield connection.sendTransaction(tx, [fakeDeployer], {
                    skipPreflight: true,
                });
            }
            catch (error) {
                expected_error = true;
            }
            (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                .true;
        }));
        it('Addadmin but not master', () => __awaiter(void 0, void 0, void 0, function* () {
            const fakeMaster = web3_js_1.Keypair.generate();
            // create fakeMaster
            yield (0, utils_1.createAccount)({
                connection: connection,
                payerKeypair: upgradableAuthority,
                newAccountKeypair: fakeMaster,
                lamports: 0.01 * web3_js_1.LAMPORTS_PER_SOL,
            });
            const addAdminIns = yield program.methods
                .addAdmin(fakeMaster.publicKey)
                .accounts({
                signer: fakeMaster.publicKey,
            })
                .instruction();
            const tx = new web3_js_1.Transaction().add(addAdminIns);
            tx.feePayer = fakeMaster.publicKey;
            tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
            tx.partialSign(fakeMaster);
            let expected_error = false;
            try {
                yield connection.sendTransaction(tx, [fakeMaster]);
            }
            catch (error) {
                expected_error = true;
            }
            (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                .true;
        }));
    }));
    describe('💰💰💰 Invest', () => {
        describe('1️⃣ With no ticket', () => {
            it('D1: Try to invest', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet, totalTicket } = (0, utils_1.generateWhiteListInvest)(9999);
                const randomNumber = Math.floor(Math.random() * 3) + 1;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    randomNumber.toString();
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const tokenOffered = 100000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const createAtaIns = (0, spl_token_1.createAssociatedTokenAccountInstruction)(upgradableAuthority.publicKey, vaultAddress, receiver, tokenAddress);
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = randomNumber - 1 === 0 ? randomNumber : randomNumber - 1;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: randomNumber,
                    merkleProof: merkle_proof,
                };
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(createAtaIns)
                    .add(registerProjectIns)
                    .add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                let expected_error = false;
                try {
                    yield connection.sendTransaction(tx, [upgradableAuthority]);
                }
                catch (error) {
                    expected_error = true;
                }
                (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                    .true;
            }));
            it('D2: Out of time', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet, totalTicket } = (0, utils_1.generateWhiteListInvest)(9999);
                const randomNumber = Math.floor(Math.random() * 3) + 1;
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000) - 3000);
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) - 100);
                const tokenOffered = 100000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const createAtaIns = (0, spl_token_1.createAssociatedTokenAccountInstruction)(upgradableAuthority.publicKey, vaultAddress, receiver, tokenAddress);
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const usertotalTicket = randomNumber - 1 === 0 ? randomNumber : randomNumber - 1;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: randomNumber,
                    merkleProof: [[]],
                };
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(createAtaIns)
                    .add(registerProjectIns)
                    .add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                let expected_error = false;
                try {
                    yield connection.sendTransaction(tx, [upgradableAuthority]);
                }
                catch (error) {
                    expected_error = true;
                }
                (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                    .true;
            }));
        });
        describe('2️⃣ With 1 ticket', () => {
            it('D3: Success', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 1;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const totalTicket = 1500;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const createAtaIns = (0, spl_token_1.createAssociatedTokenAccountInstruction)(upgradableAuthority.publicKey, vaultAddress, receiver, tokenAddress);
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: usertotalTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(createAtaIns)
                    .add(registerProjectIns)
                    .add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                const sig = yield connection.sendTransaction(tx, [upgradableAuthority], {
                    skipPreflight: true,
                });
                console.log('Invest: ', sig);
                yield (0, utils_1.sleep)(2000);
                const info = yield (0, spl_token_1.getAccount)(connection, vaultAddress);
                const amount = Number(info.amount);
                (0, chai_1.expect)(amount, 'vaultAddress amount should equal ticket size').to.eq(ticketSize.toNumber() * usertotalTicket);
                const projectCounterData = yield program.account.projectCounter.fetch(projectCounter);
                (0, chai_1.expect)(projectCounterData.remaining, "Project counter should be equal investotal - user's invest total").to.eq(totalTicket - usertotalTicket);
                const investCounterData = yield program.account.investorCounter.fetch(investCounter);
                (0, chai_1.expect)(investCounterData.totalInvestedTicket, 'User invest counter should be equal 0').to.eq(1);
            }));
            it('D4: Before invest time', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet, totalTicket } = (0, utils_1.generateWhiteListInvest)(9999);
                const randomNumber = Math.floor(Math.random() * 3) + 1;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    randomNumber.toString();
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 1000);
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const tokenOffered = 100000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const createAtaIns = (0, spl_token_1.createAssociatedTokenAccountInstruction)(upgradableAuthority.publicKey, vaultAddress, receiver, tokenAddress);
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = randomNumber - 1 === 0 ? randomNumber : randomNumber - 1;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: randomNumber,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(createAtaIns)
                    .add(registerProjectIns)
                    .add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                let expected_error = false;
                try {
                    yield connection.sendTransaction(tx, [upgradableAuthority]);
                }
                catch (error) {
                    expected_error = true;
                }
                (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                    .true;
            }));
            it('D5: After invest time', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 1;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 1000);
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const totalTicket = 1500;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const createAtaIns = (0, spl_token_1.createAssociatedTokenAccountInstruction)(upgradableAuthority.publicKey, vaultAddress, receiver, tokenAddress);
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: usertotalTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(createAtaIns)
                    .add(registerProjectIns)
                    .add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                let expected_error = false;
                try {
                    yield connection.sendTransaction(tx, [upgradableAuthority]);
                }
                catch (error) {
                    expected_error = true;
                }
                (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                    .true;
            }));
            it('D6: Try to invest with more tickets then they have', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 1;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const totalTicket = 1500;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const createAtaIns = (0, spl_token_1.createAssociatedTokenAccountInstruction)(upgradableAuthority.publicKey, vaultAddress, receiver, tokenAddress);
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket + 1,
                    maxTicketAmount: usertotalTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(createAtaIns)
                    .add(registerProjectIns)
                    .add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                let expected_error = false;
                try {
                    yield connection.sendTransaction(tx, [upgradableAuthority]);
                }
                catch (error) {
                    expected_error = true;
                }
                (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                    .true;
            }));
            it('D7: User is out of ticket', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 1;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const totalTicket = 1500;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const createAtaIns = (0, spl_token_1.createAssociatedTokenAccountInstruction)(upgradableAuthority.publicKey, vaultAddress, receiver, tokenAddress);
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: usertotalTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(createAtaIns)
                    .add(registerProjectIns)
                    .add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                yield connection.sendTransaction(tx, [upgradableAuthority]);
                const investSecondTimeIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx_2 = new web3_js_1.Transaction().add(investSecondTimeIns);
                tx_2.feePayer = upgradableAuthority.publicKey;
                tx_2.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx_2.partialSign(upgradableAuthority);
                let expected_error = false;
                try {
                    yield connection.sendTransaction(tx_2, [upgradableAuthority]);
                }
                catch (error) {
                    expected_error = true;
                }
                (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                    .true;
            }));
            it('D8: Project is out of ticket', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 2;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const totalTicket = 1;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const createAtaIns = (0, spl_token_1.createAssociatedTokenAccountInstruction)(upgradableAuthority.publicKey, vaultAddress, receiver, tokenAddress);
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket - 1;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: userTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(createAtaIns)
                    .add(registerProjectIns)
                    .add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                yield connection.sendTransaction(tx, [upgradableAuthority], {
                    skipPreflight: true,
                });
                const investSecondTimeIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx_2 = new web3_js_1.Transaction().add(investSecondTimeIns);
                tx_2.feePayer = upgradableAuthority.publicKey;
                tx_2.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx_2.partialSign(upgradableAuthority);
                let expected_error = false;
                try {
                    yield connection.sendTransaction(tx_2, [upgradableAuthority]);
                }
                catch (error) {
                    expected_error = true;
                }
                (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                    .true;
            }));
        });
        describe('3️⃣ With 2 ticket', () => {
            it('D10: Success with 1 ticket', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 2;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const totalTicket = 1500;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const createAtaIns = (0, spl_token_1.createAssociatedTokenAccountInstruction)(upgradableAuthority.publicKey, vaultAddress, receiver, tokenAddress);
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket - 1;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: userTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(createAtaIns)
                    .add(registerProjectIns)
                    .add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                const sig = yield connection.sendTransaction(tx, [upgradableAuthority], {
                    skipPreflight: true,
                });
                console.log('Invest: ', sig);
                yield (0, utils_1.sleep)(2000);
                const info = yield (0, spl_token_1.getAccount)(connection, vaultAddress);
                const amount = Number(info.amount);
                (0, chai_1.expect)(amount, 'vaultAddress amount should equal ticket size').to.eq(ticketSize.toNumber() * usertotalTicket);
                const projectCounterData = yield program.account.projectCounter.fetch(projectCounter);
                (0, chai_1.expect)(projectCounterData.remaining, "Project counter should be equal investotal - user's invest total").to.eq(totalTicket - usertotalTicket);
                const investCounterData = yield program.account.investorCounter.fetch(investCounter);
                (0, chai_1.expect)(investCounterData.totalInvestedTicket, 'User invest counter should be equal usertotalTicket').to.eq(usertotalTicket);
            }));
            it('D11: Success with second time invesment', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 2;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const totalTicket = 1500;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const createAtaIns = (0, spl_token_1.createAssociatedTokenAccountInstruction)(upgradableAuthority.publicKey, vaultAddress, receiver, tokenAddress);
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket - 1;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: userTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(createAtaIns)
                    .add(registerProjectIns)
                    .add(investIns)
                    .add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                const sig = yield connection.sendTransaction(tx, [upgradableAuthority], {
                    skipPreflight: true,
                });
                console.log('Invest: ', sig);
                yield (0, utils_1.sleep)(2000);
                const info = yield (0, spl_token_1.getAccount)(connection, vaultAddress);
                const amount = Number(info.amount);
                (0, chai_1.expect)(amount, 'vaultAddress amount should equal ticket size').to.eq(ticketSize.toNumber() * userTicket);
                const projectCounterData = yield program.account.projectCounter.fetch(projectCounter);
                (0, chai_1.expect)(projectCounterData.remaining, "Project counter should be equal investotal - user's invest total").to.eq(totalTicket - userTicket);
                const investCounterData = yield program.account.investorCounter.fetch(investCounter);
                (0, chai_1.expect)(investCounterData.totalInvestedTicket, 'User invest counter should be equal 0').to.eq(2);
            }));
            it('D12: Success with 2 ticket', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 2;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const totalTicket = 1500;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const createAtaIns = (0, spl_token_1.createAssociatedTokenAccountInstruction)(upgradableAuthority.publicKey, vaultAddress, receiver, tokenAddress);
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: userTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(createAtaIns)
                    .add(registerProjectIns)
                    .add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                const sig = yield connection.sendTransaction(tx, [upgradableAuthority], {
                    skipPreflight: true,
                });
                console.log('Invest: ', sig);
                yield (0, utils_1.sleep)(2000);
                const info = yield (0, spl_token_1.getAccount)(connection, vaultAddress);
                const amount = Number(info.amount);
                (0, chai_1.expect)(amount, 'vaultAddress amount should equal ticket size').to.eq(ticketSize.toNumber() * usertotalTicket);
                const projectCounterData = yield program.account.projectCounter.fetch(projectCounter);
                (0, chai_1.expect)(projectCounterData.remaining, "Project counter should be equal investotal - user's invest total").to.eq(totalTicket - usertotalTicket);
                const investCounterData = yield program.account.investorCounter.fetch(investCounter);
                (0, chai_1.expect)(investCounterData.totalInvestedTicket, 'User invest counter should be equal 2').to.eq(2);
            }));
            it('D13: Before invest time', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 2;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 1000);
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const totalTicket = 1500;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: userTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction().add(registerProjectIns).add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                let expected_error = false;
                try {
                    yield connection.sendTransaction(tx, [upgradableAuthority]);
                }
                catch (error) {
                    expected_error = true;
                }
                (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                    .true;
            }));
            it('D14: Afteer invest time', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 2;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000) - 3000);
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) - 1000);
                const totalTicket = 1500;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: userTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction().add(registerProjectIns).add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                let expected_error = false;
                try {
                    yield connection.sendTransaction(tx, [upgradableAuthority]);
                }
                catch (error) {
                    expected_error = true;
                }
                (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                    .true;
            }));
            it('D15: Number tiket is bigger than they have', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 2;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const totalTicket = 1500;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket + 1;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: userTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction().add(registerProjectIns).add(investIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                let expected_error = false;
                try {
                    yield connection.sendTransaction(tx, [upgradableAuthority]);
                }
                catch (error) {
                    expected_error = true;
                }
                (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                    .true;
            }));
            it('D16: Number tiket is bigger than they have', () => __awaiter(void 0, void 0, void 0, function* () {
                const tokenAddress = new web3_js_1.PublicKey('4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg');
                const tokenData = yield (0, spl_token_1.getMint)(connection, tokenAddress);
                const receiver = web3_js_1.Keypair.generate().publicKey;
                const vaultAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, receiver);
                let { arrayWallet } = (0, utils_1.generateWhiteListInvest)(100);
                const userTicket = 2;
                const test = upgradableAuthority.publicKey.toString() +
                    '_' +
                    userTicket.toString();
                arrayWallet.push(test);
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const totalTicket = 1500;
                const tokenOffered = 10000; // 100 000 token KYUPAD
                const ticketSize = new anchor_1.BN(100 * Math.pow(10, tokenData.decimals)); // 100 USDT per ticket
                // const price = (totalTicket * ticketSize) / tokenOffered;
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: tokenAddress,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const [project] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)], program.programId);
                const [projectCounter] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('project_counter'), project.toBuffer()], program.programId);
                const [adminPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()], program.programId);
                const remainingAccounRegister = [
                    {
                        pubkey: spl_token_1.TOKEN_PROGRAM_ID,
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: tokenAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ];
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: receiver,
                })
                    .remainingAccounts(remainingAccounRegister)
                    .instruction();
                const getProof = merkleTree.getProof((0, keccak256_1.default)(test));
                const merkle_proof = getProof.map((item) => Array.from(item.data));
                const usertotalTicket = userTicket - 1;
                const investArgs = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: usertotalTicket,
                    maxTicketAmount: userTicket,
                    merkleProof: merkle_proof,
                };
                const [investCounter] = web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from('invest_counter'),
                    project.toBuffer(),
                    upgradableAuthority.publicKey.toBuffer(),
                ], program.programId);
                const source = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenAddress, upgradableAuthority.publicKey);
                const remainingAccountsInvest = [
                    ...remainingAccounRegister,
                    {
                        pubkey: source,
                        isSigner: false,
                        isWritable: true,
                    },
                ];
                const investIns = yield program.methods
                    .invest(investArgs)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const investArgs2 = {
                    projectId: projectConfigArgs.id,
                    ticketAmount: 2,
                    maxTicketAmount: userTicket,
                    merkleProof: merkle_proof,
                };
                const investIns2 = yield program.methods
                    .invest(investArgs2)
                    .accounts({
                    investor: upgradableAuthority.publicKey,
                    vaultAddress: vaultAddress,
                })
                    .signers([upgradableAuthority])
                    .remainingAccounts(remainingAccountsInvest)
                    .instruction();
                const tx = new web3_js_1.Transaction()
                    .add(registerProjectIns)
                    .add(investIns)
                    .add(investIns2);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                let expected_error = false;
                try {
                    yield connection.sendTransaction(tx, [upgradableAuthority]);
                }
                catch (error) {
                    expected_error = true;
                }
                (0, chai_1.expect)(expected_error, 'Expect invest transaction must be failed').to.be
                    .true;
            }));
        });
        describe('4️⃣ Multiple user', () => __awaiter(void 0, void 0, void 0, function* () {
            it('Invest successfully', () => __awaiter(void 0, void 0, void 0, function* () {
                const vaultAddress = upgradableAuthority.publicKey;
                const number_of_user = 5000;
                const arrayUserKeypair = [];
                const arrayWallet = [];
                const arrayMaxTicketAmount = [];
                let totalTicket = 0;
                // preprare transfer sol to user
                for (let i = 0; i < number_of_user; i++) {
                    console.log(`💲💲💲 Transfer sol for user ${i}`);
                    const userKeypair = web3_js_1.Keypair.generate();
                    arrayUserKeypair.push(userKeypair);
                    const randomNumber = Math.floor(Math.random() * 3) + 1;
                    arrayMaxTicketAmount.push(randomNumber);
                    arrayWallet.push(userKeypair.publicKey.toString() + '_' + randomNumber.toString());
                    totalTicket += randomNumber;
                    yield (0, utils_1.createAccount)({
                        connection: connection,
                        payerKeypair: upgradableAuthority,
                        newAccountKeypair: userKeypair,
                        lamports: (0.00001 * randomNumber + 0.0015) * web3_js_1.LAMPORTS_PER_SOL,
                    });
                }
                const leafNode = arrayWallet.map((addr) => (0, keccak256_1.default)(addr));
                const merkleTree = new merkletreejs_1.default(leafNode, keccak256_1.default, {
                    sortPairs: true,
                });
                const merkle_root = merkleTree.getRoot();
                const id = (0, utils_1.generateRandomObjectId)();
                const startDate = new anchor_1.BN(Math.floor(Date.now() / 1000));
                const endDate = new anchor_1.BN(Math.floor(Date.now() / 1000) + 3000);
                const tokenOffered = 1000000;
                const ticketSize = new anchor_1.BN(0.00001 * web3_js_1.LAMPORTS_PER_SOL);
                const projectConfigArgs = {
                    id: id,
                    startDate: startDate,
                    endDate: endDate,
                    merkleRoot: merkle_root,
                    tokenAddress: null,
                    ticketSize: ticketSize,
                    tokenOffered: tokenOffered,
                    totalTicket: totalTicket,
                };
                const registerProjectIns = yield program.methods
                    .registerProject(projectConfigArgs)
                    .accounts({
                    creator: upgradableAuthority.publicKey,
                    receiver: vaultAddress,
                })
                    .instruction();
                const tx = new web3_js_1.Transaction().add(registerProjectIns);
                tx.feePayer = upgradableAuthority.publicKey;
                tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                tx.partialSign(upgradableAuthority);
                const sig = yield connection.sendTransaction(tx, [upgradableAuthority], {
                    maxRetries: 20,
                    preflightCommitment: 'processed',
                });
                console.log('Register project with sol: ', sig);
                // invest
                for (let i = 0; i < number_of_user; i++) {
                    const ticketAmount = arrayMaxTicketAmount[i] - 1 === 0
                        ? arrayMaxTicketAmount[i]
                        : arrayMaxTicketAmount[i] - 1;
                    console.log(`User ${i + 1}: ${arrayUserKeypair[i].publicKey} invest ${ticketAmount}`);
                    const wallet_with_max = arrayUserKeypair[i].publicKey.toString() +
                        '_' +
                        arrayMaxTicketAmount[i].toString();
                    const getProof = merkleTree.getProof((0, keccak256_1.default)(wallet_with_max));
                    const merkle_proof = getProof.map((item) => Array.from(item.data));
                    const investArgs = {
                        projectId: id,
                        ticketAmount: ticketAmount,
                        maxTicketAmount: arrayMaxTicketAmount[i],
                        merkleProof: merkle_proof,
                    };
                    const investIns = yield program.methods
                        .invest(investArgs)
                        .accounts({
                        investor: arrayUserKeypair[i].publicKey,
                        vaultAddress: vaultAddress,
                    })
                        .signers([arrayUserKeypair[i]])
                        .instruction();
                    const tx = new web3_js_1.Transaction().add(investIns);
                    tx.feePayer = arrayUserKeypair[i].publicKey;
                    tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                    tx.partialSign(arrayUserKeypair[i]);
                    const sig = yield connection.sendTransaction(tx, [arrayUserKeypair[i]], { skipPreflight: true });
                    console.log('Invest: ', sig);
                }
            }));
        }));
        // xit('Invest project with sol', async () => {
        //   const vaultAddress = Keypair.generate().publicKey;
        //   let { arrayWallet, totalTicket } = generateWhiteListInvest(9999);
        //   const randomNumber = Math.floor(Math.random() * 3) + 1;
        //   const test =
        //     upgradableAuthority.publicKey.toString() +
        //     '_' +
        //     randomNumber.toString();
        //   arrayWallet.push(test);
        //   totalTicket += randomNumber;
        //   const leafNode = arrayWallet.map((addr) => keccak256(addr));
        //   const merkleTree = new MerkleTree(leafNode, keccak256, {
        //     sortPairs: true,
        //   });
        //   const merkle_root = merkleTree.getRoot();
        //   const id = generateRandomObjectId();
        //   const startDate = new BN(Math.floor(Date.now() / 1000));
        //   const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);
        //   const tokenOffered = 1_000_000;
        //   const ticketSizeSol = 0.1;
        //   const ticketSize = new BN(ticketSizeSol * LAMPORTS_PER_SOL);
        //   const projectConfigArgs: ProjectConfigArgs = {
        //     id: id,
        //     startDate: startDate,
        //     endDate: endDate,
        //     merkleRoot: merkle_root,
        //     tokenAddress: null,
        //     ticketSize: ticketSize,
        //     tokenOffered: tokenOffered,
        //     totalTicket: totalTicket,
        //   };
        //   const [project] = PublicKey.findProgramAddressSync(
        //     [Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)],
        //     program.programId
        //   );
        //   const [projectCounter] = PublicKey.findProgramAddressSync(
        //     [Buffer.from('project_counter'), project.toBuffer()],
        //     program.programId
        //   );
        //   const [adminPda] = PublicKey.findProgramAddressSync(
        //     [Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()],
        //     program.programId
        //   );
        //   const registerProjectIns = await program.methods
        //     .registerProject(projectConfigArgs)
        //     .accounts({
        //       creator: upgradableAuthority.publicKey,
        //       receiver: vaultAddress,
        //     })
        //     .instruction();
        //   const getProof = merkleTree.getProof(keccak256(test));
        //   const merkle_proof = getProof.map((item) => Array.from(item.data));
        //   const usertotalTicket =
        //     randomNumber - 1 === 0 ? randomNumber : randomNumber - 1;
        //   const investArgs: InvestArgs = {
        //     projectId: projectConfigArgs.id,
        //     ticketAmount: usertotalTicket,
        //     maxTicketAmount: randomNumber,
        //     merkleProof: merkle_proof,
        //   };
        //   const [investCounter] = PublicKey.findProgramAddressSync(
        //     [
        //       Buffer.from('invest_counter'),
        //       project.toBuffer(),
        //       upgradableAuthority.publicKey.toBuffer(),
        //     ],
        //     program.programId
        //   );
        //   const investIns = await program.methods
        //     .invest(investArgs)
        //     .accounts({
        //       investor: upgradableAuthority.publicKey,
        //       vaultAddress: vaultAddress,
        //     })
        //     .signers([upgradableAuthority])
        //     .instruction();
        //   const tx = new Transaction().add(registerProjectIns).add(investIns);
        //   tx.feePayer = upgradableAuthority.publicKey;
        //   tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        //   tx.partialSign(upgradableAuthority);
        //   const sig = await connection.sendTransaction(tx, [upgradableAuthority], {
        //     skipPreflight: true,
        //   });
        //   console.log('Invest: ', sig);
        //   await sleep(2000);
        //   const projectCounterData = await program.account.projectCounter.fetch(
        //     projectCounter
        //   );
        //   const expectedBalance = await connection.getBalance(vaultAddress);
        //   expect(
        //     expectedBalance,
        //     'Expected vaultAddress balace equal ticketSOL'
        //   ).to.eq(ticketSize.toNumber() * usertotalTicket);
        //   expect(
        //     projectCounterData.remaining,
        //     "Project counter should be equal investotal - user's invest total"
        //   ).to.eq(totalTicket - usertotalTicket);
        //   const investCounterData = await program.account.investorCounter.fetch(
        //     investCounter
        //   );
        //   expect(
        //     investCounterData.totalInvestedTicket,
        //     'User invest counter should be equal 0 or 1'
        //   ).to.eq(randomNumber - usertotalTicket);
        // });
        // xit('Invest project with token', async () => {
        //   const tokenAddress = new PublicKey(
        //     '4LU6qSioai7RSwSBaNErE4pcj6z7dCtUY2UTNHXstxsg'
        //   );
        //   const tokenData = await getMint(connection, tokenAddress);
        //   const receiver = Keypair.generate().publicKey;
        //   const vaultAddress = (
        //     await getOrCreateAssociatedTokenAccount(
        //       connection,
        //       upgradableAuthority,
        //       tokenAddress,
        //       receiver
        //     )
        //   ).address;
        //   let { arrayWallet } = generateWhiteListInvest(9999);
        //   const usertotalTicket = 1;
        //   const test =
        //     upgradableAuthority.publicKey.toString() +
        //     '_' +
        //     usertotalTicket.toString();
        //   arrayWallet.push(test);
        //   const leafNode = arrayWallet.map((addr) => keccak256(addr));
        //   const merkleTree = new MerkleTree(leafNode, keccak256, {
        //     sortPairs: true,
        //   });
        //   const merkle_root = merkleTree.getRoot();
        //   const id = generateRandomObjectId();
        //   const startDate = new BN(Math.floor(Date.now() / 1000));
        //   const endDate = new BN(Math.floor(Date.now() / 1000) + 3000);
        //   const totalTicket = 1500;
        //   const tokenOffered = 10000; // 100 000 token KYUPAD
        //   const ticketSize = new BN(100 * 10 ** tokenData.decimals); // 100 USDT per ticket
        //   // const price = (totalTicket * ticketSize) / tokenOffered;
        //   const projectConfigArgs: ProjectConfigArgs = {
        //     id: id,
        //     startDate: startDate,
        //     endDate: endDate,
        //     merkleRoot: merkle_root,
        //     tokenAddress: tokenAddress,
        //     ticketSize: ticketSize,
        //     tokenOffered: tokenOffered,
        //     totalTicket: totalTicket,
        //   };
        //   const [project] = PublicKey.findProgramAddressSync(
        //     [Buffer.from('project_config'), Buffer.from(projectConfigArgs.id)],
        //     program.programId
        //   );
        //   const [projectCounter] = PublicKey.findProgramAddressSync(
        //     [Buffer.from('project_counter'), project.toBuffer()],
        //     program.programId
        //   );
        //   const [adminPda] = PublicKey.findProgramAddressSync(
        //     [Buffer.from('admin'), upgradableAuthority.publicKey.toBuffer()],
        //     program.programId
        //   );
        //   const remainingAccounRegister: AccountMeta[] = [
        //     {
        //       pubkey: TOKEN_PROGRAM_ID,
        //       isSigner: false,
        //       isWritable: false,
        //     },
        //     {
        //       pubkey: tokenAddress,
        //       isSigner: false,
        //       isWritable: false,
        //     },
        //   ];
        //   const registerProjectIns = await program.methods
        //     .registerProject(projectConfigArgs)
        //     .accounts({
        //       creator: upgradableAuthority.publicKey,
        //       receiver: receiver,
        //     })
        //     .remainingAccounts(remainingAccounRegister)
        //     .instruction();
        //   const getProof = merkleTree.getProof(keccak256(test));
        //   const merkle_proof = getProof.map((item) => Array.from(item.data));
        //   const investArgs: InvestArgs = {
        //     projectId: projectConfigArgs.id,
        //     ticketAmount: usertotalTicket,
        //     maxTicketAmount: usertotalTicket,
        //     merkleProof: merkle_proof,
        //   };
        //   const [investCounter] = PublicKey.findProgramAddressSync(
        //     [
        //       Buffer.from('invest_counter'),
        //       project.toBuffer(),
        //       upgradableAuthority.publicKey.toBuffer(),
        //     ],
        //     program.programId
        //   );
        //   const source = getAssociatedTokenAddressSync(
        //     tokenAddress,
        //     upgradableAuthority.publicKey
        //   );
        //   const remainingAccountsInvest: AccountMeta[] = [
        //     ...remainingAccounRegister,
        //     {
        //       pubkey: source,
        //       isSigner: false,
        //       isWritable: true,
        //     },
        //   ];
        //   const investIns = await program.methods
        //     .invest(investArgs)
        //     .accounts({
        //       investor: upgradableAuthority.publicKey,
        //       vaultAddress: vaultAddress,
        //     })
        //     .signers([upgradableAuthority])
        //     .remainingAccounts(remainingAccountsInvest)
        //     .instruction();
        //   const tx = new Transaction().add(registerProjectIns).add(investIns);
        //   tx.feePayer = upgradableAuthority.publicKey;
        //   tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        //   tx.partialSign(upgradableAuthority);
        //   const sig = await connection.sendTransaction(tx, [upgradableAuthority], {
        //     skipPreflight: true,
        //   });
        //   console.log('Invest: ', sig);
        //   await sleep(2000);
        //   const info = await getAccount(connection, vaultAddress);
        //   const amount = Number(info.amount);
        //   expect(amount, 'vaultAddress amount should equal ticket size').to.eq(
        //     ticketSize.toNumber()
        //   );
        //   const projectCounterData = await program.account.projectCounter.fetch(
        //     projectCounter
        //   );
        //   expect(
        //     projectCounterData.remaining,
        //     "Project counter should be equal investotal - user's invest total"
        //   ).to.eq(totalTicket - usertotalTicket);
        //   const investCounterData = await program.account.investorCounter.fetch(
        //     investCounter
        //   );
        //   expect(
        //     investCounterData.totalInvestedTicket,
        //     'User invest counter should be equal 0'
        //   ).to.eq(0);
        // });
    });
});
//# sourceMappingURL=ido.js.map