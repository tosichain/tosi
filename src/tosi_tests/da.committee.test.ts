// docker compose --profile build -p tosi-chain -f docker-compose-tosi-chain.yml up

import { expect } from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as BLS from "@noble/bls12-381";
import { CID } from "ipfs-http-client";

chai.use(chaiAsPromised);

import { Transaction, ComputeClaim, StakeType } from "../blockchain/types";
import { bytesToHex, bytesFromHex, stringifyAccount } from "../blockchain/util";
import { signTransaction } from "../blockchain/block";
import { CoordinatorRPC } from "../coordinator/src/rpc";
import { ClientRPC } from "../client/src/rpc";
import { IPFS } from "../node/ipfs";
import { hashComputeClaim } from "../blockchain/util";
import Logger from "../log/logger";

const FAKE_CID = "bafybeibnikymft2ikuygct6phxedz7x623cqlvcwxztedds5fzbb5mhdk4";
const FUNCTION_CID = "bafybeihnujjp7cll46wrpw4tjxjfzphwzob6suzymfjswoparozveeh7zi";
const SAMPLE_CID = "bafybeigyqpsfepjipxrz2m5e47rqwpgtkd526sn4z53fnis674gqb66c4e";
const EMPTY_DIR_CID = "bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354";
const EMPTY_16KB_CID = "bafkreicp462zv5w6hntfwz3yrtbptgesvobh56xdurttikz3wtr3zds37y";
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const INVALID_TXN_WAIT_PERIOD = 25000; // 25 seconds

const minterPrivKey = Buffer.from("2d1c0d704322c0386cc7bead93298a48ee22325e967567ebe4dbcd4a2f4482f1", "hex");
const minterPubKey = BLS.getPublicKey(minterPrivKey);

const clientPrivKey = Buffer.from("4d5a78da4f26be1d69593b19fac383abe5344668ae5671b1e6a8d72c1507f509", "hex");
const clientPubKey = BLS.getPublicKey(clientPrivKey);

const daVerifier1PrivKey = Buffer.from("22b8a5c1e4f51b1cade56c80edc963fe05e93192a08e77a1fe38f50b8f7d9f01", "hex");
const daVerifier1PubKey = BLS.getPublicKey(daVerifier1PrivKey);

const daVerifier2PrivKey = Buffer.from("18513804a1a2d3af9ca16829535a5ceea4218e508109f10466a453eb8ba8751f", "hex");
const daVerifier2PubKey = BLS.getPublicKey(daVerifier2PrivKey);

const daVerifier3PrivKey = Buffer.from("34a4db75366744ce1aef1702a981dac83bede3c90e8777dfb47d1992d557da7e", "hex");
const daVerifier3PubKey = BLS.getPublicKey(daVerifier3PrivKey);

let log: Logger;
let coordinator: CoordinatorRPC;
let client: ClientRPC;
let daVerifier1: ClientRPC;
let daVerifier2: ClientRPC;
let daVerifier3: ClientRPC;
let ipfs: IPFS;

before(async () => {
  log = new Logger("claim-verification-test", "info");

  coordinator = new CoordinatorRPC({
    serverAddr: "127.0.0.1:20001",
  });

  client = new ClientRPC({
    serverAddr: "127.0.0.1:30001",
  });

  daVerifier1 = new ClientRPC({
    serverAddr: "127.0.0.1:30002",
  });
  daVerifier2 = new ClientRPC({
    serverAddr: "127.0.0.1:30003",
  });
  daVerifier3 = new ClientRPC({
    serverAddr: "127.0.0.1:30004",
  });

  ipfs = new IPFS({ host: "127.0.0.1", port: 50011 }, log);
  await ipfs.up(log);

  await setupDACommittee();
});

