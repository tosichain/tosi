import { expect } from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import winston from "winston";
import * as BLS from "@noble/bls12-381";

chai.use(chaiAsPromised);

import { Transaction, Account } from "../blockchain/types";
import { stringifyAccount } from "../blockchain/util";
import { signTransaction } from "../blockchain/block";
import { serializeBlock } from "../blockchain/serde";
import { CoordinatorAPIClient } from "../coordinator/src/api_client";
import { ClientNodeAPIClient } from "../client/src/api_client";

const INAVLID_TXN_WAIT_PERIOD = 15000; // 15 seconds

const stakePoolPrivKey = Buffer.from("6b53ec86c32b1b044e3b8acd89a3961809679b263b61ad845085c18c49210fe9").toString();
const stakePoolPubKey = Buffer.from(BLS.getPublicKey(stakePoolPrivKey)).toString("hex");

const minterlPrivKey = Buffer.from("2d1c0d704322c0386cc7bead93298a48ee22325e967567ebe4dbcd4a2f4482f1").toString();
const minterPubKey = Buffer.from(BLS.getPublicKey(minterlPrivKey)).toString("hex");

const accOnePrivKey = Buffer.from(BLS.utils.randomPrivateKey()).toString("hex");
const accOnePubKey = Buffer.from(BLS.getPublicKey(accOnePrivKey)).toString("hex");

const accTwoPrivKey = Buffer.from(BLS.utils.randomPrivateKey()).toString("hex");
const accTwoPubKey = Buffer.from(BLS.getPublicKey(accTwoPrivKey)).toString("hex");

let log: winston.Logger;
let coordinator: CoordinatorAPIClient;
let client: ClientNodeAPIClient;

before(async () => {
  log = winston.createLogger({
    level: "debug",
    format: winston.format.json(),
    defaultMeta: { service: "tosi.network.test" },
    transports: [],
  });
  log.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );

  coordinator = new CoordinatorAPIClient(
    {
      apiURL: "http://127.0.0.1:20001/api",
    },
    log,
  );
  client = new ClientNodeAPIClient(
    {
      apiURL: "http://127.0.0.1:30001/api",
    },
    log,
  );
});

async function waitForAccountNonce(accountNonce: Record<string, number>): Promise<void> {
  log.debug(`waiting for account nonces -  ${JSON.stringify(accountNonce)}`);

  while (true) {
    // Sleep for 1 second.
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    // Check if coordinator has accepted/rejected transactions from accounts.
    let coordinatorCheck = true;
    for (const accPubKey of Object.keys(accountNonce)) {
      log.debug(`querying account ${accPubKey} at coordinator`);
      const account = await coordinator.getAccount(accPubKey);

      if (!account) {
        log.debug(`account ${accPubKey} does not exist at coordinator`);
        coordinatorCheck = false;
        break;
      }

      log.debug(`account ${accPubKey} at coordinator - ${stringifyAccount(account)}`);

      if (account.nonce != accountNonce[accPubKey]) {
        log.debug(`account ${accPubKey} do not has desired nonce at coordinator`);
        coordinatorCheck = false;
        break;
      }
    }
    if (!coordinatorCheck) {
      continue;
    }

    // Check if client has accepted/rejected transactions from accounts.
    let clientCheck = true;
    for (const accPubKey of Object.keys(accountNonce)) {
      log.debug(`querying account ${accPubKey} at client`);
      const account = await client.getAccount(accPubKey);

      if (!account) {
        log.debug(`account ${accPubKey} does not exist at client`);
        clientCheck = false;
        break;
      }

      log.debug(`account ${accOnePubKey} at client - ${stringifyAccount(account)}`);

      if (account.nonce != accountNonce[accPubKey]) {
        log.debug(`account ${accPubKey} do not have desired nonce at client`);
        clientCheck = false;
        break;
      }
    }
    if (clientCheck) {
      break;
    }
  }
}

