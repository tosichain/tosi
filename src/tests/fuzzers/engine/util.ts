import { StakeType } from "../../../blockchain/types";

//stackoverflow.com/questions/64662153/function-to-pick-n-random-items-from-array-in-typescript
export function pickRandomItems<T extends unknown>(arr: T[], n: number): T[] {
  const shuffled = Array.from(arr).sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

export function randomAbsAmount(min: bigint, max: bigint): bigint {
  return BigInt(Number(min) + Math.random() * Number(max - min));
}

export function randomRatioAmount(amount: bigint, minRatio: number, maxRatio: number): bigint {
  const min = Number(amount) * minRatio;
  const max = Number(amount) * maxRatio;
  return randomAbsAmount(BigInt(min), BigInt(max));
}

export function randomStakeType(): StakeType {
  return pickRandomItems([StakeType.DAVerifier, StakeType.StateVerifier], 1)[0];
}
