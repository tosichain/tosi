import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";

import {
  SignedTransaction as PBSignedTransaction,
  Transaction as PBTransaction,
  MintToken as PBMintToken,
  TransferToken as PBTransferToken,
  StakeType as PBStakeType,
  StakeToken as PBStakeToken,
  UnstakeToken as PBUnstakeToken,
  CreateDataChain as PBCreateDataChain,
  UpdateDataChain as PBUpdateDataChain,
  WorldState as PBWorldState,
  Account as PBAccount,
  StakePool as PBStakePool,
  DataChain as PBDataChain,
  ComputeClaim as PBComputeClaim,
  DAInfo as PBDAInfo,
  Block as PBBlock,
  BlockProof as PBBlockProof,
  DACheckResult as PBDACheckResult,
  ClaimDACheckResult as PBClaimDACheckResult,
  TransactionBundle as PBTransactionBundle,
  BlockMetadata as PBBlockMetadata,
} from "../proto/grpcjs/blockchain_pb";

import {
  SignedTransaction,
  Transaction,
  MintToken,
  TransferToken,
  StakeType,
  StakeToken,
  UnstakeToken,
  CreateDataChain,
  UpdateDataChain,
  WorldState,
  Account,
  StakePool,
  DataChain,
  ComputeClaim,
  DAInfo,
  Block,
  BlockProof,
  DACheckResult,
  ClaimDACheckResult,
  TransactionBundle,
  BlockMetadata,
} from "./types";
import { hashComputeClaim } from "./util";

// SignedTransaction

export function signedTransactionToPB(txn: SignedTransaction): PBSignedTransaction {
  const pb = new PBSignedTransaction();
  pb.setFrom(txn.from);
  pb.setSignature(txn.signature);
  pb.setTxn(transactionToPB(txn.txn));
  return pb;
}

export function signedTransactionFromPB(pb: PBSignedTransaction): SignedTransaction {
  if (!pb.hasTxn()) {
    throw new Error("PB SignedTransaction - missing txn");
  }
  return {
    from: pb.getFrom(),
    signature: pb.getSignature(),
    txn: transactionFromPB(pb.getTxn() as PBTransaction),
  };
}

export function serializeSignedTransaction(txn: SignedTransaction): Uint8Array {
  return signedTransactionToPB(txn).serializeBinary();
}

export function deserializeSignedTransaction(rawTxn: Uint8Array): SignedTransaction {
  const pb = PBSignedTransaction.deserializeBinary(rawTxn);
  return signedTransactionFromPB(pb);
}

// Transaction

export function transactionToPB(txn: Transaction): PBTransaction {
  const pb = new PBTransaction();
  if (txn.mint) {
    pb.setMint(mintTokenToPB(txn.mint));
  } else if (txn.transfer) {
    pb.setTransfer(transferTokenToPB(txn.transfer));
  } else if (txn.stake) {
    pb.setStake(stakeTokenToPB(txn.stake));
  } else if (txn.unstake) {
    pb.setUnstake(unstakeTokenToPB(txn.unstake));
  } else if (txn.createChain) {
    pb.setCreateChain(createDataChainToPB(txn.createChain));
  } else if (txn.updateChain) {
    pb.setUpdateChain(updateDataChainToPB(txn.updateChain));
  } else {
    throw new Error("unknown transaction type");
  }
  pb.setNonce(txn.nonce);
  return pb;
}

export function transactionFromPB(pb: PBTransaction): Transaction {
  let txn: Transaction;
  if (pb.hasMint()) {
    txn = { mint: mintTokenFromPB(pb.getMint() as PBMintToken), nonce: pb.getNonce() };
  } else if (pb.hasTransfer()) {
    txn = { transfer: transferTokenFromPB(pb.getTransfer() as PBTransferToken), nonce: pb.getNonce() };
  } else if (pb.hasStake()) {
    txn = { stake: stakeTokenFromPB(pb.getStake() as PBStakeToken), nonce: pb.getNonce() };
  } else if (pb.hasUnstake()) {
    txn = { unstake: unstakeTokenFromPB(pb.getUnstake() as PBUnstakeToken), nonce: pb.getNonce() };
  } else if (pb.hasCreateChain()) {
    txn = { createChain: createDataChainFromPB(pb.getCreateChain() as PBCreateDataChain), nonce: pb.getNonce() };
  } else if (pb.hasUpdateChain()) {
    txn = { updateChain: updateDataChainFromPB(pb.getUpdateChain() as PBUpdateDataChain), nonce: pb.getNonce() };
  } else {
    throw new Error("PB Transaction - unknown transaction type");
  }
  return txn;
}