async function waitForAccountNonce(accountNonce: Record<string, number>): Promise<void> {
  log.debug(`waiting for account nonces -  ${JSON.stringify(accountNonce)}`);

  while (true) {
    // Sleep for 1 second.
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
    // Check if coordinator node has accepted/rejected transactions from accounts.
    let coordinatorCheck = true;
    for (const accPubKey of Object.keys(accountNonce)) {
      log.debug(`querying account ${accPubKey} at coordinator node`);
      const account = await coordinator.getAccount(bytesFromHex(accPubKey));

      if (!account) {
        log.debug(`account ${accPubKey} does not exist at coordinator node`);
        coordinatorCheck = false;
        break;
      }

      log.debug(`account ${accPubKey} at coordinator node - ${stringifyAccount(account)}`);

      if (account.nonce != accountNonce[accPubKey]) {
        log.debug(`account ${accPubKey} does not have desired nonce at coordinator node`);
        coordinatorCheck = false;
        break;
      }
    }
    if (!coordinatorCheck) {
      continue;
    }

    // Check if all client nodes have accepted/rejected transactions from accounts.
    const clients: ClientRPC[] = [client, daVerifier1, daVerifier2, daVerifier3];
    let clientCheck = true;
    for (const accPubKey of Object.keys(accountNonce)) {
      log.debug(`querying account ${accPubKey} at at all client nodes`);

      const accountQuery = clients.map((c) => c.getAccount(bytesFromHex(accPubKey)));
      const accounts = await Promise.all(accountQuery);

      if (!accounts.every((a) => a != undefined)) {
        log.debug(`account ${accPubKey} does not exist at one or more client nodes`);
        clientCheck = false;
        break;
      }

      if (!accounts.every((a) => a?.nonce == accountNonce[accPubKey])) {
        log.debug(
          `account ${accPubKey} does not have desired nonce at one or more client nodes ${accounts.map((x) => {
            x?.nonce;
          })}`,
        );
        clientCheck = false;
        break;
      }
    }
    if (clientCheck) {
      break;
    }
  }
}

async function setupDACommittee() {
  log.info("minter allocates tokens");

  // TODO: submit these transactions via client node.
  const txn1: Transaction = {
    mint: {
      receiver: clientPubKey,
      amount: 2000n,
    },
    nonce: 0,
  };
  await coordinator.submitSignedTransaction(await signTransaction(txn1, minterPrivKey));
  const txn2 = {
    mint: {
      receiver: daVerifier1PubKey,
      amount: 2000n,
    },
    nonce: 1,
  };
  await coordinator.submitSignedTransaction(await signTransaction(txn2, minterPrivKey));
  const txn3 = {
    mint: {
      receiver: daVerifier2PubKey,
      amount: 2000n,
    },
    nonce: 2,
  };
  await coordinator.submitSignedTransaction(await signTransaction(txn3, minterPrivKey));
  const txn4 = {
    mint: {
      receiver: daVerifier3PubKey,
      amount: 2000n,
    },
    nonce: 3,
  };
  await coordinator.submitSignedTransaction(await signTransaction(txn4, minterPrivKey));

  let accountNonces: Record<string, number> = {};
  accountNonces[bytesToHex(minterPubKey)] = 3;
  await waitForAccountNonce(accountNonces);

  log.info("DA verifiers put tokens at stake");

  await daVerifier1.submitTransaction({
    stake: {
      stakeType: StakeType.DAVerifier,
      amount: 500n,
    },
    nonce: 0,
  });
  await daVerifier2.submitTransaction({
    stake: {
      stakeType: StakeType.DAVerifier,
      amount: 500n,
    },
    nonce: 0,
  });
  await daVerifier3.submitTransaction({
    stake: {
      stakeType: StakeType.DAVerifier,
      amount: 500n,
    },
    nonce: 0,
  });

  accountNonces = {};
  accountNonces[bytesToHex(daVerifier1PubKey)] = 0;
  accountNonces[bytesToHex(daVerifier2PubKey)] = 0;
  accountNonces[bytesToHex(daVerifier3PubKey)] = 0;

  await waitForAccountNonce(accountNonces);

  await daVerifier1.submitTransaction({
    stake: {
      stakeType: StakeType.StateVerifier,
      amount: 500n,
    },
    nonce: 0,
  });
  await daVerifier2.submitTransaction({
    stake: {
      stakeType: StakeType.StateVerifier,
      amount: 500n,
    },
    nonce: 0,
  });
  await daVerifier3.submitTransaction({
    stake: {
      stakeType: StakeType.StateVerifier,
      amount: 500n,
    },
    nonce: 0,
  });
  accountNonces = {};
  accountNonces[bytesToHex(daVerifier1PubKey)] = 1;
  accountNonces[bytesToHex(daVerifier2PubKey)] = 1;
  accountNonces[bytesToHex(daVerifier3PubKey)] = 1;
  await waitForAccountNonce(accountNonces);
}

