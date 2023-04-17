import winston from "winston";

import { Transaction } from "../../blockchain/types";
import { bytesFromHex } from "../../blockchain/util";
import { signTransaction } from "../../blockchain/block";
import { CoordinatorRPC } from "../../coordinator/src/rpc";

let log: winston.Logger;

async function init() {
  // Get the minter private key from the environment variable.
  const minterlPrivKey = bytesFromHex(process.env.MINTER_PRIV_KEY as string);
  if (!minterlPrivKey) {
    console.error("MINTER_PRIV_KEY environment variable is not set.");
    process.exit(1);
  }

  const coordinatorRPCServerAddr = process.env.COORDINATOR_RPC_SERVER_ADDR;
  if (!coordinatorRPCServerAddr) {
    console.error("COORDINATOR_RPC_SERVER_ADDR environment variable is not set.");
    process.exit(1);
  }

  // Parse the amount from the command line arguments.
  const amountStr = process.argv[2];
  if (!amountStr) {
    console.error("Amount not provided.");
    process.exit(1);
  }
  const amount = BigInt(amountStr);

  // Parse the account public key from the command line arguments.
  const mintReceiver = bytesFromHex(process.argv[3]);
  if (!mintReceiver) {
    console.error("Receiver public key not provided.");
    process.exit(1);
  }

  const nonceStr = process.argv[4];
  if (!nonceStr) {
    console.error("Account public key not provided.");
    process.exit(1);
  }
  const nonce = Number(nonceStr);

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
  // Create a transaction object with the provided values.
  const txn: Transaction = {
    mint: {
      receiver: mintReceiver,
      amount: amount,
    },
    nonce: nonce,
  };

  // Sign the transaction using the minter private key.
  const signature = await signTransaction(txn, minterlPrivKey);

  // Send the signed transaction to the coordinator.
  const coordinator = new CoordinatorRPC({
    serverAddr: coordinatorRPCServerAddr,
  });
  await coordinator.submitSignedTransaction(signature);
}

init().catch((err) => {
  console.log(err);
});
