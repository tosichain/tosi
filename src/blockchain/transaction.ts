import {
  Transaction,
  MintToken,
  TransferToken,
  StakeToken,
  UnstakeToken,
  AddComputeChain,
  AddComputeClaim,
  Account,
  ComputeChain,
  WorldState,
} from "./types";

import { serializeComputeClaim } from "./serde";
import { hashComputeClaim } from "./util";

export function applyTransaction(state: WorldState, txFrom: string, tx: Transaction): void {
  // Check sender account.
  const sender = state.accounts[txFrom];
  if (!sender) {
    throw new Error("sender account does not exist");
  }

  // Sanity checks of nonce for sender account.
  if (sender) {
    // XXX this <= seems weird
    if (tx.nonce <= sender.nonce) {
      throw new Error("transaction is obsolete");
    }
    if (tx.nonce != (sender ? sender.nonce + 1 : 0)) {
      throw new Error("transaction is not parsable");
    }
  }

  // MintToken can create receiver account.
  let createdAccount = undefined;

  try {
    if (tx.mint) {
      if (applyMintTokenTxn(state, txFrom, tx.mint)) {
        createdAccount = tx.mint.receiver;
      }
    } else if (tx.transfer) {
      applyTransferTokenTxn(state, txFrom, tx.transfer);
    } else if (tx.stake) {
      applyStakeTokenTxn(state, txFrom, tx.stake);
    } else if (tx.unstake) {
      applyUnstakeTokenTxn(state, txFrom, tx.unstake);
    } else if (tx.addChain) {
      applyAddComputeChainTxn(state, txFrom, tx.addChain);
    } else if (tx.addClaim) {
      applyAddComputeClaimTxn(state, txFrom, tx.addClaim);
    } else {
      throw new Error("unknown transaction type");
    }

    // Update nonce of sender account, after tsn has been successfully applied.
    const senderAfterTxn = state.accounts[txFrom];
    state.accounts[txFrom] = {
      ...senderAfterTxn,
      nonce: tx.nonce,
    };
  } catch (err) {
    if (createdAccount) {
      delete state.accounts[createdAccount];
    }
    throw err;
  }
}

export function applyMintTokenTxn(state: WorldState, txFrom: string, tx: MintToken): boolean {
  if (txFrom != state.minter) {
    throw new Error("only minter is allowed to mint tokens");
  }
  if (BigInt(tx.amount) <= 0n) {
    throw new Error("invalid amount of token to mint");
  }

  // Create receiver account if neccessary.
  let receiver = state.accounts[tx.receiver];
  let receiverCreated = false;
  if (!receiver) {
    state.accounts[tx.receiver] = createAccount(0n, 0n);
    receiver = state.accounts[tx.receiver];
    receiverCreated = true;
  }

  state.accounts[tx.receiver] = {
    ...receiver,
    balance: BigInt(receiver.balance) + BigInt(tx.amount),
  };

  return receiverCreated;
}

export function applyTransferTokenTxn(state: WorldState, txFrom: string, tx: TransferToken): void {
  const sender = state.accounts[txFrom];
  const receiver = state.accounts[tx.receiver];

  if (!receiver) {
    throw new Error("receiver account does not exist");
  }
  if (tx.receiver == state.stakePool) {
    throw new Error("transfer to stake pool account is forbidden");
  }
  if (tx.receiver == state.minter) {
    throw new Error("transfer to minter account is forbidden");
  }
  if (BigInt(tx.amount) <= 0n) {
    throw new Error("invalid amount of token to transfer");
  }
  if (BigInt(tx.amount) > BigInt(sender.balance)) {
    throw new Error("insufficient amount of token to transfer");
  }

  state.accounts[txFrom] = {
    ...sender,
    balance: BigInt(sender.balance) - BigInt(tx.amount),
  };
  state.accounts[tx.receiver] = {
    ...receiver,
    balance: BigInt(receiver.balance) + BigInt(tx.amount),
  };
}

