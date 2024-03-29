import fetch from "isomorphic-fetch";
import { bls12_381 as BLS } from "@noble/curves/bls12-381";
import crypto from "crypto";

import { encodeCBOR, decodeCBOR } from "../util";

import { DRAND_BEACON_LIFE_TIME } from "./constant";
import { DrandBeacon, DrandBeaconInfo } from "./types";

export async function fetchDrandBeacon(): Promise<DrandBeacon> {
  const beaconUrl = "https://drand.cloudflare.com/public/latest";
  const beacon = await (await fetch(beaconUrl)).json();
  return {
    round: beacon.round,
    randomness: beacon.randomness,
    signature: beacon.signature,
    prevSignature: beacon.previous_signature,
  };
}

export async function fetchDrandBeaconInfo(): Promise<DrandBeaconInfo> {
  const beaconInfoURL = "https://drand.cloudflare.com/info";
  const beaconInfo = await (await fetch(beaconInfoURL)).json();
  return {
    publicKey: beaconInfo.public_key,
    period: beaconInfo.period,
    genesisTime: beaconInfo.genesis_time,
    hash: beaconInfo.hash,
  };
}

export async function createBlockRandomnessProof(
  txnBundleHash: Uint8Array,
  bundleProposerSecKey: Uint8Array,
  beacon: DrandBeacon,
): Promise<Uint8Array> {
  const beaconSigAndClaim = crypto
    .createHash("sha256")
    .update(Buffer.from(beacon.signature, "hex"))
    .update(txnBundleHash)
    .digest();
  const blsSig = await BLS.sign(beaconSigAndClaim, bundleProposerSecKey);
  const proof = [
    beacon.round,
    Buffer.from(beacon.prevSignature, "hex"),
    Buffer.from(beacon.signature, "hex"),
    blsSig,
    BLS.getPublicKey(bundleProposerSecKey),
  ];
  return encodeCBOR(proof);
}

export function getSeedFromBlockRandomnessProof(proof: Uint8Array): string {
  const [beaconRound, beaconPrevSig, beaconSig, blsSig, bundleProposerPubKey] = decodeCBOR(proof);
  const hash = crypto.createHash("sha256").update(blsSig).digest().toString("hex");
  return hash;
}

export async function verifyBlockRandomnessProof(
  txnBundleHash: Uint8Array,
  bundleProposerPubKey: Uint8Array,
  proof: Uint8Array,
  beaconInfo: DrandBeaconInfo,
  currentTime: number,
): Promise<boolean> {
  // Proof is CBOR-encoded array.
  const [beaconRound, beaconPrevSig, beaconSig, blsSig, proposerPubKeyFromProof] = decodeCBOR(proof);

  // Check that public key of txn bundle proposer in proof matches.
  if (!Buffer.from(proposerPubKeyFromProof).equals(Buffer.from(bundleProposerPubKey))) {
    throw new Error("Txn bundle proposer public key does not match that of proof");
  }

  // Verify drand beacon and its time (issues less then 10 minutes ago)
  const validBeacon = await verifyDrandBeacon(beaconRound, beaconPrevSig, beaconSig, beaconInfo);
  if (!validBeacon) {
    throw new Error("Beacon is invalid");
  }
  const beaconTime = beaconInfo.genesisTime + beaconRound * beaconInfo.period;
  if (currentTime - beaconTime > DRAND_BEACON_LIFE_TIME) {
    throw new Error("Beacon time is invalid");
  }

  // Verify claimer's BLS signature over beacon and claim.
  const beaconSigAndClaim = crypto.createHash("sha256").update(beaconSig).update(txnBundleHash).digest();
  const verificationResult = await BLS.verify(blsSig, beaconSigAndClaim, bundleProposerPubKey);

  return verificationResult;
}

async function verifyDrandBeacon(round: number, prevSig: string, sig: string, info: DrandBeaconInfo): Promise<boolean> {
  const roundData = Buffer.alloc(8);
  roundData.writeBigUInt64BE(BigInt(round));
  const prevSigAndRound = crypto.createHash("sha256").update(Buffer.from(prevSig, "hex")).update(roundData).digest();
  // XXX We should ideally hardcode the drand public key.
  return await BLS.verify(sig, prevSigAndRound, info.publicKey);
}