export function serializeTransaction(txn: Transaction): Uint8Array {
  return transactionToPB(txn).serializeBinary();
}

export function deserializeTransaction(rawTxn: Uint8Array): Transaction {
  const pb = PBTransaction.deserializeBinary(rawTxn);
  return transactionFromPB(pb);
}

// MintToken

export function mintTokenToPB(txn: MintToken): PBMintToken {
  return new PBMintToken().setReceiver(txn.receiver).setAmount(String(txn.amount));
}

export function mintTokenFromPB(pb: PBMintToken): MintToken {
  return {
    receiver: pb.getReceiver(),
    amount: BigInt(pb.getAmount()),
  };
}

// TransferToken

export function transferTokenToPB(txn: TransferToken): PBTransferToken {
  return new PBTransferToken().setReceiver(txn.receiver).setAmount(String(txn.amount));
}

export function transferTokenFromPB(pb: PBTransferToken): TransferToken {
  return {
    receiver: pb.getReceiver(),
    amount: BigInt(pb.getAmount()),
  };
}

// StakeType

export function stakeTypeToPB(stakeType: StakeType): PBStakeType {
  switch (stakeType) {
    case StakeType.DAVerifier:
      return PBStakeType.DA_VERIFIER;
    case StakeType.StateVerifier:
      return PBStakeType.STATE_VERIFIER;
    default:
      throw new Error("invalid stake type");
  }
}

export function stakeTypeFromPB(pb: PBStakeType): StakeType {
  switch (pb) {
    case PBStakeType.DA_VERIFIER:
      return StakeType.DAVerifier;
    case PBStakeType.STATE_VERIFIER:
      return StakeType.StateVerifier;
    default:
      throw new Error("invalid stake type");
  }
}

// StakeToken

export function stakeTokenToPB(txn: StakeToken): PBStakeToken {
  const stakeType = stakeTypeToPB(txn.stakeType);
  return new PBStakeToken().setStakeType(stakeType).setAmount(String(txn.amount));
}

export function stakeTokenFromPB(pb: PBStakeToken): StakeToken {
  const stakeType = stakeTypeFromPB(pb.getStakeType());
  return {
    stakeType: stakeType,
    amount: BigInt(pb.getAmount()),
  };
}

// UnstakeToken

export function unstakeTokenToPB(txn: UnstakeToken): PBUnstakeToken {
  const stakeType: PBStakeType =
    txn.stakeType == StakeType.DAVerifier ? PBStakeType.DA_VERIFIER : PBStakeType.STATE_VERIFIER;
  return new PBUnstakeToken().setStakeType(stakeType).setAmount(String(txn.amount));
}

export function unstakeTokenFromPB(pb: PBUnstakeToken): UnstakeToken {
  const stakeType: StakeType =
    pb.getStakeType() == PBStakeType.DA_VERIFIER ? StakeType.DAVerifier : StakeType.StateVerifier;
  return {
    stakeType: stakeType,
    amount: BigInt(pb.getAmount()),
  };
}

// CreateDataChain

export function createDataChainToPB(txn: CreateDataChain): PBCreateDataChain {
  return new PBCreateDataChain().setRootClaim(computeClaimToPB(txn.rootClaim));
}

export function createDataChainFromPB(pb: PBCreateDataChain): CreateDataChain {
  return {
    rootClaim: computeClaimFromPB(pb.getRootClaim() as PBComputeClaim),
  };
}

// UpdateDataChain

export function updateDataChainToPB(txn: UpdateDataChain): PBUpdateDataChain {
  const claim = computeClaimToPB(txn.claim);
  return new PBUpdateDataChain().setRootClaimHash(txn.rootClaimHash).setClaim(claim);
}

