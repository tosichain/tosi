import { Transaction } from "../../blockchain/types";
import { bytesFromHex } from "../../blockchain/util";
import { signTransaction } from "../../blockchain/block";
import { CoordinatorRPC } from "../../coordinator/src/rpc";

async function init() {
  // Get the minter private key from the environment variable.
  const sendPrivKey = bytesFromHex(process.env.SENDER_PRIV_KEY as string);
  if (!sendPrivKey) {
    console.error("SENDER_PRIV_KEY environment variable is not set.");
    process.exit(1);
  }

  const coordinatorTLS = process.env.COORDINATOR_TLS ? true : false;

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
    console.error("Nonce not provided");
    process.exit(1);
  }
  const nonce = Number(nonceStr);

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
  const coordinator = new CoordinatorRPC({
    serverAddr: coordinatorRPCServerAddr,
    tls: coordinatorTLS,
  });
  await coordinator.submitSignedTransaction(signature);
}

init().catch((err) => {
  console.log(err);
});