async function checkHeadBlock(): Promise<void> {
  // Get head block from coordinator.
  const blockHash = await coordinator.getHeadBblockHash();
  if (blockHash == undefined) {
    throw new Error("blockHash is undefined");
  }
  const coordinatorBlock = await coordinator.getBlock(blockHash);
  if (coordinatorBlock == undefined) {
    throw new Error("coordinatorBlock is undefined");
  }

  // Get head block from client node.
  const clientBlock = await client.getBlock(blockHash);
  if (clientBlock == undefined) {
    throw new Error("clientBlock is undefined");
  }

  // Check that blocks are "equal".
  const rawCoordinatorBlock = serializeBlock(coordinatorBlock);
  const rawClientBlock = serializeBlock(clientBlock);
  expect(rawCoordinatorBlock.length).to.be.eq(rawClientBlock.length);
  const equalBlocks = rawCoordinatorBlock.every((val, idx) => val == rawClientBlock[idx]);
  expect(equalBlocks).to.be.true;
}

async function checkAccounts(accounts: Record<string, Account>): Promise<void> {
  for (const pubKey of Object.keys(accounts)) {
    const acc = accounts[pubKey];

    const coordinatorAcc = await coordinator.getAccount(pubKey);
    if (coordinatorAcc == undefined) {
      throw new Error("account not found at coordinator node");
    }

    expect(coordinatorAcc.nonce).to.be.eq(acc.nonce);
    expect(coordinatorAcc.balance).to.be.eq(acc.balance);
    expect(coordinatorAcc.stake).to.be.eq(acc.stake);

    const clientAcc = await client.getAccount(pubKey);
    if (clientAcc == undefined) {
      throw new Error("account not found at client node");
    }

    expect(clientAcc.nonce).to.be.eq(acc.nonce);
    expect(clientAcc.balance).to.be.eq(acc.balance);
    expect(clientAcc.stake).to.be.eq(acc.stake);
  }
}

async function checkStakerList(stakerPubKeys: string[]): Promise<void> {
  const coordinatorStakers = await coordinator.getStakerList();
  const clientStakers = await client.getStakerList();

  expect(Object.keys(coordinatorStakers).length).to.be.equal(stakerPubKeys.length);
  expect(Object.keys(clientStakers).length).to.be.equal(stakerPubKeys.length);

  for (const pubKey of stakerPubKeys) {
    const coordinatorStaker = coordinatorStakers[pubKey];
    expect(coordinatorStaker).to.be.not.undefined;
    const clientStaker = clientStakers[pubKey];
    expect(clientStaker).to.be.not.undefined;
  }
}

describe("client node correctly replays MintToken transactions", function () {
  it("minting creates new accounts", async () => {
    // Create first account with 10000 tokens.
    const txn1: Transaction = {
      mint: {
        receiver: accOnePubKey,
        amount: 10000n,
      },
      nonce: 0,
    };
    await coordinator.submitTransaction(await signTransaction(txn1, minterlPrivKey));

    // Create second account with 15000 tokens.
    const txn2 = {
      mint: {
        receiver: accTwoPubKey,
        amount: 15000n,
      },
      nonce: 1,
    };
    await coordinator.submitTransaction(await signTransaction(txn2, minterlPrivKey));

    // Ensure that invalid (from non-existent account) transaction doesn't break client sync.
    const txn3 = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 100n,
      },
      nonce: 0,
    };
    await coordinator.submitTransaction(await signTransaction(txn3, accOnePrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[minterPubKey] = 1;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Record<string, Account> = {};
    accounts[accOnePubKey] = {
      nonce: -1,
      balance: 10000n,
      stake: 0n,
    };
    accounts[accTwoPubKey] = {
      nonce: -1,
      balance: 15000n,
      stake: 0n,
    };
    await checkAccounts(accounts);
  });

  it("minting increases balance of existing accounts", async () => {
    // Mint 5000 tokens and send it to first account.
    const txn1: Transaction = {
      mint: {
        receiver: accOnePubKey,
        amount: 5000n,
      },
      nonce: 2,
    };
    await coordinator.submitTransaction(await signTransaction(txn1, minterlPrivKey));

    // Mint 10000 tokens and send it to second account.
    const txn2 = {
      mint: {
        receiver: accTwoPubKey,
        amount: 10000n,
      },
      nonce: 3,
    };
    await coordinator.submitTransaction(await signTransaction(txn2, minterlPrivKey));

    // Ensure that invalid (insufficient balance) transaction doesn't break client sync.
    const txn3: Transaction = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 20000n,
      },
      nonce: 0,
    };
    await coordinator.submitTransaction(await signTransaction(txn3, accOnePrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[minterPubKey] = 3;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Record<string, Account> = {};
    accounts[accOnePubKey] = {
      nonce: -1,
      balance: 15000n,
      stake: 0n,
    };
    accounts[accTwoPubKey] = {
      nonce: -1,
      balance: 25000n,
      stake: 0n,
    };
    await checkAccounts(accounts);
  });
});

