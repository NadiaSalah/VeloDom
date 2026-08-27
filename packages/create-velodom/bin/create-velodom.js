#!/usr/bin/env node

import { runVeloDomCli } from "velodom/cli";

const args = process.argv.slice(2);
const direct = args[0] === "--help"
  || args[0] === "-h"
  || args[0] === "--version"
  || args[0] === "-v";

process.exitCode = await runVeloDomCli(
  direct ? args : ["create", "project", ...args]
);
