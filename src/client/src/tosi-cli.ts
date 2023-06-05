import { Command } from "commander";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { CoordinatorRPC } from "../../coordinator/src/rpc";
import { ClientRPC } from "../../client/src/rpc";
import { bytesFromHex } from "../../blockchain/util";
import { signTransaction } from "../../blockchain/block";
import { Transaction, StakeType as ProtoStakeType, CreateDataChain, UpdateDataChain } from "../../blockchain/types";
import { CID } from "ipfs-http-client";

dotenv.config();

const program = new Command();
const coordinator = new CoordinatorRPC({
  serverAddr: process.env.COORDINATOR_RPC_SERVER_ADDR || "coordinator.dev.zippie.com:443",
  tls: process.env.COORDINATOR_TLS ? true : false,
});
const client = new ClientRPC({
  serverAddr: process.env.CLIENT_RPC_SERVER_ADDR || "127.0.0.1:30001",
});

program
  .command("transfer <from> <to> <amount> <nonce>")
  .description("Transfer TOSI tokens between accounts")
  .action(async (from: string, to: string, amount: string, nonce: string) => {
    try {
      // Create the transaction
      const txn: Transaction = {
        transfer: {
          receiver: bytesFromHex(to),
          amount: BigInt(amount),
        },
        nonce: parseInt(nonce, 10),
      };

      // check SENDER_PRIV_KEY is provided
      if (process.env.SENDER_PRIV_KEY) {
        const signedTxn = await signTransaction(txn, bytesFromHex(process.env.SENDER_PRIV_KEY as string));
        await coordinator.submitSignedTransaction(signedTxn);
      } else {
        console.log("Signing using local node");

        // submit the unsigned transaction using the client
        await client.submitTransaction(txn);
      }

      console.log("Transaction submitted successfully");
    } catch (error) {
      console.error(`Error during transfer: ${error}`);
    }
  });

program
  .command("status")
  .description("Get status of the node")
  .action(async () => {
    try {
      // Health of the node
      const isHealthy = await client.getHealth();
      console.log(`Node Health: ${isHealthy ? "Healthy" : "Unhealthy"}`);

      // Head block hash
      const headBlockHash = await client.getHeadBlockHash();
      console.log(`Head Block Hash: ${Buffer.from(headBlockHash).toString("hex")}`);

      // BLS public key
      const blsPublicKey = await client.getBLSPublicKey();
      console.log(`BLS Public Key: ${Buffer.from(blsPublicKey).toString("hex")}`);

      // Sync status
      const isSynced = await client.getSyncStatus();
      console.log(`Node Sync Status: ${isSynced ? "Synced" : "Not Synced"}`);
    } catch (err) {
      console.error(`Error fetching node status: ${err}`);
    }
  });

program
  .command("balance <address>")
  .description("Get balance of an account")
  .action(async (address: string) => {
    try {
      // Get the account information
      const account = await coordinator.getAccount(bytesFromHex(address));

      if (account) {
        console.log(`The balance of the account ${address} is ${account.balance.toString()}`);
        console.log(`The DA verifier stake of the account ${address} is ${account.daVerifierStake.toString()}`);
        console.log(`The state verifier stake of the account ${address} is ${account.stateVerifierStake.toString()}`);
      } else {
        console.log(`The account ${address} does not exist on the blockchain network.`);
      }
    } catch (error) {
      console.error(`Error during balance fetch: ${error}`);
    }
  });

program
  .command("stake <stakeType> <amount> <nonce>")
  .description("Stake TOSI tokens")
  .action(async (stakeType: keyof typeof ProtoStakeType, amount: string, nonce: string) => {
    try {
      const stakeTypeProto = ProtoStakeType[stakeType as keyof typeof ProtoStakeType];

      const txn: Transaction = {
        stake: {
          stakeType: stakeTypeProto,
          amount: BigInt(amount),
        },
        nonce: parseInt(nonce, 10),
      };

      if (process.env.SENDER_PRIV_KEY) {
        const signedTxn = await signTransaction(txn, bytesFromHex(process.env.SENDER_PRIV_KEY as string));
        await coordinator.submitSignedTransaction(signedTxn);
      } else {
        console.log("Signing using local node");

        // submit the unsigned transaction using the client
        await client.submitTransaction(txn);
      }

      console.log("Staking transaction submitted successfully");
    } catch (error) {
      console.error(`Error during staking: ${error}`);
    }
  });

