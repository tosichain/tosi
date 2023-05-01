import crypto from "crypto";
import * as BLS from "@noble/bls12-381";

import { encodeCBOR } from "../util";

import {
  Block,
  DACheckResult,
  ClaimDACheckResult,
  StakeType,
  ClaimStateCheckResult,
  StateCheckResult,
  DrandBeaconInfo,
} from "./types";
import { serializeClaimDACheckResult, serializeClaimStateCheckResult } from "./serde";
import { bytesEqual } from "./util";
import { BlockchainStorage } from "./storage";
import { getSeedFromBlockRandomnessProof, verifyBlockRandomnessProof } from "./block_randomness";
import { getVerificationCommitteeSample } from "./block_commitee";

export async function verifyBlockProof(
  block: Block,
  blockchain: BlockchainStorage,
  daCommitteeSampleSzie: number,
  stateCommitteeSampleSzie: number,
  beaconInfo: DrandBeaconInfo,
): Promise<boolean> {
  const proof = block.proof;

  // Verify randomness proof.
  const randProofValid = await verifyBlockRandomnessProof(
    proof.txnBundleHash,
    proof.txnBundleProposer,
    proof.randomnessProof,
    beaconInfo,
    block.time,
  );
  if (!randProofValid) {
    return false;
  }

  // If block doesn't contain any CreateDatachain or UpdateDatachain
  // transactions, any further checks are not needed.
  let skipDAResultVerification = true;
  for (const txn of block.transactions) {
    if (txn.txn.createChain || txn.txn.updateChain) {
      skipDAResultVerification = false;
    }
  }
  if (skipDAResultVerification) {
    return true;
  }

  // Check that proof carries responses from all verifiers of DA committee sample.
  const randSeed = getSeedFromBlockRandomnessProof(proof.randomnessProof);
  const daCommittee = await getVerificationCommitteeSample(
    blockchain,
    StakeType.DAVerifier,
    daCommitteeSampleSzie,
    randSeed,
  );
  for (const staker of daCommittee) {
    if (!proof.DACheckResults.find((daResult) => bytesEqual(daResult.signer, staker.address))) {
      return false;
    }
  }

  // Verify aggregated signature of responses from DA verifiers.
  const [aggDACheckResultSigValid, aggDACheckResultSig] = await verifyDACheckResultsAggergatedSignature(
    proof.txnBundleHash,
    proof.randomnessProof,
    proof.DACheckResults[0].claims, // For now we expect full consensus among DA verifiers.
    proof.DACheckResults,
    proof.DACheckResults.map((result) => result.signer),
  );
  if (!aggDACheckResultSigValid) {
    return false;
  }
  if (!Buffer.from(aggDACheckResultSig).equals(proof.aggDACheckResultSignature)) {
    return false;
  }

  // Check that proof carries responses from all verifiers of State committee sample.
  const stateCommittee = await getVerificationCommitteeSample(
    blockchain,
    StakeType.StateVerifier,
    stateCommitteeSampleSzie,
    randSeed,
  );
  for (const staker of stateCommittee) {
    if (!proof.stateCheckResults.find((stateResult) => bytesEqual(stateResult.signer, staker.address))) {
      return false;
    }
  }

  // Verify aggregated signature of responses from state verifiers.
  const [aggStateCheckResultSigValid, aggStateCheckResultSig] = await verifyStateCheckResultsAggergatedSignature(
    proof.txnBundleHash,
    proof.randomnessProof,
    proof.stateCheckResults[0].claims, // For now we expect full consensus among state verifiers.
    proof.stateCheckResults,
    proof.stateCheckResults.map((result) => result.signer),
  );
  if (!aggStateCheckResultSigValid) {
    return false;
  }
  if (!Buffer.from(aggStateCheckResultSig).equals(proof.aggStateCheckResultSignature)) {
    return false;
  }

  return true;
}

export async function signDACheckResult(result: DACheckResult, signerSecKey: Uint8Array): Promise<DACheckResult> {
  const hash = createDACheckResultHashForSigning(result.txnBundleHash, result.randomnessProof, result.claims);
  const signedResult: DACheckResult = {
    ...result,
    signature: await BLS.sign(hash, signerSecKey),
  };
  return signedResult;
}

export async function verifyDACheckResultSignature(
  txnBundleHash: Uint8Array,
  randomnessProof: Uint8Array,
  claimResults: ClaimDACheckResult[],
  signature: Uint8Array,
  signer: Uint8Array,
): Promise<boolean> {
  const hash = createDACheckResultHashForSigning(txnBundleHash, randomnessProof, claimResults);
  return await BLS.verify(signature, hash, signer);
}

export async function verifyDACheckResultsAggergatedSignature(
  txnBundleHash: Uint8Array,
  randomnessProof: Uint8Array,
  claimResults: ClaimDACheckResult[],
  results: DACheckResult[],
  signers: Uint8Array[],
): Promise<[boolean, Uint8Array]> {
  const aggPub = Buffer.from(BLS.aggregatePublicKeys(signers));
  const aggSig = BLS.aggregateSignatures(results.map((result) => result.signature));
  const aggSigValid = await verifyDACheckResultSignature(txnBundleHash, randomnessProof, claimResults, aggSig, aggPub);
  return [aggSigValid, aggSig];
}

function createStateCheckResultHashForSigning(
  txnBundleHash: Uint8Array,
  randomnessProof: Uint8Array,
  claimResults: ClaimStateCheckResult[],
): Uint8Array {
  const rawClaimResults = claimResults.map(serializeClaimStateCheckResult);
  const sigMaterial = encodeCBOR([txnBundleHash, randomnessProof, rawClaimResults]);
  return crypto.createHash("sha256").update(sigMaterial).digest();
}

export async function signStateCheckResult(
  result: StateCheckResult,
  signerSecKey: Uint8Array,
): Promise<StateCheckResult> {
  const hash = createStateCheckResultHashForSigning(result.txnBundleHash, result.randomnessProof, result.claims);
  const signedResult: StateCheckResult = {
    ...result,
    signature: await BLS.sign(hash, signerSecKey),
  };
  return signedResult;
}

export async function verifyStateCheckResultSignature(
  txnBundleHash: Uint8Array,
  randomnessProof: Uint8Array,
  claimResults: ClaimStateCheckResult[],
  signature: Uint8Array,
  signer: Uint8Array,
): Promise<boolean> {
  const hash = createStateCheckResultHashForSigning(txnBundleHash, randomnessProof, claimResults);
  return await BLS.verify(signature, hash, signer);
}

export async function verifyStateCheckResultsAggergatedSignature(
  txnBundleHash: Uint8Array,
  randomnessProof: Uint8Array,
  claimResults: ClaimStateCheckResult[],
  results: StateCheckResult[],
  signers: Uint8Array[],
): Promise<[boolean, Uint8Array]> {
  const aggPub = Buffer.from(BLS.aggregatePublicKeys(signers));
  const aggSig = BLS.aggregateSignatures(results.map((result) => result.signature));
  const aggSigValid = await verifyStateCheckResultSignature(
    txnBundleHash,
    randomnessProof,
    claimResults,
    aggSig,
    aggPub,
  );
  return [aggSigValid, aggSig];
}

function createDACheckResultHashForSigning(
  txnBundleHash: Uint8Array,
  randomnessProof: Uint8Array,
  claimResults: ClaimDACheckResult[],
): Uint8Array {
  const rawClaimResults = claimResults.map(serializeClaimDACheckResult);
  const sigMaterial = encodeCBOR([txnBundleHash, randomnessProof, rawClaimResults]);
  return crypto.createHash("sha256").update(sigMaterial).digest();
}