export function applyStakeTokenTxn(state: WorldState, txFrom: string, tx: StakeToken): void {
  const staker = state.accounts[txFrom];
  const pool = state.accounts[state.stakePool];

  if (!pool) {
    throw new Error("stake pool account does not exist");
  }
  if (txFrom == state.stakePool) {
    throw new Error("stake pool account can not stake token");
  }
  if (BigInt(tx.amount) <= 0n) {
    throw new Error("invalid amount of token to stake");
  }
  if (BigInt(tx.amount) > BigInt(staker.balance)) {
    throw new Error("insufficient amount of tokens to stake");
  }

  state.accounts[txFrom] = {
    ...staker,
    balance: BigInt(staker.balance) - BigInt(tx.amount),
    stake: BigInt(staker.stake) + BigInt(tx.amount),
  };
  state.accounts[state.stakePool] = {
    ...pool,
    balance: BigInt(pool.balance) + BigInt(tx.amount),
  };

  if (!state.stakers.find((addr) => addr == txFrom)) {
    state.stakers.push(txFrom);
  }
}

export function applyUnstakeTokenTxn(state: WorldState, txFrom: string, tx: UnstakeToken): void {
  const staker = state.accounts[txFrom];
  const pool = state.accounts[state.stakePool];

  if (!pool) {
    throw new Error("stake pool account does not exist");
  }
  if (txFrom == state.stakePool) {
    throw new Error("stake pool account can not stake token");
  }
  if (BigInt(tx.amount) <= 0n) {
    throw new Error("invalid amount of token to unstake");
  }
  if (BigInt(tx.amount) > BigInt(staker.stake)) {
    throw new Error("insufficient amount of token to unstake");
  }

  state.accounts[txFrom] = {
    ...staker,
    balance: BigInt(staker.balance) + BigInt(tx.amount),
    stake: BigInt(staker.stake) - BigInt(tx.amount),
  };
  state.accounts[state.stakePool] = {
    ...pool,
    balance: BigInt(pool.balance) - BigInt(tx.amount),
  };

  if (state.accounts[txFrom].stake == 0n) {
    const index = state.stakers.findIndex((addr) => addr == txFrom);
    state.stakers.splice(index, 1);
  }
}

export function applyAddComputeChainTxn(state: WorldState, txFrom: string, txn: AddComputeChain): void {
  const claimer = txn.rootClaim.claimer;
  const rootClaimHash = hashComputeClaim(txn.rootClaim);

  if (state.accounts[claimer] == undefined) {
    throw new Error("claimer account does not exist");
  }
  if (txFrom != txn.rootClaim.claimer) {
    throw new Error("only claimer of root claim can create new chain");
  }
  if (state.computeChains[rootClaimHash] != undefined) {
    throw new Error("chain with the same root claim already exists");
  }

  const chain: ComputeChain = {
    claims: {},
    rootClaimHash: rootClaimHash,
    headClaimHash: rootClaimHash,
  };
  chain.claims[rootClaimHash] = txn.rootClaim;
  state.computeChains[rootClaimHash] = chain;
}

export function applyAddComputeClaimTxn(state: WorldState, txFrom: string, txn: AddComputeClaim): void {
  const claimer = txn.claim.claimer;
  const chain = state.computeChains[txn.rootClaimHash];

  if (state.accounts[claimer] == undefined) {
    throw new Error("claimer account does not exist");
  }
  if (txFrom != txn.claim.claimer) {
    throw new Error("only claimer of claim can can add it to existing chain");
  }
  if (chain == undefined) {
    throw new Error("compute chain does not exist");
  }
  if (chain.headClaimHash != txn.claim.prevClaimHash) {
    throw new Error("prevCID of new claim does not match CID of last claim of chain");
  }

  const claimHash = hashComputeClaim(txn.claim);
  chain.claims[claimHash] = txn.claim;
  chain.headClaimHash = claimHash;
}

export function createAccount(balance: bigint, stake: bigint): Account {
  const acc: Account = {
    nonce: -1,
    balance: balance,
    stake: stake,
  };
  return acc;
}
