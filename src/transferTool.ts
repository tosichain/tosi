import { Transaction } from "./blockchain/types";
import { signTransaction } from "./blockchain/block";
import { CoordinatorAPIClient } from "./coordinator/src/api_client";
import winston from "winston";

let log: winston.Logger;

async function init() {
  // Get the minter private key from the environment variable.
  const sendPrivKey = process.env.SENDER_PRIV_KEY;
  if (!sendPrivKey) {
    console.error("SENDER_PRIV_KEY environment variable is not set.");
    process.exit(1);
  }

  const coordinatorAPIurl = process.env.COORDINATOR_API;
  if (!coordinatorAPIurl) {
    console.error("COORDINATOR_API environment variable is not set.");
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
  const mintReceiver = process.argv[3];
  if (!mintReceiver) {
    console.error("Receiver public key not provided.");
    process.exit(1);
  }

  const nonceStr = process.argv[4];
  if (!nonceStr) {
    console.error("Nonce not provided");
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
    transfer: {
      receiver: mintReceiver,
      amount: amount,
    },
    nonce: nonce,
  };

  // Sign the transaction using the minter private key.
  const signature = await signTransaction(txn, sendPrivKey);

  // Send the signed transaction to the coordinator.
  const coordinator = new CoordinatorAPIClient(
    {
      apiURL: coordinatorAPIurl,
    },
    log,
  );
  await coordinator.submitTransaction(signature);
}

init().catch((err) => {
  console.log(err);
});