async function getDummyData(): Promise<CID> {
  const data = BLS.utils.randomBytes(100);

  return (await ipfs.getIPFS().add(data, { cidVersion: 1 })).cid;
}

async function verifyHeadClaim(rootClaimHash: Uint8Array, headClaim: ComputeClaim | undefined): Promise<void> {
  const chain = await client.getDataChain(rootClaimHash);
  if (headClaim) {
    expect(chain).not.to.be.undefined;
    const headClaimInChain = chain?.claims[bytesToHex(chain?.headClaimHash)];
    expect(headClaimInChain?.dataContract.cid.toString()).to.be.equal(headClaim.dataContract.cid.toString());
    expect(headClaimInChain?.input.cid.toString()).to.be.equal(headClaim.input.cid.toString());
    expect(headClaimInChain?.output.cid.toString()).to.be.equal(headClaim.output.cid.toString());
  } else {
    expect(chain).to.be.undefined;
  }
}

let rootClaim: ComputeClaim;
let rootClaimHash: Uint8Array;
let headClaim: ComputeClaim;
let headClaimHash: Uint8Array;

describe("DA verification is performed correctly", function () {
  it("client creates new compute chain with intentionally broken function", async () => {
    const txn = await client.generateCreateDatachainTxn({
      dataContractCID: CID.parse(EMPTY_16KB_CID),
      inputCID: CID.parse(EMPTY_DIR_CID),
      outputCID: CID.parse(EMPTY_DIR_CID),
      outputFileHash: Buffer.from(EMPTY_SHA256, "hex"),
    });
    if (!txn.createChain) {
      throw new Error("invalid CreateDatachain transaction");
    }

    const invalidRootClaimHash = hashComputeClaim(txn.createChain.rootClaim);

    await client.submitTransaction(txn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INVALID_TXN_WAIT_PERIOD);
    });

    await verifyHeadClaim(invalidRootClaimHash, undefined);
  });

  it("client creates new compute chain (real data)", async () => {
    const txn = await client.generateCreateDatachainTxn({
      dataContractCID: CID.parse(FUNCTION_CID),
      inputCID: CID.parse(SAMPLE_CID),
      outputCID: CID.parse(EMPTY_DIR_CID),
      outputFileHash: Buffer.from(EMPTY_SHA256, "hex"),
    });
    if (!txn.createChain) {
      throw new Error("invalid CreateDatachain transaction");
    }

    rootClaim = txn.createChain.rootClaim;
    rootClaimHash = hashComputeClaim(rootClaim);
    headClaim = rootClaim;
    headClaimHash = rootClaimHash;
    await client.submitTransaction(txn);

    const accountNonces: Record<string, number> = {};
    accountNonces[bytesToHex(clientPubKey)] = 0;
    await waitForAccountNonce(accountNonces);

    await verifyHeadClaim(rootClaimHash, txn.createChain.rootClaim);
  });

  it("client adds compute claim to existing chain", async () => {
    const txn = await client.generateUpdateDatachainTxn({
      dataContractCID: CID.parse(FUNCTION_CID),
      inputCID: await getDummyData(),
      outputCID: CID.parse(EMPTY_DIR_CID),
      rootClaimHash: rootClaimHash,
      outputFileHash: Buffer.from(EMPTY_SHA256, "hex"),
    });
    if (!txn.updateChain) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    headClaim = txn.updateChain.claim;
    headClaimHash = hashComputeClaim(headClaim);

    await client.submitTransaction(txn);

    const accountNonces: Record<string, number> = {};
    accountNonces[bytesToHex(clientPubKey)] = 1;
    await waitForAccountNonce(accountNonces);

    await verifyHeadClaim(rootClaimHash, headClaim);
  });

  it("client tries to add compute claim with unvailable data to existing chain", async () => {
    // Generate valid valid UpdateDatachain transaction.
    const txn = await client.generateUpdateDatachainTxn({
      dataContractCID: CID.parse(FUNCTION_CID),
      inputCID: await getDummyData(),
      outputCID: CID.parse(EMPTY_DIR_CID),
      rootClaimHash: rootClaimHash,
      outputFileHash: Buffer.from(EMPTY_SHA256, "hex"),
    });
    if (!txn.updateChain) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    // Corrupt inputCID.
    const invalidTxn: Transaction = {
      ...txn,
      updateChain: {
        rootClaimHash: rootClaimHash,
        claim: {
          ...txn.updateChain.claim,
          input: { ...txn.updateChain.claim.input, cid: CID.parse(FAKE_CID) },
        },
      },
    };
    if (!invalidTxn.updateChain) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    await client.submitTransaction(invalidTxn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INVALID_TXN_WAIT_PERIOD);
    });

    await verifyHeadClaim(rootClaimHash, headClaim);
  });

  it("client tries to use compute claim with unavailable data to create new chain", async () => {
    // Generate valid valid CreateDatachain transaction.
    const txn = await client.generateCreateDatachainTxn({
      dataContractCID: CID.parse(FUNCTION_CID),
      inputCID: await getDummyData(),
      outputCID: CID.parse(EMPTY_DIR_CID),
      outputFileHash: Buffer.from(EMPTY_SHA256, "hex"),
    });
    if (!txn.createChain) {
      throw new Error("invalid CreateDatachain transaction");
    }

    // Corrupt courtCID.
    const invalidTxn: Transaction = {
      ...txn,
      createChain: {
        rootClaim: {
          ...txn.createChain.rootClaim,
          dataContract: { ...txn.createChain.rootClaim.dataContract, cid: CID.parse(FAKE_CID) },
        },
      },
    };
    if (!invalidTxn.createChain) {
      throw new Error("invalid CreateDatachain transaction");
    }
    const invalidRootClaimHash = hashComputeClaim(invalidTxn.createChain.rootClaim);

    await client.submitTransaction(invalidTxn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INVALID_TXN_WAIT_PERIOD);
    });

    await verifyHeadClaim(invalidRootClaimHash, undefined);
  });
});

