// docker compose --profile build -p tosi-chain -f docker-compose-tosi-chain.yml up

import { expect } from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { bls12_381 as BLS } from "@noble/curves/bls12-381";

chai.use(chaiAsPromised);

import { Transaction, Account, StakeType } from "../blockchain/types";
import { bytesEqual, bytesToHex, bytesFromHex } from "../blockchain/util";
import { signTransaction } from "../blockchain/block";
import { serializeBlock } from "../blockchain/serde";
import { CoordinatorRPC } from "../coordinator/src/rpc";
import { ClientRPC } from "../client/src/rpc";
import Logger from "../log/logger";

const INAVLID_TXN_WAIT_PERIOD = 10000; // 10 seconds (it depends on block period, specified in docker compose)

const minterPrivKey = Buffer.from("2d1c0d704322c0386cc7bead93298a48ee22325e967567ebe4dbcd4a2f4482f1", "hex");
const minterPubKey = BLS.getPublicKey(minterPrivKey);

const accOnePrivKey = Buffer.from(BLS.utils.randomPrivateKey());
const accOnePubKey = Buffer.from(BLS.getPublicKey(accOnePrivKey));

const accTwoPrivKey = Buffer.from(BLS.utils.randomPrivateKey());
const accTwoPubKey = Buffer.from(BLS.getPublicKey(accTwoPrivKey));

const accThreePirvKey = Buffer.from(BLS.utils.randomPrivateKey());
const accThreePubKey = Buffer.from(BLS.getPublicKey(accThreePirvKey));

let log: Logger;
let coordinator: CoordinatorRPC;
let client: ClientRPC;

before(async () => {
  log = new Logger("tosi-client-sync-test", "info");

  coordinator = new CoordinatorRPC({
    serverAddr: "127.0.0.1:20001",
    tls: false,
  });
  client = new ClientRPC({
    serverAddr: "127.0.0.1:30001",
  });
});

