import Sampler from "weighted-reservoir-sampler";
import Gen from "random-seed";

import { Staker } from "./types";
import { BlockchainStorage } from "./storage";

import { STAKE_AMOUNT_TO_NUMBER_DENOMINATOR } from "./constant";

export async function getDACommiteeSample(
  blockchain: BlockchainStorage,
  sampleSize: number,
  randomness: string,
  txnBundleProposer: string,
): Promise<Staker[]> {
  // TODO: getStakerList must return Staker[]
  const stakerPubKeys = await blockchain.getStakersList();
  const stakers: Staker[] = [];
  for (const pubKey of stakerPubKeys) {
    const account = await blockchain.getAccount(pubKey);
    if (account == undefined) {
      throw new Error("failed to find staker account");
    }
    const staker: Staker = {
      pubKey: pubKey,
      stake: account.stake,
      isDAVerifier: true,
      isStateVerifier: false,
    };
    stakers.push(staker);
  }

  // TODO: probably, should throw an exception instead.
  if (stakers.length < sampleSize) {
    return stakers;
  }

  const commiteeSample = weightedRandomStakerSample(
    stakers.filter((s) => s.pubKey != txnBundleProposer),
    sampleSize,
    randomness,
  );

  return commiteeSample;
}

function weightedRandomStakerSample(stakers: Staker[], sampleSize: number, randSeed: string): Staker[] {
  const totalStake = stakers.reduce((acc, staker) => acc + BigInt(staker.stake), BigInt(0));
  const randGen = Gen(randSeed);
  const sampler = new Sampler({
    sampleSize: sampleSize,
    weightFunction: function (staker: Staker) {
      // XXX this is a compromise because WRS cannot handle stakes in bigint
      const scaleTotalStake = Number(totalStake / STAKE_AMOUNT_TO_NUMBER_DENOMINATOR);
      const scaleStake = Number(BigInt(staker.stake) / STAKE_AMOUNT_TO_NUMBER_DENOMINATOR);
      return scaleStake / scaleTotalStake;
    },
    random: function () {
      return randGen.random();
    },
  });
  for (let i = 0; i < stakers.length; i++) {
    sampler.push(stakers[i]);
  }
  const sample: Staker[] = sampler.end();
  return sample;
}
