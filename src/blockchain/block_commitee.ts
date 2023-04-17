import Sampler from "weighted-reservoir-sampler";
import Gen from "random-seed";

import { Account, StakeType } from "./types";
import { BlockchainStorage } from "./storage";

import { STAKE_AMOUNT_TO_NUMBER_DENOMINATOR } from "./constant";

export async function getVerificationCommitteeSample(
  blockchain: BlockchainStorage,
  committeeType: StakeType,
  sampleSize: number,
  randomness: string,
): Promise<Account[]> {
  const stakePool = await blockchain.getStakePool();

  let stakerAddresses: Uint8Array[] = [];
  switch (committeeType) {
    case StakeType.DAVerifier:
      stakerAddresses = stakePool.daVerifiers;
      break;
    case StakeType.StateVerifier:
      stakerAddresses = stakePool.stateVerifiers;
      break;
    default:
      throw new Error("invalid stake type");
  }

  const stakers: Account[] = [];
  for (const pubKey of stakerAddresses) {
    const account = await blockchain.getAccount(pubKey);
    if (account == undefined) {
      throw new Error("failed to find staker account");
    }
    stakers.push(account);
  }

  // TODO: probably, should throw an exception instead.
  if (stakers.length < sampleSize) {
    return stakers;
  }

  let totalStake = BigInt(0);
  switch (committeeType) {
    case StakeType.DAVerifier:
      totalStake = stakers.reduce((acc, staker) => acc + BigInt(staker.daVerifierStake), BigInt(0));
      break;
    case StakeType.StateVerifier:
      totalStake = stakers.reduce((acc, staker) => acc + BigInt(staker.stateVerifierStake), BigInt(0));
      break;
    default:
      throw new Error("invalid stake type");
  }

  const randGen = Gen(randomness);
  const sampler = new Sampler({
    sampleSize: sampleSize,
    weightFunction: function (staker: Account) {
      // XXX this is a compromise because WRS cannot handle stakes in bigint
      const scaleTotalStake = Number(totalStake / STAKE_AMOUNT_TO_NUMBER_DENOMINATOR);
      const stake = committeeType == StakeType.DAVerifier ? staker.daVerifierStake : staker.stateVerifierStake;
      const scaleStake = Number(BigInt(stake) / STAKE_AMOUNT_TO_NUMBER_DENOMINATOR);
      return scaleStake / scaleTotalStake;
    },
    random: function () {
      return randGen.random();
    },
  });
  for (let i = 0; i < stakers.length; i++) {
    sampler.push(stakers[i]);
  }

  const sample: Account[] = sampler.end();
  return sample;
}