async function waitForAccountNonce(accountNonce: Record<string, number>): Promise<void> {
  log.debug("waiting for account nonces", undefined, { accounts: accountNonce });

  while (true) {
    // Sleep for 1 second.
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    // Check if coordinator has accepted/rejected transactions from accounts.
    let coordinatorCheck = true;
    for (const accPubKey of Object.keys(accountNonce)) {
      log.debug("querying account at coordinator node", undefined, { address: accPubKey });
      const account = await coordinator.getAccount(bytesFromHex(accPubKey));

      if (!account) {
        log.debug("account does not exist at coordinator node");
        coordinatorCheck = false;
        break;
      }

      log.debug("account found at coordinator node", undefined, { account: account });

      if (account.nonce != accountNonce[accPubKey]) {
        log.debug("account does not have desired nonce at coordinator node");
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
      log.debug("querying account at client node", undefined, { address: accPubKey });
      const account = await client.getAccount(bytesFromHex(accPubKey));

      if (!account) {
        log.debug("account does not exist at client node");
        clientCheck = false;
        break;
      }

      log.debug("account found at client node", undefined, { account: account });

      if (account.nonce != accountNonce[accPubKey]) {
        log.debug("account does not have desired nonce at client node");
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
  const blockHash = await coordinator.getHeadBlockHash();
  if (blockHash == undefined) {
    throw new Error("blockHash is undefined");
  }
  const coordinatorBlock = await coordinator.getBlock(blockHash);
  if (coordinatorBlock == undefined) {
    throw new Error("coordinatorBlock is undefined");
  }
  const clientBlockHash = await client.getHeadBlockHash();
  if (!bytesEqual(clientBlockHash, blockHash)) {
    throw new Error(
      `client block hash ${bytesToHex(clientBlockHash)} does not match coordinator block hash ${bytesToHex(blockHash)}`,
    );
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

async function checkAccounts(accounts: Account[]): Promise<void> {
  for (const acc of accounts) {
    const coordinatorAcc = await coordinator.getAccount(acc.address);
    if (coordinatorAcc == undefined) {
      throw new Error("account not found at coordinator node");
    }

    expect(bytesEqual(coordinatorAcc.address, acc.address)).to.be.true;
    expect(coordinatorAcc.nonce).to.be.eq(acc.nonce);
    expect(coordinatorAcc.balance).to.be.eq(acc.balance);
    expect(coordinatorAcc.daVerifierStake).to.be.eq(acc.daVerifierStake);
    expect(coordinatorAcc.stateVerifierStake).to.be.eq(acc.stateVerifierStake);

    const clientAcc = await client.getAccount(acc.address);
    if (clientAcc == undefined) {
      throw new Error("account not found at client node");
    }

    expect(bytesEqual(clientAcc.address, acc.address)).to.be.true;
    expect(clientAcc.nonce).to.be.eq(acc.nonce);
    expect(clientAcc.balance).to.be.eq(acc.balance);
    expect(clientAcc.daVerifierStake).to.be.eq(acc.daVerifierStake);
    expect(clientAcc.stateVerifierStake).to.be.eq(acc.stateVerifierStake);
  }
}

async function checkDAVerifiers(verifiersPubKeys: Uint8Array[]): Promise<void> {
  const coordinatorVerifiers = await coordinator.getStakerList(StakeType.DAVerifier);
  const clientVerifiers = await client.getStakerList(StakeType.DAVerifier);

  expect(coordinatorVerifiers.length).to.be.equal(verifiersPubKeys.length);
  expect(clientVerifiers.length).to.be.equal(verifiersPubKeys.length);

  for (const pubKey of verifiersPubKeys) {
    const coordinatorVerifier = coordinatorVerifiers.find((acc) => bytesEqual(acc.address, pubKey));
    expect(coordinatorVerifier).to.be.not.undefined;
    const clientVerifier = clientVerifiers.find((acc) => bytesEqual(acc.address, pubKey));
    expect(clientVerifier).to.be.not.undefined;
  }
}

async function checkStateVerifiers(verifiersPubKeys: Uint8Array[]): Promise<void> {
  const coordinatorVerifiers = await coordinator.getStakerList(StakeType.StateVerifier);
  const clientVerifiers = await client.getStakerList(StakeType.StateVerifier);

  expect(coordinatorVerifiers.length).to.be.equal(verifiersPubKeys.length);
  expect(clientVerifiers.length).to.be.equal(verifiersPubKeys.length);

  for (const pubKey of verifiersPubKeys) {
    const coordinatorVerifier = coordinatorVerifiers.find((acc) => bytesEqual(acc.address, pubKey));
    expect(coordinatorVerifier).to.be.not.undefined;
    const clientVerifier = clientVerifiers.find((acc) => bytesEqual(acc.address, pubKey));
    expect(clientVerifier).to.be.not.undefined;
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
    await coordinator.submitSignedTransaction(await signTransaction(txn1, minterPrivKey));

    // Create second account with 15000 tokens.
    const txn2 = {
      mint: {
        receiver: accTwoPubKey,
        amount: 15000n,
      },
      nonce: 1,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn2, minterPrivKey));

    // Ensure that invalid (from non-existent account) transaction doesn't break client sync.
    const txn3 = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 100n,
      },
      nonce: 0,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn3, accThreePirvKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[bytesToHex(minterPubKey)] = 1;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Account[] = [
      {
        address: accOnePubKey,
        nonce: -1,
        balance: 10000n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
      {
        address: accTwoPubKey,
        nonce: -1,
        balance: 15000n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
    ];
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
    await coordinator.submitSignedTransaction(await signTransaction(txn1, minterPrivKey));

    // Mint 10000 tokens and send it to second account.
    const txn2 = {
      mint: {
        receiver: accTwoPubKey,
        amount: 10000n,
      },
      nonce: 3,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn2, minterPrivKey));

    // Ensure that invalid (insufficient balance) transaction doesn't break client sync.
    const txn3: Transaction = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 20000n,
      },
      nonce: 0,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn3, accOnePrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[bytesToHex(minterPubKey)] = 3;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Account[] = [
      {
        address: accOnePubKey,
        nonce: -1,
        balance: 15000n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
      {
        address: accTwoPubKey,
        nonce: -1,
        balance: 25000n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
    ];
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
    await coordinator.submitSignedTransaction(await signTransaction(txn1, accOnePrivKey));

    // Transfer 5000 tokens from second account to first.
    const txn2: Transaction = {
      transfer: {
        receiver: accOnePubKey,
        amount: 5000n,
      },
      nonce: 0,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn2, accTwoPrivKey));

    // Transfer 600 tokens from first account to second.
    const txn3: Transaction = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 600n,
      },
      nonce: 1,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn3, accOnePrivKey));

    // Transfer 2500 tokens from second account to first.
    const txn4: Transaction = {
      transfer: {
        receiver: accOnePubKey,
        amount: 2500n,
      },
      nonce: 1,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn4, accTwoPrivKey));

    // Invalid transaction #1 - insufficient balance.
    const txn5: Transaction = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 100000n,
      },
      nonce: 2,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn5, accOnePrivKey));

    // Invalid transaction #2 - insufficient balance.
    const txn6: Transaction = {
      transfer: {
        receiver: accOnePubKey,
        amount: 100000n,
      },
      nonce: 2,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn6, accTwoPrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[bytesToHex(accOnePubKey)] = 1;
    accountNonces[bytesToHex(accTwoPubKey)] = 1;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Account[] = [
      {
        address: accOnePubKey,
        nonce: 1,
        balance: 21600n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
      {
        address: accTwoPubKey,
        nonce: 1,
        balance: 18400n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
    ];
    await checkAccounts(accounts);
  });

  it("transfer creates new receiver account", async () => {
    // Transfer 100 tokens to non-existent account
    // New account must be created with balance of 100 tokens.
    const txn1: Transaction = {
      transfer: {
        receiver: accThreePubKey,
        amount: 1000n,
      },
      nonce: 2,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn1, accOnePrivKey));

    // Transfer 100 tokens from second account to third account.
    const txn2: Transaction = {
      transfer: {
        receiver: accThreePubKey,
        amount: 1000n,
      },
      nonce: 2,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn2, accTwoPrivKey));

    // There is no expection on the order of txn1 and txn2.
    // In any case - one of them must create new account, while
    // another must transfer tokens to existing account.

    // Invalid transaction #1 - insufficient balance.
    const txn3: Transaction = {
      transfer: {
        receiver: accThreePubKey,
        amount: 100000n,
      },
      nonce: 3,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn3, accOnePrivKey));

    // Invalid transaction #2 - insufficient balance.
    const txn4: Transaction = {
      transfer: {
        receiver: accThreePubKey,
        amount: 100000n,
      },
      nonce: 3,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn4, accTwoPrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[bytesToHex(accOnePubKey)] = 2;
    accountNonces[bytesToHex(accTwoPubKey)] = 2;
    accountNonces[bytesToHex(accThreePubKey)] = -1;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Account[] = [
      {
        address: accOnePubKey,
        nonce: 2,
        balance: 20600n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
      {
        address: accTwoPubKey,
        nonce: 2,
        balance: 17400n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
      {
        address: accThreePubKey,
        nonce: -1,
        balance: 2000n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
    ];
    await checkAccounts(accounts);
  });
});

