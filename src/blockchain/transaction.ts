import {
  Transaction,
  MintToken,
  TransferToken,
  StakeToken,
  UnstakeToken,
  CreateDataChain,
  UpdateDataChain,
  Account,
  DataChain,
  WorldState,
  StakeType,
} from "./types";

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
    } else if (tx.createChain) {
      applyAddComputeChainTxn(state, txFrom, tx.createChain);
    } else if (tx.updateChain) {
      applyAddComputeClaimTxn(state, txFrom, tx.updateChain);
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
    state.accounts[tx.receiver] = createAccount(tx.receiver, 0n, 0n, 0n);
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

  if (BigInt(tx.amount) <= 0n) {
    throw new Error("invalid amount of token to stake");
  }
  if (BigInt(tx.amount) > BigInt(staker.balance)) {
    throw new Error("insufficient amount of tokens to stake");
  }

  if (tx.stakeType == StakeType.DAVerifier) {
    applyDAVerifierStakeTokenTxn(state, txFrom, staker, tx.amount);
  } else if (tx.stakeType == StakeType.StateVerifier) {
    applyStateVerifierStakeTokenTxn(state, txFrom, staker, tx.amount);
  } else {
    throw new Error("invalid stake type");
  }
}

function applyDAVerifierStakeTokenTxn(state: WorldState, stakerAddr: string, staker: Account, amount: bigint): void {
  state.accounts[stakerAddr] = {
    ...staker,
    balance: BigInt(staker.balance) - BigInt(amount),
    daVerifierStake: BigInt(staker.daVerifierStake) + BigInt(amount),
  };
  state = {
    ...state,
    stakePool: {
      ...state.stakePool,
      daVerifierPool: BigInt(state.stakePool.daVerifierPool) + BigInt(amount),
    },
  };

  if (!state.stakePool.daVerifiers.find((addr) => addr == stakerAddr)) {
    state.stakePool.daVerifiers.push(stakerAddr);
  }
}

function applyStateVerifierStakeTokenTxn(state: WorldState, stakerAddr: string, staker: Account, amount: bigint): void {
  state.accounts[stakerAddr] = {
    ...staker,
    balance: BigInt(staker.balance) - BigInt(amount),
    stateVerifierStake: BigInt(staker.stateVerifierStake) + BigInt(amount),
  };
  state = {
    ...state,
    stakePool: {
      ...state.stakePool,
      stateVerifierPool: BigInt(state.stakePool.stateVerifierPool) + BigInt(amount),
    },
  };

  if (!state.stakePool.stateVerifiers.find((addr) => addr == stakerAddr)) {
    state.stakePool.stateVerifiers.push(stakerAddr);
  }
}

export function applyUnstakeTokenTxn(state: WorldState, txFrom: string, tx: UnstakeToken): void {
  const staker = state.accounts[txFrom];

  if (BigInt(tx.amount) <= 0n) {
    throw new Error("invalid amount of token to unstake");
  }

  if (tx.stakeType == StakeType.DAVerifier) {
    applyDAVerifierUnstakeTokenTxn(state, txFrom, staker, tx.amount);
  } else if (tx.stakeType == StakeType.StateVerifier) {
    applyStateVerifierUnstakeTokenTxn(state, txFrom, staker, tx.amount);
  } else {
    throw new Error("invalid stake type");
  }
}

function applyDAVerifierUnstakeTokenTxn(state: WorldState, stakerAddr: string, staker: Account, amount: bigint): void {
  if (BigInt(amount) > BigInt(staker.daVerifierStake)) {
    throw new Error("insufficient amount of token to unstake");
  }

  state.accounts[stakerAddr] = {
    ...staker,
    balance: BigInt(staker.balance) + BigInt(amount),
    daVerifierStake: BigInt(staker.daVerifierStake) - BigInt(amount),
  };
  state = {
    ...state,
    stakePool: {
      ...state.stakePool,
      daVerifierPool: BigInt(state.stakePool.daVerifierPool) - BigInt(amount),
    },
  };

  if (state.accounts[stakerAddr].daVerifierStake == 0n) {
    const index = state.stakePool.daVerifiers.findIndex((addr) => addr == stakerAddr);
    state.stakePool.daVerifiers.splice(index, 1);
  }
}

function applyStateVerifierUnstakeTokenTxn(
  state: WorldState,
  stakerAddr: string,
  staker: Account,
  amount: bigint,
): void {
  if (BigInt(amount) > BigInt(staker.stateVerifierStake)) {
    throw new Error("insufficient amount of token to unstake");
  }

  state.accounts[stakerAddr] = {
    ...staker,
    balance: BigInt(staker.balance) + BigInt(amount),
    stateVerifierStake: BigInt(staker.stateVerifierStake) - BigInt(amount),
  };
  state = {
    ...state,
    stakePool: {
      ...state.stakePool,
      stateVerifierPool: BigInt(state.stakePool.stateVerifierPool) - BigInt(amount),
    },
  };

  if (state.accounts[stakerAddr].stateVerifierStake == 0n) {
    const index = state.stakePool.stateVerifiers.findIndex((addr) => addr == stakerAddr);
    state.stakePool.stateVerifiers.splice(index, 1);
  }
}

export function applyAddComputeChainTxn(state: WorldState, txFrom: string, txn: CreateDataChain): void {
  const claimer = txn.rootClaim.claimer;
  const rootClaimHash = hashComputeClaim(txn.rootClaim);

  if (state.accounts[claimer] == undefined) {
    throw new Error("claimer account does not exist");
  }
  if (txFrom != txn.rootClaim.claimer) {
    throw new Error("only claimer of root claim can create new chain");
  }
  if (state.dataChains[rootClaimHash] != undefined) {
    throw new Error("chain with the same root claim already exists");
  }

  const chain: DataChain = {
    claims: {},
    rootClaimHash: rootClaimHash,
    headClaimHash: rootClaimHash,
  };
  chain.claims[rootClaimHash] = txn.rootClaim;
  state.dataChains[rootClaimHash] = chain;
}

export function applyAddComputeClaimTxn(state: WorldState, txFrom: string, txn: UpdateDataChain): void {
  const claimer = txn.claim.claimer;
  const chain = state.dataChains[txn.rootClaimHash];

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

  if (
    chain.claims[txn.rootClaimHash].dataContract.cid !== txn.claim.dataContract.cid ||
    chain.claims[txn.rootClaimHash].dataContract.cartesiMerkleRoot !== txn.claim.dataContract.cartesiMerkleRoot ||
    chain.claims[txn.rootClaimHash].dataContract.size !== txn.claim.dataContract.size
  ) {
    throw new Error("Cannot change data contract details after root claim");
  }

  const claimHash = hashComputeClaim(txn.claim);
  chain.claims[claimHash] = txn.claim;
  chain.headClaimHash = claimHash;
}

export function createAccount(
  address: string,
  balance: bigint,
  daVerifierStake: bigint,
  stateVerifierStake: bigint,
): Account {
  const acc: Account = {
    address: address,
    nonce: -1,
    balance: balance,
    daVerifierStake: daVerifierStake,
    stateVerifierStake: stateVerifierStake,
  };
  return acc;
}
