#!/usr/bin/env node
import { runVeloDomCli } from "../lib/cli.js";

const args = process.argv.slice(2);

if (args.length === 0) {
  process.stderr.write("Usage: npx velodom@latest <project-name>\n");
  process.exitCode = 1;
} else if (args[0] === "--help" || args[0] === "-h") {
  process.exitCode = await runVeloDomCli(["help"]);
} else {
  process.exitCode = await runVeloDomCli(["init", ...args]);
}