describe("client node correctly replays StakeToken transactions", function () {
  it("putting tokens into DA verifier stake pool", async () => {
    // First account puts 600 tokens at stake.
    const txn1: Transaction = {
      stake: {
        stakeType: StakeType.DAVerifier,
        amount: 600n,
      },
      nonce: 3,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn1, accOnePrivKey));

    // Second account puts 400 tokens at stake.
    const txn2: Transaction = {
      stake: {
        stakeType: StakeType.DAVerifier,
        amount: 400n,
      },
      nonce: 3,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn2, accTwoPrivKey));

    // Invalid transaction - insufficient balance.
    const txn3: Transaction = {
      stake: {
        stakeType: StakeType.DAVerifier,
        amount: 100000n,
      },
      nonce: 4,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn3, accTwoPrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[bytesToHex(accOnePubKey)] = 3;
    accountNonces[bytesToHex(accTwoPubKey)] = 3;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Account[] = [
      {
        address: accOnePubKey,
        nonce: 3,
        balance: 20000n,
        daVerifierStake: 600n,
        stateVerifierStake: 0n,
      },
      {
        address: accTwoPubKey,
        nonce: 3,
        balance: 17000n,
        daVerifierStake: 400n,
        stateVerifierStake: 0n,
      },
    ];
    await checkAccounts(accounts);

    await checkDAVerifiers([accOnePubKey, accTwoPubKey]);
  });

  it("putting tokens into state verifier stake pool", async () => {
    // First account puts 600 tokens at stake.
    const txn1: Transaction = {
      stake: {
        stakeType: StakeType.StateVerifier,
        amount: 600n,
      },
      nonce: 4,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn1, accOnePrivKey));

    // Second account puts 400 tokens at stake.
    const txn2: Transaction = {
      stake: {
        stakeType: StakeType.StateVerifier,
        amount: 400n,
      },
      nonce: 4,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn2, accTwoPrivKey));

    // Invalid transaction - insufficient balance.
    const txn3: Transaction = {
      stake: {
        stakeType: StakeType.StateVerifier,
        amount: 100000n,
      },
      nonce: 5,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn3, accTwoPrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[bytesToHex(accOnePubKey)] = 4;
    accountNonces[bytesToHex(accTwoPubKey)] = 4;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Account[] = [
      {
        address: accOnePubKey,
        nonce: 4,
        balance: 19400n,
        daVerifierStake: 600n,
        stateVerifierStake: 600n,
      },
      {
        address: accTwoPubKey,
        nonce: 4,
        balance: 16600n,
        daVerifierStake: 400n,
        stateVerifierStake: 400n,
      },
    ];
    await checkAccounts(accounts);

    await checkStateVerifiers([accOnePubKey, accTwoPubKey]);
  });
});

