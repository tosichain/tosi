import { expect } from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import winston from "winston";
import * as BLS from "@noble/bls12-381";
import { CID } from "ipfs-http-client";

chai.use(chaiAsPromised);

import { Transaction, ComputeClaim, StakeType } from "../blockchain/types";
import { stringifyAccount } from "../blockchain/util";
import { signTransaction } from "../blockchain/block";
import { CoordinatorAPIClient } from "../coordinator/src/api_client";
import { ClientNodeAPIClient } from "../client/src/api_client";
import { IPFS } from "../node/ipfs";
import { hashComputeClaim } from "../blockchain/util";

const FAKE_CID = "bafybeibnikymft2ikuygct6phxedz7x623cqlvcwxztgdds5fzbb5mhdk4";
const INAVLID_TXN_WAIT_PERIOD = 25000; // 25 seconds

const minterPrivKey = Buffer.from("2d1c0d704322c0386cc7bead93298a48ee22325e967567ebe4dbcd4a2f4482f1").toString();
const minterPubKey = Buffer.from(BLS.getPublicKey(minterPrivKey)).toString("hex");

const clientPrivKey = Buffer.from("4d5a78da4f26be1d69593b19fac383abe5344668ae5671b1e6a8d72c1507f509").toString();
const clientPubKey = Buffer.from(BLS.getPublicKey(clientPrivKey)).toString("hex");

const daVerifier1PrivKey = Buffer.from("22b8a5c1e4f51b1cade56c80edc963fe05e93192a08e77a1fe38f50b8f7d9f01").toString();
const daVerifier1PubKey = Buffer.from(BLS.getPublicKey(daVerifier1PrivKey)).toString("hex");

const daVerifier2PrivKey = Buffer.from("18513804a1a2d3af9ca16829535a5ceea4218e508109f10466a453eb8ba8751f").toString();
const daVerifier2PubKey = Buffer.from(BLS.getPublicKey(daVerifier2PrivKey)).toString("hex");

const daVerifier3PrivKey = Buffer.from("34a4db75366744ce1aef1702a981dac83bede3c90e8777dfb47d1992d557da7e").toString();
const daVerifier3PubKey = Buffer.from(BLS.getPublicKey(daVerifier3PrivKey)).toString("hex");

