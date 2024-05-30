"use strict";
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
const stream_1 = require("@streamflow/stream");
const bs58_1 = __importDefault(require("bs58"));
const dotenv_1 = __importDefault(require("dotenv"));
const utils_1 = require("./utils");
const spl_token_1 = require("@solana/spl-token");
const chai_1 = require("chai");
const p_queue_1 = __importDefault(require("p-queue"));
dotenv_1.default.config();
describe('Testing with streamflow', () => {
    const solanaClient = new stream_1.StreamflowSolana.SolanaStreamClient(process.env.DEV_RPC_ENDPOINT, stream_1.ICluster.Devnet);
    const creator = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(process.env.VESTING_PRIVATE_KEY));
    const connection = new web3_js_1.Connection(process.env.DEV_RPC_ENDPOINT, 'confirmed');
    describe('Create vesting', function () {
        this.timeout(500000);
        // @ts-ignore
        xit('Release 100% right from the start', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const { mint, decimals } = yield setupToken({});
                const recipients = (0, utils_1.generateRecipents)(10, true, decimals);
                const createStreamParams = {
                    period: 1,
                    start: Math.floor(Date.now() / 1000) + 60,
                    cliff: Math.floor(Date.now() / 1000) + 60,
                    cancelableBySender: true,
                    cancelableByRecipient: false,
                    transferableBySender: true,
                    transferableByRecipient: false,
                    canTopup: false,
                    automaticWithdrawal: false,
                    withdrawalFrequency: 0,
                    tokenId: mint.toString(),
                    partner: undefined,
                    recipients: recipients,
                };
                const { txs, errors } = yield solanaClient.createMultiple(createStreamParams, {
                    sender: creator,
                });
                (0, chai_1.expect)(errors.length, 'Expect errors length must be zero').to.eql(0);
            });
        });
        xit('Release linear by the second in a minute', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const { mint, decimals } = yield setupToken({});
                const recipients = (0, utils_1.generateRecipents)(50, false, decimals, 60);
                const createStreamParams = {
                    period: 1,
                    start: Math.floor(Date.now() / 1000) + 10000,
                    cliff: Math.floor(Date.now() / 1000) + 10000,
                    cancelableBySender: true,
                    cancelableByRecipient: false,
                    transferableBySender: true,
                    transferableByRecipient: false,
                    canTopup: false,
                    automaticWithdrawal: false,
                    withdrawalFrequency: 0,
                    tokenId: mint.toString(),
                    partner: undefined,
                    recipients: recipients,
                };
                const { txs, errors } = yield (0, utils_1.createMultiple)(createStreamParams, {
                    sender: creator,
                }, connection, new p_queue_1.default({
                    concurrency: 10,
                    intervalCap: 10,
                    interval: 1000,
                }), new web3_js_1.PublicKey('HqDGZjaVRXJ9MGRQEw7qDc2rAr6iH1n1kAQdCZaCMfMZ'));
                // const { txs, errors } = await solanaClient.createMultiple(
                //   createStreamParams,
                //   {
                //     sender: creator,
                //   }
                // );
                console.log(errors, txs);
                (0, chai_1.expect)(errors.length, 'Expect errors length must be zero').to.eql(0);
            });
        });
        xit('Release linear by the minute in an hour', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const { mint, decimals } = yield setupToken({});
                const recipients = (0, utils_1.generateRecipents)(2, false, decimals, 60);
                const createStreamParams = {
                    period: 60,
                    start: Math.floor(Date.now() / 1000) + 60,
                    cliff: Math.floor(Date.now() / 1000) + 60,
                    cancelableBySender: true,
                    cancelableByRecipient: false,
                    transferableBySender: true,
                    transferableByRecipient: false,
                    canTopup: false,
                    automaticWithdrawal: false,
                    withdrawalFrequency: 0,
                    tokenId: mint.toString(),
                    partner: undefined,
                    recipients: recipients,
                };
                const { txs, errors } = yield solanaClient.createMultiple(createStreamParams, {
                    sender: creator,
                });
                (0, chai_1.expect)(errors.length, 'Expect errors length must be zero').to.eql(0);
            });
        });
        xit('Dont have enough token to vesting', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const { mint, decimals } = yield setupToken({ amount: 0 });
                const size = 10;
                const recipients = (0, utils_1.generateRecipents)(size, false, decimals, 60);
                const createStreamParams = {
                    period: 60,
                    start: Math.floor(Date.now() / 1000) + 60,
                    cliff: Math.floor(Date.now() / 1000) + 60,
                    cancelableBySender: true,
                    cancelableByRecipient: false,
                    transferableBySender: true,
                    transferableByRecipient: false,
                    canTopup: false,
                    automaticWithdrawal: false,
                    withdrawalFrequency: 0,
                    tokenId: mint.toString(),
                    partner: undefined,
                    recipients: recipients,
                };
                const { txs, errors } = yield solanaClient.createMultiple(createStreamParams, {
                    sender: creator,
                });
                (0, chai_1.expect)(errors.length, 'Expect errors length must be zero').to.eq(size);
                (0, chai_1.expect)(errors[0].contractErrorCode).to.eq(undefined);
            });
        });
        xit('Invalid timestamp', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const { mint, decimals } = yield setupToken({ amount: 100000000 });
                const size = 5;
                const recipients = (0, utils_1.generateRecipents)(size, false, decimals, 60);
                const createStreamParams = {
                    period: 60,
                    start: Math.floor(Date.now() / 1000),
                    cliff: Math.floor(Date.now() / 1000),
                    cancelableBySender: true,
                    cancelableByRecipient: false,
                    transferableBySender: true,
                    transferableByRecipient: false,
                    canTopup: false,
                    automaticWithdrawal: false,
                    withdrawalFrequency: 0,
                    tokenId: mint.toString(),
                    partner: undefined,
                    recipients: recipients,
                };
                const { txs, errors } = yield solanaClient.createMultiple(createStreamParams, {
                    sender: creator,
                });
                console.log(errors);
                (0, chai_1.expect)(errors.length, 'Expect errors length must be zero').to.eq(size);
                (0, chai_1.expect)(errors[0].contractErrorCode).to.eq('InvalidTimestamps');
            });
        });
        it('Create streams linear with many user', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const { mint, decimals } = yield setupToken({ amount: 100000000000 });
                const recipients = (0, utils_1.generateRecipents)(10, false, decimals, 60);
                const createStreamParams = {
                    period: 1,
                    start: Math.floor(Date.now() / 1000) + 10000,
                    cliff: Math.floor(Date.now() / 1000) + 10000,
                    cancelableBySender: true,
                    cancelableByRecipient: false,
                    transferableBySender: true,
                    transferableByRecipient: false,
                    canTopup: false,
                    automaticWithdrawal: false,
                    withdrawalFrequency: 0,
                    tokenId: mint.toString(),
                    partner: undefined,
                    recipients: recipients,
                };
                const { txs, errors } = yield (0, utils_1.createMultiple)(createStreamParams, {
                    sender: creator,
                }, connection, new p_queue_1.default({
                    concurrency: 5,
                    intervalCap: 5,
                    interval: 1000,
                }), new web3_js_1.PublicKey('HqDGZjaVRXJ9MGRQEw7qDc2rAr6iH1n1kAQdCZaCMfMZ'));
                console.log(errors);
                console.log(errors.length, txs.length);
                yield (0, utils_1.sleep)(10000);
                const data = {
                    address: creator.publicKey.toString(),
                    type: stream_1.StreamType.Vesting,
                    direction: stream_1.StreamDirection.Outgoing,
                };
                try {
                    console.log('--begin: ', new Date().toISOString());
                    const streams = yield solanaClient.get(data);
                    if (streams.length === 0) {
                        throw Error('User dont have any incoming streams');
                    }
                    else {
                        const specStreams = [];
                        for (let i = 0; i < streams.length; i++) {
                            const singleStream = streams[i][1];
                            const now = Math.floor(Date.now() / 1000);
                            // some vesting contract is closed but closed status is false (because auto send token to user wallet in devnet is error when vesting is over)
                            if (singleStream.mint === mint.toString() &&
                                !singleStream.closed &&
                                singleStream.end >= now) {
                                specStreams.push(singleStream);
                            }
                        }
                        if (specStreams.length === 0) {
                            throw Error('User dont have any outgoing contract with this mint');
                        }
                        else {
                            // console.log(specStreams);
                            console.log(specStreams.length);
                            (0, chai_1.expect)(txs.length, 'expect txn success length must be streams spec length').to.eq(specStreams.length);
                        }
                    }
                }
                catch (exception) {
                    console.log('---end', new Date().toISOString());
                    console.log('Error: ', exception);
                }
            });
        });
        xit('Create streams linear with many user with retry', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const { mint, decimals } = yield setupToken({ amount: 100000000000 });
                const number_of_user = 50;
                const recipients = (0, utils_1.generateRecipents)(number_of_user, false, decimals, 60);
                const createStreamParams = {
                    period: 1,
                    start: Math.floor(Date.now() / 1000) + 10000,
                    cliff: Math.floor(Date.now() / 1000) + 10000,
                    cancelableBySender: true,
                    cancelableByRecipient: false,
                    transferableBySender: true,
                    transferableByRecipient: false,
                    canTopup: false,
                    automaticWithdrawal: false,
                    withdrawalFrequency: 0,
                    tokenId: mint.toString(),
                    partner: undefined,
                    recipients: recipients,
                };
                const { txs, errors } = yield (0, utils_1.createMultiple)(createStreamParams, {
                    sender: creator,
                }, connection, new p_queue_1.default({
                    concurrency: 5,
                    intervalCap: 5,
                    interval: 1000,
                }), new web3_js_1.PublicKey('HqDGZjaVRXJ9MGRQEw7qDc2rAr6iH1n1kAQdCZaCMfMZ'));
                if (errors.length > 0) {
                    const error_recipients = [];
                    for (let i = 0; i < errors.length; i++) {
                        const err_rec = recipients.find((rec) => rec.recipient === errors[i].recipient);
                        error_recipients.push(err_rec);
                    }
                    if (error_recipients.length === 0) {
                        throw Error('Some thing went wrong');
                    }
                    const createStreamParams = {
                        period: 1,
                        start: Math.floor(Date.now() / 1000) + 10000,
                        cliff: Math.floor(Date.now() / 1000) + 10000,
                        cancelableBySender: true,
                        cancelableByRecipient: false,
                        transferableBySender: true,
                        transferableByRecipient: false,
                        canTopup: false,
                        automaticWithdrawal: false,
                        withdrawalFrequency: 0,
                        tokenId: mint.toString(),
                        partner: undefined,
                        recipients: error_recipients,
                    };
                    const { errors: new_errors } = yield (0, utils_1.createMultiple)(createStreamParams, {
                        sender: creator,
                    }, connection, new p_queue_1.default({
                        concurrency: 5,
                        intervalCap: 5,
                        interval: 1000,
                    }), new web3_js_1.PublicKey('HqDGZjaVRXJ9MGRQEw7qDc2rAr6iH1n1kAQdCZaCMfMZ'));
                    (0, chai_1.expect)(new_errors.length, 'Expect new errors length must be zero').to.eq(0);
                }
                yield (0, utils_1.sleep)(10000);
                const data = {
                    address: creator.publicKey.toString(),
                    type: stream_1.StreamType.Vesting,
                    direction: stream_1.StreamDirection.Outgoing,
                };
                try {
                    console.log('--begin: ', new Date().toISOString());
                    const streams = yield solanaClient.get(data);
                    if (streams.length === 0) {
                        throw Error('User dont have any incoming streams');
                    }
                    else {
                        const specStreams = [];
                        for (let i = 0; i < streams.length; i++) {
                            const singleStream = streams[i][1];
                            const now = Math.floor(Date.now() / 1000);
                            // some vesting contract is closed but closed status is false (because auto send token to user wallet in devnet is error when vesting is over)
                            if (singleStream.mint === mint.toString() &&
                                !singleStream.closed &&
                                singleStream.end >= now) {
                                specStreams.push(singleStream);
                            }
                        }
                        if (specStreams.length === 0) {
                            throw Error('User dont have any outgoing contract with this mint');
                        }
                        else {
                            // console.log(specStreams);
                            console.log(specStreams.length);
                            (0, chai_1.expect)(number_of_user, 'expect txn success length must be streams spec length').to.eq(specStreams.length);
                        }
                    }
                }
                catch (exception) {
                    console.log('---end', new Date().toISOString());
                    console.log('Error: ', exception);
                }
            });
        });
    });
    describe('Claim', () => {
        xit('Claim success', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const { mint, decimals } = yield setupToken({});
                const claimer = web3_js_1.Keypair.generate();
                yield (0, utils_1.createAccount)({
                    connection: connection,
                    payerKeypair: creator,
                    newAccountKeypair: claimer,
                    lamports: 0.001 * web3_js_1.LAMPORTS_PER_SOL,
                });
                const size = 3;
                const recipients = (0, utils_1.generateRecipents)(size, false, decimals, 60);
                const amount = 1200;
                const newRecipient = {
                    recipient: claimer.publicKey.toString(),
                    amount: (0, stream_1.getBN)(amount, decimals),
                    name: 'Unknown',
                    cliffAmount: (0, stream_1.getBN)(0, decimals),
                    amountPerPeriod: (0, stream_1.getBN)(amount / 60, decimals),
                };
                recipients.push(newRecipient);
                const createStreamParams = {
                    period: 1,
                    start: Math.floor(Date.now() / 1000) + 20,
                    cliff: Math.floor(Date.now() / 1000) + 20,
                    cancelableBySender: true,
                    cancelableByRecipient: false,
                    transferableBySender: true,
                    transferableByRecipient: false,
                    canTopup: false,
                    automaticWithdrawal: false,
                    withdrawalFrequency: 0,
                    tokenId: mint.toString(),
                    partner: undefined,
                    recipients: recipients,
                };
                const { metadatas, errors } = yield solanaClient.createMultiple(createStreamParams, {
                    sender: creator,
                });
                console.log(errors);
                (0, chai_1.expect)(errors.length, 'Expect errors length must be zero').to.eql(0);
                yield (0, utils_1.sleep)(20000);
                const data = {
                    address: claimer.publicKey.toString(),
                    type: stream_1.StreamType.Vesting,
                    direction: stream_1.StreamDirection.Incoming,
                };
                const streams = yield solanaClient.get(data);
                if (streams.length === 0) {
                    throw Error('User dont have any incoming streams');
                }
                else {
                    const specStreams = [];
                    for (let i = 0; i < streams.length; i++) {
                        const singleStream = streams[i][1];
                        const now = Math.floor(Date.now() / 1000);
                        // some vesting contract is closed but closed status is false (because auto send token to user wallet in devnet is error when vesting is over)
                        if (singleStream.mint === mint.toString() &&
                            !singleStream.closed &&
                            singleStream.end >= now &&
                            singleStream.start <= now) {
                            specStreams.push(singleStream);
                            // Max token can claim now
                            const startTime = singleStream.start;
                            const period = singleStream.period;
                            const amountPerPeriod = singleStream.amountPerPeriod.toNumber();
                            const withdrawnToken = singleStream.withdrawnAmount.toNumber();
                            const totalCanClaim = Math.round((now - startTime) / period) * amountPerPeriod -
                                withdrawnToken;
                            // total can claim when vesting over
                            console.log('Total token can claim when in this vesting ended: ', singleStream.depositedAmount.toNumber());
                            console.log('Total token can claim now: ', totalCanClaim);
                            // total claimed
                            console.log('Total token user is claimed: ', withdrawnToken);
                            const withdrawStreamParams = {
                                id: metadatas[size],
                                amount: (0, stream_1.getBN)(totalCanClaim / Math.pow(10, decimals), decimals), // Requested amount to withdraw. If stream is completed, the whole amount will be withdrawn.
                            };
                            try {
                                const { txId } = yield solanaClient.withdraw(withdrawStreamParams, {
                                    invoker: claimer,
                                });
                                console.log('Signature: ', txId);
                            }
                            catch (exception) {
                                console.log('Error: ', exception);
                            }
                        }
                    }
                    if (specStreams.length === 0) {
                        throw Error('User dont have any outgoing contract with this mint');
                    }
                    else {
                        // console.log(specStreams);
                    }
                }
            });
        });
        xit('Test claim', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const claimer = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode('4Nt7brdfqcxSFyDBt7XkBaW7twphq8f1Nhey5LgELw5AqjmkWszGCiZuSojLtP9fbeTTckGbH1zqqToXcFjtJPwE'));
                // await createAccount({
                //   connection,
                //   newAccountKeypair: claimer,
                //   payerKeypair: creator,
                //   lamports: 0.01 * LAMPORTS_PER_SOL,
                // });
                const withdrawStreamParams = {
                    id: '2QKGQNbHubFmEvp14vYTTWmAc7CAS3K2aEQXA3xvbdH5',
                    amount: (0, stream_1.getBN)(1000, 9), // Requested amount to withdraw. If stream is completed, the whole amount will be withdrawn.
                };
                try {
                    // const { ixs, txId } = await solanaClient.withdraw(
                    //   withdrawStreamParams,
                    //   {
                    //     invoker: claimer,
                    //   }
                    // );
                    const widthDrawIns = yield (0, utils_1.prepareWithdrawInstructions)(withdrawStreamParams, {
                        invoker: claimer,
                    }, connection);
                    const txn = new web3_js_1.Transaction();
                    for (let i = 0; i < widthDrawIns.length; i++) {
                        txn.add(widthDrawIns[i]);
                    }
                    txn.feePayer = claimer.publicKey;
                    txn.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
                    txn.partialSign(claimer);
                    const sig = yield connection.sendRawTransaction(txn.serialize(), {
                        skipPreflight: true,
                    });
                    console.log('Signature: ', sig);
                    // console.log(ixs, txId);
                }
                catch (exception) {
                    console.log('Error: ', exception);
                }
            });
        });
    });
    describe('Fetch data vesting', () => {
        const wallet = new web3_js_1.PublicKey('5aMGztMuSVPAp4nm6vrkU25BAho6gGxpWHnnaKZfiUHP');
        xit('Get incoming streams', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const data = {
                    address: wallet.toString(),
                    type: stream_1.StreamType.Vesting,
                    direction: stream_1.StreamDirection.Incoming,
                };
                try {
                    const streams = yield solanaClient.get(data);
                    console.log(streams.length);
                }
                catch (exception) {
                    console.log('Error: ', exception);
                    // handle exception
                }
            });
        });
        xit('Get outgoing streams', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const data = {
                    address: wallet.toString(),
                    type: stream_1.StreamType.Vesting,
                    direction: stream_1.StreamDirection.Outgoing,
                };
                try {
                    const streams = yield solanaClient.get(data);
                    console.log(streams.length);
                }
                catch (exception) {
                    console.log('Error: ', exception);
                    // handle exception
                }
            });
        });
        xit('Get all streams', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const data = {
                    address: wallet.toString(),
                    type: stream_1.StreamType.Vesting,
                    direction: stream_1.StreamDirection.All,
                };
                try {
                    const streams = yield solanaClient.get(data);
                    console.log(streams.length);
                }
                catch (exception) {
                    console.log('Error: ', exception);
                    // handle exception
                }
            });
        });
        xit('Get incoming streams with token', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const data = {
                    address: wallet.toString(),
                    type: stream_1.StreamType.Vesting,
                    direction: stream_1.StreamDirection.Incoming,
                };
                const mint = new web3_js_1.PublicKey('5SXpAwD1yvUMdib6WeWwtAsQACB9A6t7kBsZonByXAgo');
                try {
                    const streams = yield solanaClient.get(data);
                    if (streams.length === 0) {
                        throw Error('User dont have any incoming streams');
                    }
                    else {
                        const specStreams = [];
                        for (let i = 0; i < streams.length; i++) {
                            const singleStream = streams[i][1];
                            if (singleStream.mint === mint.toString()) {
                                specStreams.push(singleStream);
                            }
                        }
                        if (specStreams.length === 0) {
                            throw Error('User dont have any incoming contract with this mint');
                        }
                        else {
                            console.log(specStreams);
                        }
                    }
                }
                catch (exception) {
                    console.log('Error: ', exception);
                }
            });
        });
        xit('Get outgoing streams with token', function () {
            return __awaiter(this, void 0, void 0, function* () {
                const data = {
                    address: wallet.toString(),
                    type: stream_1.StreamType.Vesting,
                    direction: stream_1.StreamDirection.Outgoing,
                };
                const mint = new web3_js_1.PublicKey('5SXpAwD1yvUMdib6WeWwtAsQACB9A6t7kBsZonByXAgo');
                try {
                    const streams = yield solanaClient.get(data);
                    if (streams.length === 0) {
                        throw Error('User dont have any incoming streams');
                    }
                    else {
                        const specStreams = [];
                        for (let i = 0; i < streams.length; i++) {
                            if (streams[i][1].mint === mint.toString()) {
                                specStreams.push(streams[i][1]);
                            }
                        }
                        if (specStreams.length === 0) {
                            throw Error('User dont have any outgoing contract with this mint');
                        }
                        else {
                            console.log(specStreams);
                        }
                    }
                }
                catch (exception) {
                    console.log('Error: ', exception);
                }
            });
        });
        xit('Get outgoing streams with filter', function () {
            return __awaiter(this, void 0, void 0, function* () {
                // Note: this address must be creator of all vesting contract
                const data = {
                    address: wallet.toString(),
                    type: stream_1.StreamType.Vesting,
                    direction: stream_1.StreamDirection.Outgoing,
                };
                const mint = new web3_js_1.PublicKey('J92vn8fau5ha6KofFn4MR4ifQAcKkcebyqLzVxXKrwwh');
                try {
                    const streams = yield solanaClient.get(data);
                    if (streams.length === 0) {
                        throw Error('User dont have any incoming streams');
                    }
                    else {
                        const specStreams = [];
                        for (let i = 0; i < streams.length; i++) {
                            const singleStream = streams[i][1];
                            const now = Math.floor(Date.now() / 1000);
                            // some vesting contract is closed but closed status is false (because auto send token to user wallet in devnet is error when vesting is over)
                            if (singleStream.mint === mint.toString() &&
                                !singleStream.closed &&
                                singleStream.end >= now) {
                                specStreams.push(singleStream);
                                // Max token can claim now
                                const startTime = singleStream.start;
                                const period = singleStream.period;
                                const amountPerPeriod = singleStream.amountPerPeriod.toNumber();
                                const withdrawnToken = singleStream.withdrawnAmount.toNumber();
                                const totalCanClaim = ((now - startTime) / period) * amountPerPeriod - withdrawnToken;
                                console.log('Name: ', singleStream.name);
                                // total can claim when vesting over
                                console.log('Total token can claim when in this vesting ended: ', singleStream.depositedAmount.toNumber());
                                console.log('Total token can claim now: ', totalCanClaim);
                                // total claimed
                                console.log('Total token user is claimed: ', withdrawnToken);
                            }
                        }
                        if (specStreams.length === 0) {
                            throw Error('User dont have any outgoing contract with this mint');
                        }
                        else {
                            // console.log(specStreams);
                            console.log(specStreams.length);
                        }
                    }
                }
                catch (exception) {
                    console.log('Error: ', exception);
                }
            });
        });
    });
    const setupToken = ({ decimals = 9, amount = 100000000, }) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('Create token');
        const mint = yield (0, spl_token_1.createMint)(connection, creator, creator.publicKey, creator.publicKey, decimals);
        const ata = yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, creator, mint, creator.publicKey);
        yield (0, spl_token_1.mintTo)(connection, creator, mint, ata.address, creator.publicKey, amount * Math.pow(10, decimals));
        console.log('---Success');
        return {
            mint,
            decimals,
        };
    });
});
//# sourceMappingURL=vesting.js.map