export function updateDataChainFromPB(pb: PBUpdateDataChain): UpdateDataChain {
  const claim = computeClaimFromPB(pb.getClaim() as PBComputeClaim);
  return {
    rootClaimHash: pb.getRootClaimHash(),
    claim: claim,
  };
}

// World state

export function worldStateToPB(state: WorldState): PBWorldState {
  const accounts = Object.values(state.accounts).map((account) => accountToPB(account));
  const stakePool = stakePoolToPB(state.stakePool);
  const chains = Object.values(state.dataChains).map((chain) => dataChainToPB(chain));
  return new PBWorldState()
    .setAccountsList(accounts)
    .setStakePool(stakePool)
    .setMinter(state.minter)
    .setDataChainsList(chains);
}

export function worldStateFromPB(pb: PBWorldState): WorldState {
  const accounts: Record<string, Account> = {};
  for (const account of pb.getAccountsList()) {
    accounts[account.getAddress()] = accountFromPB(account);
  }
  const chains: Record<string, DataChain> = {};
  for (const chain of pb.getDataChainsList()) {
    chains[chain.getRootClaimHash()] = dataChainFromPB(chain);
  }
  return {
    accounts: accounts,
    stakePool: stakePoolFromPB(pb.getStakePool() as PBStakePool),
    minter: pb.getMinter(),
    dataChains: chains,
  };
}

export function serializeWorldState(state: WorldState): Uint8Array {
  return worldStateToPB(state).serializeBinary();
}

export function deserializeWorldState(rawState: Uint8Array): WorldState {
  const pb = PBWorldState.deserializeBinary(rawState);
  return worldStateFromPB(pb);
}

// Account

export function accountToPB(account: Account): PBAccount {
  return new PBAccount()
    .setAddress(account.address)
    .setNonce(account.nonce)
    .setBalance(String(account.balance))
    .setDaVerifierStake(String(account.daVerifierStake))
    .setStateVerifierStake(String(account.stateVerifierStake));
}

export function accountFromPB(pb: PBAccount): Account {
  return {
    address: pb.getAddress(),
    nonce: pb.getNonce(),
    balance: BigInt(pb.getBalance()),
    daVerifierStake: BigInt(pb.getDaVerifierStake()),
    stateVerifierStake: BigInt(pb.getStateVerifierStake()),
  };
}

export function serializeAccount(account: Account): Uint8Array {
  return accountToPB(account).serializeBinary();
}

export function deserializeAccount(rawAccount: Uint8Array): Account {
  const pb = PBAccount.deserializeBinary(rawAccount);
  return accountFromPB(pb);
}

// StakePool

export function stakePoolToPB(pool: StakePool): PBStakePool {
  return new PBStakePool()
    .setDaVerifierPool(String(pool.daVerifierPool))
    .setDaVerifiersList(pool.daVerifiers)
    .setStateVerifierPool(String(pool.stateVerifierPool))
    .setStateVerifiersList(pool.stateVerifiers);
}

export function stakePoolFromPB(pb: PBStakePool): StakePool {
  return {
    daVerifierPool: BigInt(pb.getDaVerifierPool()),
    daVerifiers: pb.getDaVerifiersList(),
    stateVerifierPool: BigInt(pb.getStateVerifierPool()),
    stateVerifiers: pb.getStateVerifiersList(),
  };
}

// DataChain

export function dataChainToPB(chain: DataChain): PBDataChain {
  const claims = Object.values(chain.claims).map((claim) => computeClaimToPB(claim));
  return new PBDataChain()
    .setClaimsList(claims)
    .setRootClaimHash(chain.rootClaimHash)
    .setHeadClaimHash(chain.headClaimHash);
}

export function dataChainFromPB(pb: PBDataChain): DataChain {
  const claims: Record<string, ComputeClaim> = {};
  for (const pbClaim of pb.getClaimsList()) {
    const claim = computeClaimFromPB(pbClaim);
    claims[hashComputeClaim(claim)] = claim;
  }
  return {
    claims: claims,
    rootClaimHash: pb.getRootClaimHash(),
    headClaimHash: pb.getHeadClaimHash(),
  };
}

// ComputeClaim

