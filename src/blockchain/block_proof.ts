import crypto from "crypto";
import * as BLS from "@noble/bls12-381";

import { encodeCBOR } from "../util";

import { Block, DACheckResult, ClaimDACheckResult, StakeType } from "./types";
import { serializeClaimDACheckResult } from "./serde";
import { BlockchainStorage } from "./storage";
import { fetchDrandBeaconInfo, getSeedFromBlockRandomnessProof, verifyBlockRandomnessProof } from "./block_randomness";
import { getVerificationCommitteeSample } from "./block_commitee";

export async function verifyBlockProof(
  block: Block,
  blockchain: BlockchainStorage,
  daCommitteeSampleSzie: number,
): Promise<boolean> {
  const proof = block.proof;

  // Verify randomness proof.
  const beaconInfo = await fetchDrandBeaconInfo();
  const randProofValid = await verifyBlockRandomnessProof(
    Uint8Array.from(Buffer.from(proof.txnBundleHash, "hex")),
    Uint8Array.from(Buffer.from(proof.txnBundleProposer, "hex")),
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
    if (!proof.DACheckResults.find((daResult) => daResult.signer == staker.address)) {
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

  return true;
}

export async function signDACheckResult(result: DACheckResult, signerSecKey: string): Promise<DACheckResult> {
  const hash = createDACheckResultHashForSigning(result.txnBundleHash, result.randomnessProof, result.claims);
  const signedResult: DACheckResult = {
    ...result,
    signature: await BLS.sign(hash, signerSecKey),
  };
  return signedResult;
}

export async function verifyDACheckResultSignature(
  txnBundleHash: string,
  randomnessProof: Uint8Array,
  claimResults: ClaimDACheckResult[],
  signature: Uint8Array,
  signer: string,
): Promise<boolean> {
  const hash = createDACheckResultHashForSigning(txnBundleHash, randomnessProof, claimResults);
  return await BLS.verify(signature, hash, signer);
}

export async function verifyDACheckResultsAggergatedSignature(
  txnBundleHash: string,
  randomnessProof: Uint8Array,
  claimResults: ClaimDACheckResult[],
  results: DACheckResult[],
  signers: string[],
): Promise<[boolean, Uint8Array]> {
  const aggPub = Buffer.from(BLS.aggregatePublicKeys(signers)).toString("hex");
  const aggSig = BLS.aggregateSignatures(results.map((result) => result.signature));
  const aggSigValid = await verifyDACheckResultSignature(txnBundleHash, randomnessProof, claimResults, aggSig, aggPub);
  return [aggSigValid, aggSig];
}

function createDACheckResultHashForSigning(
  txnBundleHash: string,
  randomnessProof: Uint8Array,
  claimResults: ClaimDACheckResult[],
): string {
  const rawClaimResults = claimResults.map(serializeClaimDACheckResult);
  const sigMaterial = encodeCBOR([txnBundleHash, randomnessProof, rawClaimResults]);
  const hash = crypto.createHash("sha256").update(sigMaterial).digest();
  return hash.toString("hex");
}