describe("client node correctly replays UnstakeToken transactions", function () {
  it("taking tokens out of DA verifier stake pool", async () => {
    // First account takes 300 tokens from stake pool.
    const txn1: Transaction = {
      unstake: {
        stakeType: StakeType.DAVerifier,
        amount: 300n,
      },
      nonce: 5,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn1, accOnePrivKey));

    // Second account takes 200 token from stake pool.
    const txn2: Transaction = {
      unstake: {
        stakeType: StakeType.DAVerifier,
        amount: 400n,
      },
      nonce: 5,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn2, accTwoPrivKey));

    // Invalid transaction - insufficient amount of staked tokens.
    const txn3: Transaction = {
      unstake: {
        stakeType: StakeType.DAVerifier,
        amount: 100000n,
      },
      nonce: 6,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn3, accTwoPrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[bytesToHex(accOnePubKey)] = 5;
    accountNonces[bytesToHex(accTwoPubKey)] = 5;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();

    const accounts: Account[] = [
      {
        address: accOnePubKey,
        nonce: 5,
        balance: 19700n,
        daVerifierStake: 300n,
        stateVerifierStake: 600n,
      },
      {
        address: accTwoPubKey,
        nonce: 5,
        balance: 17000n,
        daVerifierStake: 0n,
        stateVerifierStake: 400n,
      },
    ];
    await checkAccounts(accounts);

    await checkDAVerifiers([accOnePubKey]);
  });

  it("taking tokens out of state verifier stake pool", async () => {
    // First account takes 300 tokens from stake pool.
    const txn1: Transaction = {
      unstake: {
        stakeType: StakeType.StateVerifier,
        amount: 300n,
      },
      nonce: 6,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn1, accOnePrivKey));

    // Second account takes 200 token from stake pool.
    const txn2: Transaction = {
      unstake: {
        stakeType: StakeType.StateVerifier,
        amount: 400n,
      },
      nonce: 6,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn2, accTwoPrivKey));

    // Invalid transaction - insufficient amount of staked tokens.
    const txn3: Transaction = {
      unstake: {
        stakeType: StakeType.DAVerifier,
        amount: 100000n,
      },
      nonce: 7,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn3, accTwoPrivKey));

    const accountNonces: Record<string, number> = {};
    accountNonces[bytesToHex(accOnePubKey)] = 6;
    accountNonces[bytesToHex(accTwoPubKey)] = 6;
    await waitForAccountNonce(accountNonces);

    await checkHeadBlock();
    const accounts: Account[] = [
      {
        address: accOnePubKey,
        nonce: 6,
        balance: 20000n,
        daVerifierStake: 300n,
        stateVerifierStake: 300n,
      },
      {
        address: accTwoPubKey,
        nonce: 6,
        balance: 17400n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
    ];
    await checkAccounts(accounts);

    await checkStateVerifiers([accOnePubKey]);
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
      nonce: 6,
    };
    const signedTxn = await signTransaction(txn, accOnePrivKey);
    signedTxn.from = accTwoPubKey;
    await coordinator.submitSignedTransaction(signedTxn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INAVLID_TXN_WAIT_PERIOD);
    });

    await checkHeadBlock();

    const accounts: Account[] = [
      {
        address: accOnePubKey,
        nonce: 6,
        balance: 20000n,
        daVerifierStake: 300n,
        stateVerifierStake: 300n,
      },
      {
        address: accTwoPubKey,
        nonce: 6,
        balance: 17400n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
    ];
    await checkAccounts(accounts);
  });

  it("transaction with too low nonce is rejected", async () => {
    const txn: Transaction = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 100n,
      },
      nonce: 4,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn, accOnePrivKey));

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INAVLID_TXN_WAIT_PERIOD);
    });

    await checkHeadBlock();

    const accounts: Account[] = [
      {
        address: accOnePubKey,
        nonce: 6,
        balance: 20000n,
        daVerifierStake: 300n,
        stateVerifierStake: 300n,
      },
      {
        address: accTwoPubKey,
        nonce: 6,
        balance: 17400n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
    ];
    await checkAccounts(accounts);
  });

  it("transaction with too high nonce is rejected", async () => {
    const txn: Transaction = {
      transfer: {
        receiver: accTwoPubKey,
        amount: 100n,
      },
      nonce: 8,
    };
    await coordinator.submitSignedTransaction(await signTransaction(txn, accOnePrivKey));

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INAVLID_TXN_WAIT_PERIOD);
    });

    await checkHeadBlock();

    const accounts: Account[] = [
      {
        address: accOnePubKey,
        nonce: 6,
        balance: 20000n,
        daVerifierStake: 300n,
        stateVerifierStake: 300n,
      },
      {
        address: accTwoPubKey,
        nonce: 6,
        balance: 17400n,
        daVerifierStake: 0n,
        stateVerifierStake: 0n,
      },
    ];
    await checkAccounts(accounts);
  });
});