export function computeClaimToPB(claim: ComputeClaim): PBComputeClaim {
  const daInfo = claim.daInfo.map((info) => daInfoToPB(info));
  return new PBComputeClaim()
    .setClaimer(claim.claimer)
    .setPrevClaimHash(claim.prevClaimHash)
    .setCourtCid(claim.courtCID)
    .setAppCid(claim.appCID)
    .setInputCid(claim.inputCID)
    .setOutputCid(claim.outputCID)
    .setDaInfoList(daInfo)
    .setReturnCode(claim.returnCode)
    .setMaxCartesiCycles(String(claim.maxCartesiCycles));
}

export function computeClaimFromPB(pb: PBComputeClaim): ComputeClaim {
  const daInfo = pb.getDaInfoList().map((info) => daInfoFromPB(info));
  return {
    claimer: pb.getClaimer(),
    prevClaimHash: pb.getPrevClaimHash(),
    courtCID: pb.getCourtCid(),
    appCID: pb.getAppCid(),
    inputCID: pb.getInputCid(),
    outputCID: pb.getOutputCid(),
    daInfo: daInfo,
    returnCode: pb.getReturnCode(),
    maxCartesiCycles: BigInt(pb.getMaxCartesiCycles()),
  };
}

export function serializeComputeClaim(claim: ComputeClaim): Uint8Array {
  return computeClaimToPB(claim).serializeBinary();
}

export function deserializeComputeClaim(rawClaim: Uint8Array): ComputeClaim {
  const pb = PBComputeClaim.deserializeBinary(rawClaim);
  return computeClaimFromPB(pb);
}

// DAInfo

export function daInfoToPB(info: DAInfo): PBDAInfo {
  return new PBDAInfo()
    .setName(info.name)
    .setSize(info.size)
    .setLog2(info.log2)
    .setKeccak256(info.keccak256)
    .setCartesiMerkleRoot(info.cartesiMerkleRoot);
}

export function daInfoFromPB(pb: PBDAInfo): DAInfo {
  return {
    name: pb.getName(),
    size: pb.getSize(),
    log2: pb.getLog2(),
    keccak256: pb.getKeccak256(),
    cartesiMerkleRoot: pb.getCartesiMerkleRoot(),
  };
}

// Block

export function blockToPB(block: Block): PBBlock {
  const prevBlockHash = Uint8Array.from(Buffer.from(block.prevBlockHash, "hex"));
  const accountsMerkle = block.accountsMerkle.getLeaves().map((b: Iterable<number>) => new Uint8Array(b));
  const txns = block.transactions.map((txn) => signedTransactionToPB(txn));
  const proof = blockProofToPB(block.proof);
  return new PBBlock()
    .setVersion(block.version)
    .setPrevBlockHash(prevBlockHash)
    .setAccountsMerkleList(accountsMerkle)
    .setTransactionsList(txns)
    .setProof(proof)
    .setTime(block.time);
}

export function blockFromPB(pb: PBBlock): Block {
  const prevBlockHash = Buffer.from(pb.getPrevBlockHash()).toString("hex");
  const accountsMerkle = new MerkleTree(pb.getAccountsMerkleList(), keccak256, { sort: true });
  const txns = pb.getTransactionsList().map((txn) => signedTransactionFromPB(txn));
  const proof = blockProofFromPB(pb.getProof() as PBBlockProof);
  return {
    version: pb.getVersion(),
    prevBlockHash: prevBlockHash,
    accountsMerkle: accountsMerkle,
    transactions: txns,
    proof: proof,
    time: pb.getTime(),
  };
}

export function serializeBlock(block: Block): Uint8Array {
  return blockToPB(block).serializeBinary();
}

export function deserializeBlock(rawBlock: Uint8Array): Block {
  const pb = PBBlock.deserializeBinary(rawBlock);
  return blockFromPB(pb);
}

// BlockProof

export function blockProofToPB(proof: BlockProof): PBBlockProof {
  const daCheckResults = proof.DACheckResults.map((result) => daCheckResultToPB(result));
  return new PBBlockProof()
    .setTxnBundleHash(proof.txnBundleHash)
    .setTxnBundleProposer(proof.txnBundleProposer)
    .setRandomnessProof(proof.randomnessProof)
    .setDaCheckResultsList(daCheckResults)
    .setAggDaCheckResultSignature(proof.aggDACheckResultSignature);
}

