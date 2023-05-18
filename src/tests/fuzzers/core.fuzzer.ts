// docker compose --profile build -p tosi-chain -f docker-compose-tosi-chain.yml up

import { SignedTransaction, Block } from "../../blockchain/types";
import { bytesEqual, bytesToHex, bytesFromHex, hashSignedTransaction } from "../../blockchain/util";
import { CoordinatorRPC } from "../../coordinator/src/rpc";
import Logger from "../../log/logger";
import { currentUnixTime } from "../../util";

import { EngineConfig, Engine } from "./engine/engine";

type FuzzerConfig = {
  engine: EngineConfig;
  coordinatorAddr: string;
  clientAddrs: string[];
  duration: number; // seconds
  txnGenerator: TransactionGeneratorConfig;
  blockWatcher: BlockWatcherConfig;
};

type TransactionGeneratorConfig = {
  intervalMin: number; // seconds
  intervalMax: number; // seconds`
};

type BlockWatcherConfig = {
  queryInterval: number; // seconds
};

async function run(): Promise<void> {
  const config = loadConfig();

  const log = new Logger("core-fuzzer", "info");
  const engine = new Engine(config.engine, log);

  const coordinator = new CoordinatorRPC({ serverAddr: config.coordinatorAddr });

  const genesisBlockHash = await coordinator.getHeadBlockHash();

  const airdropTxns = await engine.generateAirdropTxns();
  for (const txn of airdropTxns) {
    await coordinator.submitSignedTransaction(txn);
  }
  const airdropBlockHash = await waitForBlockTransactions(
    genesisBlockHash,
    engine,
    coordinator,
    airdropTxns,
    config.blockWatcher,
  );

  await Promise.all([
    generateTransactions(config.duration, engine, coordinator, config.txnGenerator),
    watchBlocks(config.duration, airdropBlockHash, engine, coordinator, config.blockWatcher),
  ]);
}

function loadConfig(): FuzzerConfig {
  const engine: EngineConfig = {
    minter: bytesFromHex("2d1c0d704322c0386cc7bead93298a48ee22325e967567ebe4dbcd4a2f4482f1"),
    verifiers: [
      bytesFromHex("22b8a5c1e4f51b1cade56c80edc963fe05e93192a08e77a1fe38f50b8f7d9f01"),
      bytesFromHex("18513804a1a2d3af9ca16829535a5ceea4218e508109f10466a453eb8ba8751f"),
      bytesFromHex("34a4db75366744ce1aef1702a981dac83bede3c90e8777dfb47d1992d557da7e"),
    ],
    userCount: 20,
    transactions: {
      airdrop: {
        minAmount: 10000n,
        maxAmount: 100000n,
        receiverCount: 20,
      },
      mint: {
        weight: 0.1,
        minAmount: 100000n,
        maxAmount: 100000n,
      },
      transfer: {
        weight: 0.5,
        minRatio: 0.05,
        maxRatio: 0.3,
      },
      stake: {
        weight: 0.2,
        minRatio: 0.05,
        maxRatio: 0.3,
      },
      unstake: {
        weight: 0.2,
        minRatio: 0.05,
        maxRatio: 0.3,
      },
    },
  };

  const txnGenerator: TransactionGeneratorConfig = {
    intervalMin: 3,
    intervalMax: 6,
  };

  const blockWatcher: BlockWatcherConfig = {
    queryInterval: 5,
  };

  return {
    duration: 100,
    engine: engine,
    coordinatorAddr: "127.0.0.1:20001",
    clientAddrs: ["127.0.0.1:30001", "127.0.0.1:30002", "127.0.0.1:30003", "127.0.0.1:30004"],
    txnGenerator: txnGenerator,
    blockWatcher: blockWatcher,
  };
}

async function generateTransactions(
  duration: number,
  engine: Engine,
  coordinator: CoordinatorRPC,
  config: TransactionGeneratorConfig,
): Promise<void> {
  const startTime = currentUnixTime();

  while (currentUnixTime() - startTime < duration) {
    const txn = (await engine.generateTxns(1))[1];

    //!!!
    //await coordinator.submitSignedTransaction(txn);

    const interval = config.intervalMin + Math.random() * (config.intervalMax - config.intervalMin);
    await new Promise((resolve, reject) => {
      setTimeout(resolve, interval * 1000);
    });
  }
}

async function waitForBlockTransactions(
  startFromBlockHash: Uint8Array,
  engine: Engine,
  coordinator: CoordinatorRPC,
  txns: SignedTransaction[],
  config: BlockWatcherConfig,
): Promise<Uint8Array> {
  const txnHashes = new Set<string>();
  for (const txn of txns) {
    const txnHashHex = bytesToHex(hashSignedTransaction(txn));
    txnHashes.add(txnHashHex);
  }

  let lastHeadBlockHash = startFromBlockHash;

  while (true) {
    await new Promise((resolve, reject) => {
      setTimeout(resolve, config.queryInterval * 1000);
    });

    // Check if coordinator's head block hash has changed.
    const curHeadBlockHash = await coordinator.getHeadBlockHash();
    if (bytesEqual(lastHeadBlockHash, curHeadBlockHash)) {
      continue;
    }

    // Confirm all transactons from new blocks and mark them as found.
    const newBlocks = await getBlocks(curHeadBlockHash, lastHeadBlockHash, coordinator);
    for (const block of newBlocks) {
      await engine.confirmTxns(block.transactions, block.time);
      for (const txn of block.transactions) {
        const txnHashHex = bytesToHex(hashSignedTransaction(txn));
        txnHashes.delete(txnHashHex);
      }
    }

    lastHeadBlockHash = curHeadBlockHash;

    // Terminate in case all transactions are marked as found.
    if (txnHashes.size == 0) {
      return lastHeadBlockHash;
    }
  }
}

async function watchBlocks(
  duration: number,
  startFromBlockHash: Uint8Array,
  engine: Engine,
  coordinator: CoordinatorRPC,
  config: BlockWatcherConfig,
): Promise<void> {
  const startTime = currentUnixTime();
  let lastHeadBlockHash = startFromBlockHash;

  while (currentUnixTime() - startTime < duration) {
    await new Promise((resolve, reject) => {
      setTimeout(resolve, config.queryInterval * 1000);
    });

    // Check if head block hash has changed.
    const curHeadBlockHash = await coordinator.getHeadBlockHash();
    if (bytesEqual(lastHeadBlockHash, curHeadBlockHash)) {
      continue;
    }

    // Confirm all transactons from new blocks.
    const newBlocks = await getBlocks(curHeadBlockHash, lastHeadBlockHash, coordinator);
    for (const block of newBlocks) {
      await engine.confirmTxns(block.transactions, block.time);
    }

    lastHeadBlockHash = curHeadBlockHash;
  }
}

async function getBlocks(
  fromBlockHash: Uint8Array,
  toBlockHash: Uint8Array,
  coordinator: CoordinatorRPC,
): Promise<Block[]> {
  const blocks: Block[] = [];

  let curBlockHash = fromBlockHash;
  let newBlock = await coordinator.getBlock(curBlockHash);
  while (true) {
    if (!newBlock) {
      throw new Error("can not fetch block by its hash from coordinator");
    }
    blocks.push(newBlock);
    curBlockHash = newBlock.prevBlockHash;
    if (bytesEqual(curBlockHash, toBlockHash)) {
      break;
    }
    newBlock = await coordinator.getBlock(curBlockHash);
  }

  return blocks;
}

run().catch((err) => {
  console.log(err);
});
