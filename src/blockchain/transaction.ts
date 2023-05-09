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

import { bytesEqual, bytesToHex, hashComputeClaim } from "./util";

export function applyTransaction(state: WorldState, txFrom: Uint8Array, tx: Transaction): void {
  const txFromHex = bytesToHex(txFrom);

  // Check sender account.
  const sender = state.accounts[txFromHex];
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
  let createdAccountAddr = undefined;

  try {
    if (tx.mint) {
      if (applyMintTokenTxn(state, txFrom, tx.mint)) {
        createdAccountAddr = tx.mint.receiver;
      }
    } else if (tx.transfer) {
      if (applyTransferTokenTxn(state, txFrom, tx.transfer)) {
        createdAccountAddr = tx.transfer.receiver;
      }
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

    // Update nonce of sender account, after txn has been successfully applied.
    const senderAfterTxn = state.accounts[txFromHex];
    state.accounts[txFromHex] = {
      ...senderAfterTxn,
      nonce: tx.nonce,
    };
  } catch (err) {
    if (createdAccountAddr) {
      const createdAccountAddrHex = bytesToHex(createdAccountAddr);
      delete state.accounts[createdAccountAddrHex];
    }
    throw err;
  }
}

export function applyMintTokenTxn(state: WorldState, txFrom: Uint8Array, tx: MintToken): boolean {
  if (!bytesEqual(txFrom, state.minter)) {
    throw new Error("only minter is allowed to mint tokens");
  }
  if (BigInt(tx.amount) <= 0n) {
    throw new Error("invalid amount of token to mint");
  }

  // Create receiver account if neccessary.
  const receiverAddrHex = bytesToHex(tx.receiver);
  let receiver = state.accounts[receiverAddrHex];
  let receiverCreated = false;
  if (!receiver) {
    state.accounts[receiverAddrHex] = createAccount(tx.receiver, 0n, 0n, 0n);
    receiver = state.accounts[receiverAddrHex];
    receiverCreated = true;
  }

  state.accounts[receiverAddrHex] = {
    ...receiver,
    balance: BigInt(receiver.balance) + BigInt(tx.amount),
  };

  return receiverCreated;
}

export function applyTransferTokenTxn(state: WorldState, txFrom: Uint8Array, tx: TransferToken): boolean {
  const senderAddrHex = bytesToHex(txFrom);
  const sender = state.accounts[senderAddrHex];

  if (!sender) {
    throw new Error("sender account does not exist");
  }
  if (bytesEqual(tx.receiver, state.minter)) {
    throw new Error("transfer to minter account is forbidden");
  }
  if (BigInt(tx.amount) <= 0n) {
    throw new Error("invalid amount of token to transfer");
  }
  if (BigInt(tx.amount) > BigInt(sender.balance)) {
    throw new Error("insufficient amount of token to transfer");
  }

  // Update sender's balance.
  state.accounts[senderAddrHex] = {
    ...sender,
    balance: BigInt(sender.balance) - BigInt(tx.amount),
  };

  // Create receiver account if necessary and update its balance;
  const receiverAddrHex = bytesToHex(tx.receiver);
  let receiverCreated = false;
  let receiver = state.accounts[receiverAddrHex];
  if (receiver) {
    state.accounts[receiverAddrHex] = {
      ...receiver,
      balance: BigInt(receiver.balance) + BigInt(tx.amount),
    };
  } else {
    state.accounts[receiverAddrHex] = createAccount(tx.receiver, tx.amount, 0n, 0n);
    receiver = state.accounts[receiverAddrHex];
    receiverCreated = true;
  }

  return receiverCreated;
}

export function applyStakeTokenTxn(state: WorldState, txFrom: Uint8Array, tx: StakeToken): void {
  const staker = state.accounts[bytesToHex(txFrom)];

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

function applyDAVerifierStakeTokenTxn(
  state: WorldState,
  stakerAddr: Uint8Array,
  staker: Account,
  amount: bigint,
): void {
  const stakerAddrHex = bytesToHex(stakerAddr);
  state.accounts[stakerAddrHex] = {
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

  if (!state.stakePool.daVerifiers.find((addr) => bytesEqual(addr, stakerAddr))) {
    state.stakePool.daVerifiers.push(stakerAddr);
  }
}

function applyStateVerifierStakeTokenTxn(
  state: WorldState,
  stakerAddr: Uint8Array,
  staker: Account,
  amount: bigint,
): void {
  const stakerAddrHex = bytesToHex(stakerAddr);
  state.accounts[stakerAddrHex] = {
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

  if (!state.stakePool.stateVerifiers.find((addr) => bytesEqual(addr, stakerAddr))) {
    state.stakePool.stateVerifiers.push(stakerAddr);
  }
}

export function applyUnstakeTokenTxn(state: WorldState, txFrom: Uint8Array, tx: UnstakeToken): void {
  const staker = state.accounts[bytesToHex(txFrom)];

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

function applyDAVerifierUnstakeTokenTxn(
  state: WorldState,
  stakerAddr: Uint8Array,
  staker: Account,
  amount: bigint,
): void {
  if (BigInt(amount) > BigInt(staker.daVerifierStake)) {
    throw new Error("insufficient amount of token to unstake");
  }

  const stakerAddrHex = bytesToHex(stakerAddr);
  state.accounts[stakerAddrHex] = {
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

  if (state.accounts[stakerAddrHex].daVerifierStake == 0n) {
    const index = state.stakePool.daVerifiers.findIndex((addr) => bytesEqual(addr, stakerAddr));
    state.stakePool.daVerifiers.splice(index, 1);
  }
}

function applyStateVerifierUnstakeTokenTxn(
  state: WorldState,
  stakerAddr: Uint8Array,
  staker: Account,
  amount: bigint,
): void {
  if (BigInt(amount) > BigInt(staker.stateVerifierStake)) {
    throw new Error("insufficient amount of token to unstake");
  }

  const stakerAddrHex = bytesToHex(stakerAddr);
  state.accounts[stakerAddrHex] = {
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

  if (state.accounts[stakerAddrHex].stateVerifierStake == 0n) {
    const index = state.stakePool.stateVerifiers.findIndex((addr) => bytesEqual(addr, stakerAddr));
    state.stakePool.stateVerifiers.splice(index, 1);
  }
}

export function applyAddComputeChainTxn(state: WorldState, txFrom: Uint8Array, txn: CreateDataChain): void {
  const claimerAddrHex = bytesToHex(txn.rootClaim.claimer);
  const rootClaimHash = hashComputeClaim(txn.rootClaim);
  const rootClaimHashHex = bytesToHex(rootClaimHash);

  if (state.accounts[claimerAddrHex] == undefined) {
    throw new Error("claimer account does not exist");
  }
  if (!bytesEqual(txFrom, txn.rootClaim.claimer)) {
    throw new Error("only claimer of root claim can create new chain");
  }
  if (state.dataChains[rootClaimHashHex] != undefined) {
    throw new Error("chain with the same root claim already exists");
  }

  const chain: DataChain = {
    claims: {},
    rootClaimHash: rootClaimHash,
    headClaimHash: rootClaimHash,
  };
  chain.claims[rootClaimHashHex] = txn.rootClaim;
  state.dataChains[rootClaimHashHex] = chain;
}

export function applyAddComputeClaimTxn(state: WorldState, txFrom: Uint8Array, txn: UpdateDataChain): void {
  const claimerAddrHex = bytesToHex(txn.claim.claimer);
  const rootClaimHashHex = bytesToHex(txn.rootClaimHash);
  const chain = state.dataChains[rootClaimHashHex];

  if (state.accounts[claimerAddrHex] == undefined) {
    throw new Error("claimer account does not exist");
  }
  if (!bytesEqual(txFrom, txn.claim.claimer)) {
    throw new Error("only claimer of claim can can add it to existing chain");
  }
  if (chain == undefined) {
    throw new Error("compute chain does not exist");
  }
  if (!bytesEqual(chain.headClaimHash, txn.claim.prevClaimHash)) {
    throw new Error("prevCID of new claim does not match CID of last claim of chain");
  }

  if (
    !chain.claims[rootClaimHashHex].dataContract.cid.equals(txn.claim.dataContract.cid) ||
    !bytesEqual(
      chain.claims[rootClaimHashHex].dataContract.cartesiMerkleRoot,
      txn.claim.dataContract.cartesiMerkleRoot,
    ) ||
    chain.claims[rootClaimHashHex].dataContract.size != txn.claim.dataContract.size
  ) {
    throw new Error("Cannot change data contract details after root claim");
  }

  const claimHash = hashComputeClaim(txn.claim);
  const claimHashHex = bytesToHex(claimHash);
  chain.claims[claimHashHex] = txn.claim;
  chain.headClaimHash = claimHash;
}

export function createAccount(
  address: Uint8Array,
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