export function blockProofFromPB(pb: PBBlockProof): BlockProof {
  const daCheckResults = pb.getDaCheckResultsList().map((result) => daCheckResultFromPB(result));
  return {
    txnBundleHash: pb.getTxnBundleHash(),
    txnBundleProposer: pb.getTxnBundleProposer(),
    randomnessProof: pb.getRandomnessProof() as Uint8Array,
    DACheckResults: daCheckResults,
    aggDACheckResultSignature: pb.getAggDaCheckResultSignature() as Uint8Array,
  };
}

// DACheckResult

export function daCheckResultToPB(result: DACheckResult): PBDACheckResult {
  const claimResults = result.claims.map((result) => claimDACheckResultToPB(result));
  return new PBDACheckResult()
    .setTxnBundleHash(result.txnBundleHash)
    .setRandomnessProof(result.randomnessProof)
    .setSignature(result.signature)
    .setSigner(result.signer)
    .setClaimsList(claimResults);
}

export function daCheckResultFromPB(pb: PBDACheckResult): DACheckResult {
  const claimResults = pb.getClaimsList().map((result) => claimDACheckResultFromPB(result));
  return {
    txnBundleHash: pb.getTxnBundleHash(),
    randomnessProof: pb.getRandomnessProof() as Uint8Array,
    signature: pb.getSignature() as Uint8Array,
    signer: pb.getSigner(),
    claims: claimResults,
  };
}

// ClaimDACheckResult

export function claimDACheckResultToPB(result: ClaimDACheckResult): PBClaimDACheckResult {
  return new PBClaimDACheckResult().setClaimHash(result.claimHash).setDataAvailable(result.dataAvailable);
}

export function claimDACheckResultFromPB(pb: PBClaimDACheckResult): ClaimDACheckResult {
  return {
    claimHash: pb.getClaimHash(),
    dataAvailable: pb.getDataAvailable(),
  };
}

export function serializeClaimDACheckResult(result: ClaimDACheckResult): Uint8Array {
  return claimDACheckResultToPB(result).serializeBinary();
}

export function deserializeClaimDACheckResult(rawResult: Uint8Array): ClaimDACheckResult {
  const pb = PBClaimDACheckResult.deserializeBinary(rawResult);
  return claimDACheckResultFromPB(pb);
}

// TransactionBundle

export function transactionBundleToPB(bundle: TransactionBundle): PBTransactionBundle {
  const txns = bundle.transactions.map((txn) => signedTransactionToPB(txn));
  return new PBTransactionBundle().setHeadBlockHash(bundle.headBlockHash).setTransactionsList(txns);
}

export function transactionBundleFromPB(pb: PBTransactionBundle): TransactionBundle {
  const txns = pb.getTransactionsList().map((txn) => signedTransactionFromPB(txn));
  return {
    headBlockHash: pb.getHeadBlockHash(),
    transactions: txns,
  };
}

export function serializeTransactionBundle(bundle: TransactionBundle): Uint8Array {
  return transactionBundleToPB(bundle).serializeBinary();
}

export function deserializeTransactionBundle(rawBundle: Uint8Array): TransactionBundle {
  const pb = PBTransactionBundle.deserializeBinary(rawBundle);
  return transactionBundleFromPB(pb);
}

// BlockMetadata

export function blockMetadataToPB(meta: BlockMetadata): PBBlockMetadata {
  return new PBBlockMetadata().setCid(meta.CID);
}

export function blockMetadataFromPB(pb: PBBlockMetadata): BlockMetadata {
  return {
    CID: pb.getCid(),
  };
}

export function serializeBlockMetadata(meta: BlockMetadata): Uint8Array {
  return blockMetadataToPB(meta).serializeBinary();
}

export function deserializeBlockMetadata(rawMeta: Uint8Array): BlockMetadata {
  const pb = PBBlockMetadata.deserializeBinary(rawMeta);
  return blockMetadataFromPB(pb);
}
