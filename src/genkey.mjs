/* eslint-disable no-console */
import * as BLS from "@noble/bls12-381";

async function init() {
  const privateKey = BLS.utils.randomPrivateKey();

  console.log("BLS_SECRET_KEY=" + Buffer.from(privateKey).toString("hex"));

  const publicKey = BLS.getPublicKey(privateKey);
  let publicKeySerialized = Buffer.from(publicKey).toString("hex");

  console.log("BLS_PUBLIC_KEY=" + publicKeySerialized);
}

init();
