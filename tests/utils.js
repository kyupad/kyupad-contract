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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMultiple = exports.withdrawStreamLayout = exports.withdrawStreamInstruction = exports.prepareWithdrawInstructions = exports.STREAMFLOW_TREASURY_PUBLIC_KEY = exports.createAccount = exports.generateRecipents = exports.sleep = exports.generateRandomObjectId = exports.generateWhiteListInvest = exports.generateWhiteList = exports.FEE_ORACLE_PUBLIC_KEY = exports.WITHDRAWOR_PUBLIC_KEY = void 0;
const web3_js_1 = require("@solana/web3.js");
const solana_1 = require("@streamflow/common/solana");
const stream_1 = require("@streamflow/stream");
const js_sha256_1 = require("js-sha256");
const solana_2 = require("@streamflow/stream/solana");
const BufferLayout = __importStar(require("@solana/buffer-layout"));
const mongodb_1 = require("mongodb");
// import {
//   FEE_ORACLE_PUBLIC_KEY,
//   WITHDRAWOR_PUBLIC_KEY,
// } from '@streamflow/stream/dist/solana/constants';
const spl_token_1 = require("@solana/spl-token");
exports.WITHDRAWOR_PUBLIC_KEY = new web3_js_1.PublicKey('wdrwhnCv4pzW8beKsbPa4S2UDZrXenjg16KJdKSpb5u');
exports.FEE_ORACLE_PUBLIC_KEY = new web3_js_1.PublicKey('B743wFVk2pCYhV91cn287e1xY7f1vt4gdY48hhNiuQmT');
const generateWhiteList = (size) => {
    const arrayWallet = [];
    for (let i = 0; i < size; i++) {
        arrayWallet.push(web3_js_1.Keypair.generate().publicKey.toString());
    }
    return arrayWallet;
};
exports.generateWhiteList = generateWhiteList;
const generateWhiteListInvest = (size) => {
    const arrayWallet = [];
    let totalTicket = 0;
    for (let i = 0; i < size; i++) {
        const randomNumber = Math.floor(Math.random() * 3) + 1;
        totalTicket += randomNumber;
        arrayWallet.push(web3_js_1.Keypair.generate().publicKey.toString() + '_' + randomNumber.toString());
    }
    return { arrayWallet, totalTicket };
};
exports.generateWhiteListInvest = generateWhiteListInvest;
const generateRandomObjectId = () => {
    const objectId = new mongodb_1.ObjectId();
    return objectId.toHexString();
};
exports.generateRandomObjectId = generateRandomObjectId;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.sleep = sleep;
const generateRecipents = (size, isCliff, decimals, amountTimeUnit) => {
    const recipients = [];
    for (let i = 0; i < size; i++) {
        const amount = randomNumberGenerator(1000);
        const recipient = {
            recipient: web3_js_1.Keypair.generate().publicKey.toString(),
            amount: (0, stream_1.getBN)(amount, decimals),
            name: 'Unknown',
            cliffAmount: (0, stream_1.getBN)(0, decimals),
            amountPerPeriod: isCliff
                ? (0, stream_1.getBN)(amount, decimals)
                : (0, stream_1.getBN)(amount / amountTimeUnit, decimals),
        };
        recipients.push(recipient);
    }
    return recipients;
};
exports.generateRecipents = generateRecipents;
function randomNumberGenerator(n) {
    if (n < 0) {
        throw new Error('Input phải là một số không âm.');
    }
    return Math.floor(Math.random() * (n + 1));
}
const createAccount = ({ connection, payerKeypair, newAccountKeypair, lamports, }) => __awaiter(void 0, void 0, void 0, function* () {
    const dataLength = 0;
    const rentExemptionAmount = yield connection.getMinimumBalanceForRentExemption(dataLength);
    const createAccountIns = web3_js_1.SystemProgram.createAccount({
        fromPubkey: payerKeypair.publicKey,
        newAccountPubkey: newAccountKeypair.publicKey,
        lamports: rentExemptionAmount,
        space: dataLength,
        programId: web3_js_1.SystemProgram.programId,
    });
    const transferIns = web3_js_1.SystemProgram.transfer({
        fromPubkey: payerKeypair.publicKey,
        toPubkey: newAccountKeypair.publicKey,
        lamports: lamports,
    });
    const tx = new web3_js_1.Transaction().add(createAccountIns).add(transferIns);
    tx.feePayer = payerKeypair.publicKey;
    tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
    tx.partialSign(payerKeypair);
    const sig = yield connection.sendTransaction(tx, [payerKeypair, newAccountKeypair], {
        maxRetries: 20,
    });
    console.log(`Create account ${newAccountKeypair.publicKey} with ${lamports} lamports: ${sig}`);
});
exports.createAccount = createAccount;
exports.STREAMFLOW_TREASURY_PUBLIC_KEY = new web3_js_1.PublicKey('5SEpbdjFK5FxwTvfsGMXVQTD2v4M2c5tyRTxhdsPkgDw');
function prepareWithdrawInstructions({ id, amount = stream_1.WITHDRAW_AVAILABLE_AMOUNT }, { invoker, checkTokenAccounts, computePrice, computeLimit, }, connection) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!invoker.publicKey) {
            throw new Error("Invoker's PublicKey is not available, check passed wallet adapter!");
        }
        const ixs = (0, solana_1.prepareBaseInstructions)(connection, {
            computePrice,
            computeLimit,
        });
        const streamPublicKey = new web3_js_1.PublicKey(id);
        const escrow = yield connection.getAccountInfo(streamPublicKey);
        if (!(escrow === null || escrow === void 0 ? void 0 : escrow.data)) {
            throw new Error("Couldn't get account info");
        }
        const data = (0, solana_2.decodeStream)(escrow.data);
        const { tokenProgramId } = yield (0, solana_1.getMintAndProgram)(connection, data.mint);
        const streamflowTreasuryTokens = yield (0, solana_1.ata)(data.mint, exports.STREAMFLOW_TREASURY_PUBLIC_KEY, tokenProgramId);
        const partnerTokens = yield (0, solana_1.ata)(data.mint, data.partner, tokenProgramId);
        // await checkAssociatedTokenAccounts(
        //   data,
        //   { invoker, checkTokenAccounts },
        //   ixs,
        //   tokenProgramId
        // );
        ixs.push((0, exports.withdrawStreamInstruction)(amount, new web3_js_1.PublicKey('HqDGZjaVRXJ9MGRQEw7qDc2rAr6iH1n1kAQdCZaCMfMZ'), {
            authority: invoker.publicKey,
            recipient: invoker.publicKey,
            recipientTokens: data.recipientTokens,
            metadata: streamPublicKey,
            escrowTokens: data.escrowTokens,
            streamflowTreasury: exports.STREAMFLOW_TREASURY_PUBLIC_KEY,
            streamflowTreasuryTokens,
            partner: data.partner,
            partnerTokens,
            mint: data.mint,
            tokenProgram: tokenProgramId,
        }));
        return ixs;
    });
}
exports.prepareWithdrawInstructions = prepareWithdrawInstructions;
const withdrawStreamInstruction = (amount, programId, { authority, recipient, recipientTokens, metadata, escrowTokens, streamflowTreasury, streamflowTreasuryTokens, partner, partnerTokens, mint, tokenProgram, }) => {
    const keys = [
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: recipientTokens, isSigner: false, isWritable: true },
        { pubkey: metadata, isSigner: false, isWritable: true },
        { pubkey: escrowTokens, isSigner: false, isWritable: true },
        {
            pubkey: streamflowTreasury,
            isSigner: false,
            isWritable: true,
        },
        { pubkey: streamflowTreasuryTokens, isSigner: false, isWritable: true },
        { pubkey: partner, isSigner: false, isWritable: true },
        { pubkey: partnerTokens, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ];
    let data = Buffer.alloc(exports.withdrawStreamLayout.span);
    const decodedData = { amount: amount.toArrayLike(Buffer, 'le', 8) };
    const encodeLength = exports.withdrawStreamLayout.encode(decodedData, data);
    data = data.slice(0, encodeLength);
    data = Buffer.concat([
        Buffer.from(js_sha256_1.sha256.digest('global:withdraw')).slice(0, 8),
        data,
        Buffer.alloc(10),
    ]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
};
exports.withdrawStreamInstruction = withdrawStreamInstruction;
exports.withdrawStreamLayout = BufferLayout.struct([BufferLayout.blob(8, 'amount')]);
function createMultiple(data, { sender, metadataPubKeys, isNative = false, computePrice, computeLimit, }, connection, sendThrottler, programId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { recipients, tokenId: tokenAddress } = data;
        if (!sender.publicKey) {
            throw new Error("Sender's PublicKey is not available, check passed wallet adapter!");
        }
        const metadatas = [];
        const metadataToRecipient = {};
        const errors = [];
        const signatures = [];
        const batch = [];
        const instructionsBatch = [];
        metadataPubKeys = metadataPubKeys || [];
        const { tokenProgramId } = yield (0, solana_1.getMintAndProgram)(connection, new web3_js_1.PublicKey(tokenAddress));
        for (let i = 0; i < recipients.length; i++) {
            const recipientData = recipients[i];
            const { ixs, metadata, metadataPubKey } = yield prepareStreamInstructions(recipientData, data, {
                sender,
                metadataPubKeys: metadataPubKeys[i] ? [metadataPubKeys[i]] : undefined,
                computePrice,
                computeLimit,
            }, connection, programId, tokenProgramId);
            metadataToRecipient[metadataPubKey.toBase58()] = recipientData;
            metadatas.push(metadataPubKey.toBase58());
            instructionsBatch.push({
                ixs,
                metadata,
                recipient: recipientData.recipient,
            });
        }
        const { value: hash, context } = yield connection.getLatestBlockhashAndContext();
        for (const { ixs, metadata, recipient } of instructionsBatch) {
            const messageV0 = new web3_js_1.TransactionMessage({
                payerKey: sender.publicKey,
                recentBlockhash: hash.blockhash,
                instructions: ixs,
            }).compileToV0Message();
            const tx = new web3_js_1.VersionedTransaction(messageV0);
            if (metadata) {
                tx.sign([metadata]);
            }
            batch.push({ tx, recipient });
        }
        if (isNative) {
            const totalDepositedAmount = recipients.reduce((acc, recipient) => recipient.amount.add(acc), new solana_2.BN(0));
            const nativeInstructions = yield (0, solana_1.prepareWrappedAccount)(connection, sender.publicKey, totalDepositedAmount);
            const messageV0 = new web3_js_1.TransactionMessage({
                payerKey: sender.publicKey,
                recentBlockhash: hash.blockhash,
                instructions: nativeInstructions,
            }).compileToV0Message();
            const tx = new web3_js_1.VersionedTransaction(messageV0);
            batch.push({
                tx,
                recipient: sender.publicKey.toBase58(),
            });
        }
        const signedBatch = yield (0, solana_2.signAllTransactionWithRecipients)(sender, batch);
        if (isNative) {
            const prepareTx = signedBatch.pop();
            yield (0, solana_2.sendAndConfirmStreamRawTransaction)(connection, prepareTx, { hash, context }, { sendThrottler: sendThrottler });
        }
        const responses = [];
        if (metadataPubKeys.length > 0) {
            //if metadata pub keys were passed we should execute transaction sequentially
            //ephemeral signer need to be used first before proceeding with the next
            for (const batchTx of signedBatch) {
                responses.push(...(yield Promise.allSettled([
                    (0, solana_1.executeTransaction)(connection, batchTx.tx, { hash, context }, { sendThrottler: sendThrottler }),
                ])));
            }
        }
        else {
            //send all transactions in parallel and wait for them to settle.
            //it allows to speed up the process of sending transactions
            //we then filter all promise responses and handle failed transactions
            responses.push(...(yield (0, solana_1.executeMultipleTransactions)(connection, signedBatch.map((item) => item.tx), { hash, context }, { sendThrottler: sendThrottler })));
        }
        responses.forEach((item, index) => {
            if (item.status === 'fulfilled') {
                signatures.push(item.value);
            }
            else {
                errors.push({
                    recipient: signedBatch[index].recipient,
                    error: item.reason,
                    contractErrorCode: extractErrorCode(item.reason) || undefined,
                });
            }
        });
        return { txs: signatures, metadatas, metadataToRecipient, errors };
    });
}
exports.createMultiple = createMultiple;
function extractErrorCode(err) {
    var _a;
    const logs = 'logs' in err && Array.isArray(err.logs) ? err.logs : undefined;
    return (0, solana_2.extractSolanaErrorCode)((_a = err.toString()) !== null && _a !== void 0 ? _a : 'Unknown error!', logs);
}
function prepareStreamInstructions(recipient, streamParams, extParams, connection, programId, tokenProgramId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { tokenId: mint, start, period, cliff, canTopup, cancelableBySender, cancelableByRecipient, transferableBySender, transferableByRecipient, automaticWithdrawal = false, withdrawalFrequency = 0, partner, } = streamParams;
        const { sender, metadataPubKeys, computeLimit, computePrice } = extParams;
        if (!sender.publicKey) {
            throw new Error("Sender's PublicKey is not available, check passed wallet adapter!");
        }
        const ixs = (0, solana_1.prepareBaseInstructions)(connection, {
            computePrice,
            computeLimit,
        });
        const recipientPublicKey = new web3_js_1.PublicKey(recipient.recipient);
        const mintPublicKey = new web3_js_1.PublicKey(mint);
        const { metadata, metadataPubKey } = getOrCreateStreamMetadata(metadataPubKeys);
        const [escrowTokens] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('strm'), metadataPubKey.toBuffer()], programId);
        const senderTokens = yield (0, solana_1.ata)(mintPublicKey, sender.publicKey, tokenProgramId);
        const recipientTokens = yield (0, solana_1.ata)(mintPublicKey, recipientPublicKey, tokenProgramId);
        const streamflowTreasuryTokens = yield (0, solana_1.ata)(mintPublicKey, exports.STREAMFLOW_TREASURY_PUBLIC_KEY, tokenProgramId);
        const partnerPublicKey = partner
            ? new web3_js_1.PublicKey(partner)
            : exports.WITHDRAWOR_PUBLIC_KEY;
        const partnerTokens = yield (0, solana_1.ata)(mintPublicKey, partnerPublicKey, tokenProgramId);
        ixs.push((0, solana_2.createStreamInstruction)({
            start: new solana_2.BN(start),
            depositedAmount: recipient.amount,
            period: new solana_2.BN(period),
            amountPerPeriod: recipient.amountPerPeriod,
            cliff: new solana_2.BN(cliff),
            cliffAmount: recipient.cliffAmount,
            cancelableBySender,
            cancelableByRecipient,
            automaticWithdrawal,
            transferableBySender,
            transferableByRecipient,
            canTopup,
            name: recipient.name,
            withdrawFrequency: new solana_2.BN(automaticWithdrawal ? withdrawalFrequency : period),
        }, programId, {
            sender: sender.publicKey,
            senderTokens,
            recipient: new web3_js_1.PublicKey(recipient.recipient),
            metadata: metadataPubKey,
            escrowTokens,
            recipientTokens,
            streamflowTreasury: exports.STREAMFLOW_TREASURY_PUBLIC_KEY,
            streamflowTreasuryTokens: streamflowTreasuryTokens,
            partner: partnerPublicKey,
            partnerTokens: partnerTokens,
            mint: new web3_js_1.PublicKey(mint),
            feeOracle: exports.FEE_ORACLE_PUBLIC_KEY,
            rent: web3_js_1.SYSVAR_RENT_PUBKEY,
            timelockProgram: programId,
            tokenProgram: tokenProgramId,
            associatedTokenProgram: spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID,
            withdrawor: exports.WITHDRAWOR_PUBLIC_KEY,
            systemProgram: web3_js_1.SystemProgram.programId,
        }));
        return { ixs, metadata, metadataPubKey };
    });
}
function getOrCreateStreamMetadata(metadataPubKeys) {
    let metadata;
    let metadataPubKey;
    if (!metadataPubKeys) {
        metadata = web3_js_1.Keypair.generate();
        metadataPubKey = metadata.publicKey;
    }
    else {
        metadataPubKey = metadataPubKeys[0];
    }
    return { metadata, metadataPubKey };
}
//# sourceMappingURL=utils.js.map