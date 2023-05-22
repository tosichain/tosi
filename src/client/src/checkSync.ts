import { ClientRPC } from "./rpc";
import process from "process";

async function init() {
  const client = new ClientRPC({
    serverAddr: "127.0.0.1:" + process.env.API_PORT,
  });
  console.log(await client.getSyncStatus());
}

init().catch((err) => {
  console.log(err);
});
