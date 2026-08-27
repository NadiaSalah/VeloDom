#!/usr/bin/env node
import { runVeloDomCli } from "../lib/cli.js";

const args = process.argv.slice(2);

if (args[0] === "--version" || args[0] === "-v") {
  process.exitCode = await runVeloDomCli(["--version"]);
} else if (args[0] === "--help" || args[0] === "-h") {
  process.exitCode = await runVeloDomCli(["help"]);
} else {
  process.exitCode = await runVeloDomCli(["init", ...args]);
}
