#!/usr/bin/env node
import { runVeloDomCli } from "../lib/cli.js";

process.exitCode = await runVeloDomCli([
  "create",
  "project",
  ...process.argv.slice(2)
]);