describe("client node correctly replays TransferToken transactions", function () {
  it("multiple transfers inside single block work correctly", async () => {
    // Transfer 300 tokens from first account to second.
    const txn1: Transaction = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 300n,
      },
      nonce: 0,
    };
    await coordinator.submitTransaction(await signTransaction(txn1, accOnePrivKey));

    // Transfer 5000 tokens from second account to first.
    const txn2: Transaction = {
      transfer: {
        receiver: accOnePubKey,
        amount: 5000n,
      },
      nonce: 0,
    };
    await coordinator.submitTransaction(await signTransaction(txn2, accTwoPrivKey));

    // Transfer 600 tokens from first account to second.
    const txn3: Transaction = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 600n,
      },
      nonce: 1,
    };
    await coordinator.submitTransaction(await signTransaction(txn3, accOnePrivKey));

    // Transfer 2500 tokens from second account to first.
    const txn4: Transaction = {
      transfer: {
        receiver: accOnePubKey,
        amount: 2500n,
      },
      nonce: 1,
    };
    await coordinator.submitTransaction(await signTransaction(txn4, accTwoPrivKey));

    // Invalid transaction #1 - insufficient balance.
    const txn5: Transaction = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 100000n,
      },
      nonce: 2,
    };
    await coordinator.submitTransaction(await signTransaction(txn5, accOnePrivKey));

    // Invalid transaction #2 - insufficient balance.
    const txn6: Transaction = {
      transfer: {
        receiver: accOnePubKey,
        amount: 100000n,
      },
      nonce: 2,
    };
    await coordinator.submitTransaction(await signTransaction(txn6, accTwoPrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[accOnePubKey] = 1;
    accountNonces[accTwoPubKey] = 1;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Record<string, Account> = {};
    accounts[accOnePubKey] = {
      nonce: 1,
      balance: 21600n,
      stake: 0n,
    };
    accounts[accTwoPubKey] = {
      nonce: 1,
      balance: 18400n,
      stake: 0n,
    };
    await checkAccounts(accounts);
  });
});