describe("invalid CreateDatachain and UpdateDatachian transactions are rejected", function () {
  it("CreateDatachain transaction, creating duplicate datachain, is rejected", async () => {
    const txn = await client.generateCreateDatachainTxn({
      dataContractCID: rootClaim.dataContract.cid,
      inputCID: rootClaim.input.cid,
      outputCID: rootClaim.output.cid,
      outputFileHash: Buffer.from(EMPTY_SHA256, "hex"),
    });
    if (!txn.createChain) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    await client.submitTransaction(txn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INVALID_TXN_WAIT_PERIOD);
    });

    await verifyHeadClaim(rootClaimHash, headClaim);
  });

  it("UpdateDatachain transaction with invalid claimer public key is rejected", async () => {
    const txn = await client.generateUpdateDatachainTxn({
      dataContractCID: CID.parse(FUNCTION_CID),
      inputCID: CID.parse(EMPTY_DIR_CID),
      outputCID: CID.parse(EMPTY_DIR_CID),
      rootClaimHash: rootClaimHash,
      outputFileHash: Buffer.from(EMPTY_SHA256, "hex"),
    });
    if (!txn.updateChain) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    const invalidTxn: Transaction = {
      ...txn,
      updateChain: {
        rootClaimHash: rootClaimHash,
        claim: {
          ...txn.updateChain.claim,
          claimer: daVerifier1PubKey, // Must be clientPubKey instead.
        },
      },
    };

    await client.submitTransaction(invalidTxn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INVALID_TXN_WAIT_PERIOD);
    });

    await verifyHeadClaim(rootClaimHash, headClaim);
  });

  it("UpdateDatachain transaction wtih invalid hash of previous claim is rejected", async () => {
    const txn = await client.generateUpdateDatachainTxn({
      dataContractCID: CID.parse(FUNCTION_CID),
      inputCID: CID.parse(EMPTY_DIR_CID),
      outputCID: CID.parse(EMPTY_DIR_CID),
      rootClaimHash: rootClaimHash,
      outputFileHash: Buffer.from(EMPTY_SHA256, "hex"),
    });
    if (!txn.updateChain) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    const invalidTxn: Transaction = {
      ...txn,
      updateChain: {
        rootClaimHash: rootClaimHash,
        claim: {
          ...txn.updateChain.claim,
          prevClaimHash: rootClaimHash, // must be headClaimHash instead.
        },
      },
    };

    await client.submitTransaction(invalidTxn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INVALID_TXN_WAIT_PERIOD);
    });

    await verifyHeadClaim(rootClaimHash, headClaim);
  });
});