let log: winston.Logger;
let coordinator: CoordinatorAPIClient;
let client: ClientNodeAPIClient;
let daVerifier1: ClientNodeAPIClient;
let daVerifier2: ClientNodeAPIClient;
let daVerifier3: ClientNodeAPIClient;
let ipfs: IPFS;
let lastHeadBlockHash: string;

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

  daVerifier1 = new ClientNodeAPIClient(
    {
      apiURL: "http://127.0.0.1:30002/api",
    },
    log,
  );
  daVerifier2 = new ClientNodeAPIClient(
    {
      apiURL: "http://127.0.0.1:30003/api",
    },
    log,
  );
  daVerifier3 = new ClientNodeAPIClient(
    {
      apiURL: "http://127.0.0.1:30004/api",
    },
    log,
  );

  lastHeadBlockHash = await coordinator.getHeadBblockHash();

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
      const account = await coordinator.getAccount(accPubKey);

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
    const clients: ClientNodeAPIClient[] = [client, daVerifier1, daVerifier2, daVerifier3];
    let clientCheck = true;
    for (const accPubKey of Object.keys(accountNonce)) {
      log.debug(`querying account ${accPubKey} at at all client nodes`);

      const accountQuery = clients.map((c) => c.getAccount(accPubKey));
      const accounts = await Promise.all(accountQuery);

      if (!accounts.every((a) => a != undefined)) {
        log.debug(`account ${accPubKey} does not exist at one or more client nodes`);
        clientCheck = false;
        break;
      }

      if (!accounts.every((a) => a?.nonce == accountNonce[accPubKey])) {
        log.debug(`account ${accPubKey} does not have desired nonce at one or more client nodes`);
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
  await coordinator.submitTransaction(await signTransaction(txn1, minterPrivKey));
  const txn2 = {
    mint: {
      receiver: daVerifier1PubKey,
      amount: 2000n,
    },
    nonce: 1,
  };
  await coordinator.submitTransaction(await signTransaction(txn2, minterPrivKey));
  const txn3 = {
    mint: {
      receiver: daVerifier2PubKey,
      amount: 2000n,
    },
    nonce: 2,
  };
  await coordinator.submitTransaction(await signTransaction(txn3, minterPrivKey));
  const txn4 = {
    mint: {
      receiver: daVerifier3PubKey,
      amount: 2000n,
    },
    nonce: 3,
  };
  await coordinator.submitTransaction(await signTransaction(txn4, minterPrivKey));

  let accountNonces: Record<string, number> = {};
  accountNonces[minterPubKey] = 3;
  await waitForAccountNonce(accountNonces);

  log.info("DA verifiers put tokens at stake");

  await daVerifier1.submitTransaction({
    stake: {
      stakeType: StakeType.DAVerifier,
      amount: 1000n,
    },
    nonce: 0,
  });
  await daVerifier2.submitTransaction({
    stake: {
      stakeType: StakeType.DAVerifier,
      amount: 1000n,
    },
    nonce: 0,
  });
  await daVerifier3.submitTransaction({
    stake: {
      stakeType: StakeType.DAVerifier,
      amount: 1000n,
    },
    nonce: 0,
  });

  accountNonces = {};
  accountNonces[daVerifier1PubKey] = 0;
  accountNonces[daVerifier2PubKey] = 0;
  accountNonces[daVerifier3PubKey] = 0;
  await waitForAccountNonce(accountNonces);
}

interface DummyClaim {
  appCID: CID;
  courtCID: CID;
  inputCID: CID;
  outputCID: CID;
}

async function generateDummyClaim(): Promise<DummyClaim> {
  const court = BLS.utils.randomBytes(100);
  const app = BLS.utils.randomBytes(100);
  const input = BLS.utils.randomBytes(100);
  const output = BLS.utils.randomBytes(100);

  return {
    courtCID: await (await ipfs.getIPFS().add(court, { cidVersion: 1 })).cid,
    appCID: await (await ipfs.getIPFS().add(app, { cidVersion: 1 })).cid,
    inputCID: await (await ipfs.getIPFS().add(input, { cidVersion: 1 })).cid,
    outputCID: await (await ipfs.getIPFS().add(output, { cidVersion: 1 })).cid,
  };
}

async function verifyHeadClaim(rootClaimHash: string, headClaim: ComputeClaim | undefined): Promise<void> {
  const chain = await client.getDataChain(rootClaimHash);
  if (headClaim) {
    expect(chain).not.to.be.undefined;
    const headClaimInChain = chain?.claims[chain?.headClaimHash];
    expect(headClaimInChain?.appCID).to.be.eq(headClaim.appCID.toString());
    expect(headClaimInChain?.courtCID).to.be.eq(headClaim.courtCID.toString());
    expect(headClaimInChain?.inputCID).to.be.eq(headClaim.inputCID.toString());
    expect(headClaimInChain?.outputCID).to.be.eq(headClaim.outputCID.toString());
  } else {
    expect(chain).to.be.undefined;
  }
}

let rootClaim: ComputeClaim;
let rootClaimHash: string;
let headClaim: ComputeClaim;
let headClaimHash: string;

describe("DA verification is performed correctly", function () {
  it("client creates new compute chain", async () => {
    const claim = await generateDummyClaim();
    const txn = await client.generateCreateDatachainTxn({
      appCID: claim.appCID,
      courtCID: claim.courtCID,
      inputCID: claim.inputCID,
      outputCID: claim.outputCID,
    });
    if (!txn.addChain) {
      throw new Error("invalid CreateDatachain transaction");
    }

    rootClaim = txn.addChain.rootClaim;
    rootClaimHash = hashComputeClaim(rootClaim);
    headClaim = rootClaim;
    headClaimHash = rootClaimHash;

    await client.submitTransaction(txn);

    const accountNonces: Record<string, number> = {};
    accountNonces[clientPubKey] = 0;
    await waitForAccountNonce(accountNonces);

    await verifyHeadClaim(rootClaimHash, txn.addChain.rootClaim);
  });

  it("client adds compute claim to existing chain", async () => {
    const claim = await generateDummyClaim();
    const txn = await client.generateUpdateDatachainTxn({
      appCID: claim.appCID,
      courtCID: claim.courtCID,
      inputCID: claim.inputCID,
      outputCID: claim.outputCID,
      rootClaimHash: rootClaimHash,
    });
    if (!txn.addClaim) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    headClaim = txn.addClaim.claim;
    headClaimHash = hashComputeClaim(headClaim);

    await client.submitTransaction(txn);

    const accountNonces: Record<string, number> = {};
    accountNonces[clientPubKey] = 1;
    await waitForAccountNonce(accountNonces);

    await verifyHeadClaim(rootClaimHash, headClaim);
  });

  it("client tries to add compute claim with unvailable data to existing chain", async () => {
    // Generate valid valid UpdateDatachain transaction.
    const claim = await generateDummyClaim();
    const txn = await client.generateUpdateDatachainTxn({
      appCID: claim.appCID,
      courtCID: claim.courtCID,
      inputCID: claim.inputCID,
      outputCID: claim.outputCID,
      rootClaimHash: rootClaimHash,
    });
    if (!txn.addClaim) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    // Corrupt appCID.
    const invalidTxn: Transaction = {
      ...txn,
      addClaim: {
        rootClaimHash: rootClaimHash,
        claim: {
          ...txn.addClaim.claim,
          appCID: FAKE_CID,
        },
      },
    };
    if (!invalidTxn.addClaim) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    await client.submitTransaction(invalidTxn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INAVLID_TXN_WAIT_PERIOD);
    });

    await verifyHeadClaim(rootClaimHash, headClaim);
  });

  it("client tries to use compute claim with unavailable data to create new chain", async () => {
    // Generate valid valid CreateDatachain transaction.
    const claim = await generateDummyClaim();
    const txn = await client.generateCreateDatachainTxn({
      appCID: claim.appCID,
      courtCID: claim.courtCID,
      inputCID: claim.inputCID,
      outputCID: claim.outputCID,
    });
    if (!txn.addChain) {
      throw new Error("invalid CreateDatachain transaction");
    }

    // Corrupt courtCID.
    const invalidTxn: Transaction = {
      ...txn,
      addChain: {
        rootClaim: {
          ...txn.addChain.rootClaim,
          courtCID: FAKE_CID,
        },
      },
    };
    if (!invalidTxn.addChain) {
      throw new Error("invalid CreateDatachain transaction");
    }
    const invalidRootClaimHash = hashComputeClaim(invalidTxn.addChain.rootClaim);

    await client.submitTransaction(invalidTxn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INAVLID_TXN_WAIT_PERIOD);
    });

    await verifyHeadClaim(invalidRootClaimHash, undefined);
  });

  // TODO:
  /*
  it("DA checker from commitee sample goes offline", async () => {
  })

  it("adversary from commitee sample tries to fake data availability", async () => {
  })

  it("adversary not from committee sample tries to fake data availability", async () => {
  })

  it("adversary not from committee sample tries to forge signature", async () => {
  })
  */
});