describe("client node correctly replays StakeToken transactions", function () {
  it("putting tokens into stake pool", async () => {
    // First account puts 600 tokens at stake.
    const txn1: Transaction = {
      stake: {
        amount: 600n,
      },
      nonce: 2,
    };
    await coordinator.submitTransaction(await signTransaction(txn1, accOnePrivKey));

    // Second account puts 400 tokens at stake.
    const txn2: Transaction = {
      stake: {
        amount: 400n,
      },
      nonce: 2,
    };
    await coordinator.submitTransaction(await signTransaction(txn2, accTwoPrivKey));

    // Invalid transaction - insufficient balance.
    const txn3: Transaction = {
      stake: {
        amount: 100000n,
      },
      nonce: 3,
    };
    await coordinator.submitTransaction(await signTransaction(txn3, accTwoPrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[accOnePubKey] = 2;
    accountNonces[accTwoPubKey] = 2;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Record<string, Account> = {};
    accounts[accOnePubKey] = {
      nonce: 2,
      balance: 21000n,
      stake: 600n,
    };
    accounts[accTwoPubKey] = {
      nonce: 2,
      balance: 18000n,
      stake: 400n,
    };
    accounts[stakePoolPubKey] = {
      nonce: -1,
      balance: 1000n,
      stake: 0n,
    };
    await checkAccounts(accounts);

    await checkStakerList([accOnePubKey, accTwoPubKey]);
  });
});

describe("client node correctly replays UnstakeToken transactions", function () {
  it("taking tokens out of stake pool", async () => {
    // First account takes 300 tokens from stake pool.
    const txn1: Transaction = {
      unstake: {
        amount: 300n,
      },
      nonce: 3,
    };
    await coordinator.submitTransaction(await signTransaction(txn1, accOnePrivKey));

    // Second account takes 200 token from stake pool.
    const txn2: Transaction = {
      unstake: {
        amount: 400n,
      },
      nonce: 3,
    };
    await coordinator.submitTransaction(await signTransaction(txn2, accTwoPrivKey));

    // Invalid transaction - insufficient amount of staked tokens.
    const txn3: Transaction = {
      unstake: {
        amount: 100000n,
      },
      nonce: 4,
    };
    await coordinator.submitTransaction(await signTransaction(txn3, accTwoPrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[accOnePubKey] = 3;
    accountNonces[accTwoPubKey] = 3;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Record<string, Account> = {};
    accounts[accOnePubKey] = {
      nonce: 3,
      balance: 21300n,
      stake: 300n,
    };
    accounts[accTwoPubKey] = {
      nonce: 3,
      balance: 18400n,
      stake: 0n,
    };
    accounts[stakePoolPubKey] = {
      nonce: -1,
      balance: 300n,
      stake: 0n,
    };
    await checkAccounts(accounts);

    await checkStakerList([accOnePubKey]);
  });
});

describe("client node does not replay invalid transactions", function () {
  it("transaction with invalid signature is rejected", async () => {
    // Sign transaction from second account by private key of first account
    const txn: Transaction = {
      transfer: {
        receiver: accOnePubKey,
        amount: 100n,
      },
      nonce: 4,
    };
    const signedTxn = await signTransaction(txn, accOnePrivKey);
    signedTxn.from = accTwoPubKey;
    await coordinator.submitTransaction(signedTxn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INAVLID_TXN_WAIT_PERIOD);
    });

    await checkHeadBlock();

    const accounts: Record<string, Account> = {};
    accounts[accOnePubKey] = {
      nonce: 3,
      balance: 21300n,
      stake: 300n,
    };
    accounts[accTwoPubKey] = {
      nonce: 3,
      balance: 18400n,
      stake: 0n,
    };
    await checkAccounts(accounts);
  });

  it("transaction with too low nonce is rejected", async () => {
    const txn: Transaction = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 100n,
      },
      nonce: 3,
    };
    await coordinator.submitTransaction(await signTransaction(txn, accOnePrivKey));

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INAVLID_TXN_WAIT_PERIOD);
    });

    await checkHeadBlock();

    const accounts: Record<string, Account> = {};
    accounts[accOnePubKey] = {
      nonce: 3,
      balance: 21300n,
      stake: 300n,
    };
    accounts[accTwoPubKey] = {
      nonce: 3,
      balance: 18400n,
      stake: 0n,
    };
    await checkAccounts(accounts);
  });

  it("transaction with too high nonce is rejected", async () => {
    const txn: Transaction = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 100n,
      },
      nonce: 5,
    };
    await coordinator.submitTransaction(await signTransaction(txn, accOnePrivKey));

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INAVLID_TXN_WAIT_PERIOD);
    });

    await checkHeadBlock();

    const accounts: Record<string, Account> = {};
    accounts[accOnePubKey] = {
      nonce: 3,
      balance: 21300n,
      stake: 300n,
    };
    accounts[accTwoPubKey] = {
      nonce: 3,
      balance: 18400n,
      stake: 0n,
    };
    await checkAccounts(accounts);
  });
});
