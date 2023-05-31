import process from "process";
import { readFileSync } from "fs";

import yargs from "yargs";
import { load } from "js-yaml";

import Logger from "../../log/logger";
import { CoordinatorNodeConfig, CoordinatorNode } from "./node";

(async () => {
  const config = loadNodeConfig();
  const log = new Logger("tosi-coordinator", "debug");
  const node = new CoordinatorNode(config, log);
  await node.start();
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.log(err);
});

interface CLIArgs {
  [x: string]: unknown;
  configFile: string;
}

function loadNodeConfig(): CoordinatorNodeConfig {
  const cli: CLIArgs = yargs(process.argv.slice(2))
    .options({
      configFile: { type: "string", default: "./config.yml" },
    })
    .parseSync();

  const config = readFileSync(cli.configFile, "utf8");

  return load(config) as CoordinatorNodeConfig;
}