describe("invalid CreateDatachain and UpdateDatachian transactions are rejected", function () {
  it("CreateDatachain transaction, creating duplicate datachain, is rejected", async () => {
    const txn = await client.generateCreateDatachainTxn({
      appCID: CID.parse(rootClaim.appCID),
      courtCID: CID.parse(rootClaim.courtCID),
      inputCID: CID.parse(rootClaim.inputCID),
      outputCID: CID.parse(rootClaim.outputCID),
    });
    if (!txn.addChain) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    await client.submitTransaction(txn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INAVLID_TXN_WAIT_PERIOD);
    });

    await verifyHeadClaim(rootClaimHash, headClaim);
  });

  it("UpdateDatachain transaction with invalid claimer public key is rejected", async () => {
    const claim = await generateDummyClaim();
    const txn = await client.generateUpdateDatachainTxn({
      appCID: claim.appCID,
      courtCID: claim.courtCID,
      inputCID: claim.inputCID,
      outputCID: claim.outputCID,
      rootClaimHash: rootClaimHash,
    });
    if (!txn.addClaim) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    const invalidTxn: Transaction = {
      ...txn,
      addClaim: {
        rootClaimHash: rootClaimHash,
        claim: {
          ...txn.addClaim.claim,
          claimer: daVerifier1PubKey, // Must be clientPubKey instead.
        },
      },
    };

    await client.submitTransaction(invalidTxn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INAVLID_TXN_WAIT_PERIOD);
    });

    await verifyHeadClaim(rootClaimHash, headClaim);
  });

  it("UpdateDatachain transaction wtih invalid hash of previous claim is rejected", async () => {
    const claim = await generateDummyClaim();
    const txn = await client.generateUpdateDatachainTxn({
      appCID: claim.appCID,
      courtCID: claim.courtCID,
      inputCID: claim.inputCID,
      outputCID: claim.outputCID,
      rootClaimHash: rootClaimHash,
    });
    if (!txn.addClaim) {
      throw new Error("invalid UpdateDatachain transaction");
    }

    const invalidTxn: Transaction = {
      ...txn,
      addClaim: {
        rootClaimHash: rootClaimHash,
        claim: {
          ...txn.addClaim.claim,
          prevClaimHash: rootClaimHash, // must be headClaimHash instead.
        },
      },
    };

    await client.submitTransaction(invalidTxn);

    // Wait to ensure invalid transaction is rejected.
    await new Promise((resolve) => {
      setTimeout(resolve, INAVLID_TXN_WAIT_PERIOD);
    });

    await verifyHeadClaim(rootClaimHash, headClaim);
  });
});