program
  .command("unstake <stakeType> <amount> <nonce>")
  .description("Unstake TOSI tokens")
  .action(async (stakeType: keyof typeof ProtoStakeType, amount: string, nonce: string) => {
    try {
      const stakeTypeProto = ProtoStakeType[stakeType as keyof typeof ProtoStakeType];

      const txn: Transaction = {
        unstake: {
          stakeType: stakeTypeProto,
          amount: BigInt(amount),
        },
        nonce: parseInt(nonce, 10),
      };

      if (process.env.SENDER_PRIV_KEY) {
        const signedTxn = await signTransaction(txn, bytesFromHex(process.env.SENDER_PRIV_KEY as string));
        await coordinator.submitSignedTransaction(signedTxn);
      } else {
        console.log("Signing using local node");

        await client.submitTransaction(txn);
      }

      console.log("Unstaking transaction submitted successfully");
    } catch (error) {
      console.error(`Error during unstaking: ${error}`);
    }
  });

  
program
.command("create-datachain <file>")
.description("Submit a creation of a data chain")
.action(async (file: string, nonce: string) => {
  try {
    const filename = file == "-" ? "/dev/stdin" : file;
    // read file content
    const fileContents = fs.readFileSync(filename, "utf-8")
    const data = JSON.parse(fileContents);
    const createDataChain: CreateDataChain & { nonce: number } = {
      rootClaim: {
        claimer: bytesFromHex(data.root_claim.claimer),
        prevClaimHash: bytesFromHex(data.root_claim.prev_claim_hash),
        dataContract: {
          cid: CID.parse(data.root_claim.data_contract.cid),
          size: Number(data.root_claim.data_contract.size),
          cartesiMerkleRoot: bytesFromHex(data.root_claim.data_contract.cartesiMerkleRoot),
        },
        input: {
          cid: CID.parse(data.root_claim.input.cid),
          size: Number(data.root_claim.input.size),
          cartesiMerkleRoot: bytesFromHex(data.root_claim.input.cartesiMerkleRoot),
        },
        output: {
          cid: CID.parse(data.root_claim.output.cid),
          size: Number(data.root_claim.output.size),
          cartesiMerkleRoot: bytesFromHex(data.root_claim.output.cartesiMerkleRoot),
        },
        maxCartesiCycles: BigInt(data.root_claim.max_cartesi_cycles),
        outputFileHash: bytesFromHex(data.root_claim.output_file_hash),
      },
      nonce: parseInt(nonce, 10),
    };

    // check SENDER_PRIV_KEY is provided
    if (process.env.SENDER_PRIV_KEY) {
      const signedTxn = await signTransaction(createDataChain, bytesFromHex(process.env.SENDER_PRIV_KEY as string));
      await coordinator.submitSignedTransaction(signedTxn);
    } else {
      console.log("Signing using local node");

      // submit the unsigned transaction using the client
      await client.submitTransaction(createDataChain);
    }

    console.log("Creation of data chain submitted successfully");
  } catch (error) {
    console.error(`Error during creation of data chain: ${error}`);
  }
});

program
.command("update-datachain <file>")
.description("Submit an update to a data chain")
.action(async (file: string, nonce: string) => {
  try {
    const filename = file === "-" ? "/dev/stdin" : file;
    const fileContents = fs.readFileSync(filename, "utf-8");
    const data = JSON.parse(fileContents);
    const updateDataChain: UpdateDataChain & { nonce: number } = {
      rootClaimHash: bytesFromHex(data.root_claim_hash),
      claim: {
        claimer: bytesFromHex(data.claim.claimer),
        prevClaimHash: bytesFromHex(data.claim.prev_claim_hash),
        dataContract: {
          cid: CID.parse(data.claim.data_contract.cid),
          size: Number(data.claim.data_contract.size),
          cartesiMerkleRoot: bytesFromHex(data.claim.data_contract.cartesiMerkleRoot),
        },
        input: {
          cid: CID.parse(data.claim.input.cid),
          size: Number(data.claim.input.size),
          cartesiMerkleRoot: bytesFromHex(data.claim.input.cartesiMerkleRoot),
        },
        output: {
          cid: CID.parse(data.claim.output.cid),
          size: Number(data.claim.output.size),
          cartesiMerkleRoot: bytesFromHex(data.claim.output.cartesiMerkleRoot),
        },
        maxCartesiCycles: BigInt(data.claim.max_cartesi_cycles),
        outputFileHash: bytesFromHex(data.claim.output_file_hash),
      },
      nonce: parseInt(nonce, 10),
    };

    // check SENDER_PRIV_KEY is provided
    if (process.env.SENDER_PRIV_KEY) {
      const signedTxn = await signTransaction(updateDataChain, bytesFromHex(process.env.SENDER_PRIV_KEY as string));
      await coordinator.submitSignedTransaction(signedTxn);
    } else {
      console.log("Signing using local node");

      // submit the unsigned transaction using the client
      await client.submitTransaction(updateDataChain);
    }

    console.log("Update to data chain submitted successfully");
  } catch (error) {
    console.error(`Error during update to data chain: ${error}`);
  }
});
program.parse(process.argv);
